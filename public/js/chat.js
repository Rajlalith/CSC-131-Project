const currentUser = localStorage.getItem("userEmail");
const token = localStorage.getItem("token");

const socket = io("http://localhost:5000", {
  query: { email: currentUser }
});

const userList = document.getElementById("userList");
const searchInput = document.getElementById("searchInput");
const chatHeader = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const imageInput = document.getElementById("imageInput");
const fileInput = document.getElementById("fileInput");
const emojiPicker = document.getElementById("emojiPicker");
const filePreview = document.getElementById("filePreview");
const previewText = document.getElementById("previewText");

let selectedUser = sessionStorage.getItem("chat_selected_user") || null;
let pendingUpload = null;
let pendingUploadType = null;
const onlineUsers = new Set();
const notificationSound = new Audio("https://www.soundjay.com/button/beep-07.wav");

if (!token || !currentUser) {
  alert("❌ Session expired. Please log in again.");
  const redirect = window.location.pathname.includes("tutor") ? "login-tutor.html" : "login.html";
  window.location.href = redirect;
}

socket.on("updateOnlineUsers", (users) => {
  onlineUsers.clear();
  users.forEach((u) => onlineUsers.add(u));
  updateUserStatuses();
});

function updateUserStatuses() {
  document.querySelectorAll(".user-item").forEach((item) => {
    const email = item.dataset.email;
    const statusEl = item.querySelector(".status");
    const isOnline = onlineUsers.has(email);
    statusEl.textContent = isOnline ? "Online" : "Offline";
    statusEl.style.color = isOnline ? "green" : "gray";
  });

  if (selectedUser) {
    const nameEl = chatHeader.querySelector("strong")?.textContent || "";
    const online = onlineUsers.has(selectedUser);
    chatHeader.innerHTML = `<strong>${nameEl}</strong> <span style="color:${online ? "green" : "gray"};font-size:0.85rem;">${online ? "Online" : "Offline"}</span>`;
  }
}

async function loadUsers() {
  const isStudent = window.location.pathname.includes("chat-student.html");
  const apiUrl = isStudent
    ? "http://localhost:5000/api/users/tutors"
    : "http://localhost:5000/api/users";

  try {
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await res.json();
    if (!res.ok) throw new Error(users.message);
    const filtered = isStudent ? users : users.filter(u => u.role === "student");
    displayUserList(filtered);
  } catch (err) {
    userList.innerHTML = `<p style="padding:1rem;">❌ ${err.message}</p>`;
  }
}

function displayUserList(users) {
  userList.innerHTML = "";
  users.forEach(async (user) => {
    const lastMsg = await fetchLastMessage(currentUser, user.email);
    const div = document.createElement("div");
    div.className = "user-item";
    div.dataset.email = user.email;
    div.innerHTML = `
      <strong>${user.name}</strong><br>
      <small class="status">${onlineUsers.has(user.email) ? "Online" : "Offline"}</small><br>
      <small style="color:#555;">${lastMsg || "No messages yet"}</small>
    `;
    div.onclick = () => {
      selectedUser = user.email;
      sessionStorage.setItem("chat_selected_user", selectedUser);
      const online = onlineUsers.has(user.email);
      chatHeader.innerHTML = `<strong>${user.name}</strong> <span style="color:${online ? "green" : "gray"};font-size:0.85rem;">${online ? "Online" : "Offline"}</span>`;
      messagesDiv.innerHTML = "";
      loadOldMessages();
    };
    userList.appendChild(div);
  });
}

searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();
  document.querySelectorAll(".user-item").forEach(item => {
    const name = item.querySelector("strong")?.textContent.toLowerCase() || "";
    item.style.display = name.includes(term) ? "block" : "none";
  });
});

async function fetchLastMessage(user1, user2) {
  try {
    const res = await fetch(`http://localhost:5000/api/chat/last?user1=${user1}&user2=${user2}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data?.content || null;
  } catch {
    return null;
  }
}

async function loadOldMessages() {
  if (!selectedUser) return;
  try {
    const res = await fetch(`http://localhost:5000/api/chat/conversations/${currentUser}/${selectedUser}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const messages = await res.json();
    messagesDiv.innerHTML = "";
    messages.forEach(msg => appendMessage(msg));
    scrollToBottom();
  } catch (err) {
    messagesDiv.innerHTML = `<p style="padding:1rem;">❌ Failed to load chat</p>`;
  }
}

function appendMessage(msg) {
  const div = document.createElement("div");
  div.className = "message " + (msg.senderId === currentUser ? "sent" : "received");
  div.dataset.id = msg._id || "";

  if (msg.type === "image") {
    const img = document.createElement("img");
    img.src = msg.content;
    img.alt = "media";
    div.appendChild(img);
  } else if (msg.type === "file") {
    const link = document.createElement("a");
    link.href = msg.content;
    link.textContent = "📎 Download File";
    link.target = "_blank";
    link.style = "color:blue;text-decoration:underline;";
    div.appendChild(link);
  } else {
    const span = document.createElement("span");
    span.textContent = msg.content;
    div.appendChild(span);
  }

  if (msg.senderId === currentUser) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.onclick = () => editMessage(msg);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = () => deleteMessage(msg);

    div.appendChild(editBtn);
    div.appendChild(deleteBtn);
  }

  messagesDiv.appendChild(div);
}

async function sendMessage() {
  const content = messageInput.value.trim();

  if (pendingUpload && pendingUploadType && selectedUser) {
    const msgObj = {
      senderId: currentUser,
      receiverId: selectedUser,
      content: pendingUpload,
      type: pendingUploadType,
      createdAt: new Date()
    };

    socket.emit("sendMessage", msgObj);

    await fetch("http://localhost:5000/api/chat/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(msgObj)
    });

    clearPreview();
    pendingUpload = null;
    pendingUploadType = null;
    emojiPicker.style.display = "none";
    messageInput.value = "";
    scrollToBottom();
    return;
  }

  if (!selectedUser || !content) return;

  const msgObj = {
    senderId: currentUser,
    receiverId: selectedUser,
    content,
    type: "text",
    createdAt: new Date()
  };

  socket.emit("sendMessage", msgObj);

  await fetch("http://localhost:5000/api/chat/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(msgObj)
  });

  messageInput.value = "";
  clearPreview();
  emojiPicker.style.display = "none";
  scrollToBottom();
}

function uploadFile() {
  fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file || !selectedUser) return;

    showPreview(`📎 ${file.name}`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/api/chat/upload", {
        method: "POST",
        body: formData,
        headers: {
          "upload-type": "file"
        }
      });

      const data = await res.json();
      pendingUpload = data.imageUrl;
      pendingUploadType = "file";
    } catch (err) {
      console.error("❌ File upload failed:", err.message);
      alert("❌ File upload failed");
      clearPreview();
    }
  };
}

imageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !selectedUser) return;
  showPreview(`📷 ${file.name}`);

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("http://localhost:5000/api/chat/upload", {
      method: "POST",
      body: formData,
      headers: {
        "upload-type": "image"
      }
    });
    const data = await res.json();
    pendingUpload = data.imageUrl;
    pendingUploadType = "image";
  } catch (err) {
    console.error("❌ Image upload failed:", err.message);
  }
}); 

function toggleEmojiPicker() {
  emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
}

emojiPicker?.addEventListener("emoji-click", (event) => {
  const editingId = emojiPicker.getAttribute("data-editing");
  if (editingId) {
    const editInput = document.querySelector(`[data-id="${editingId}"] .edit-box input`);
    if (editInput) editInput.value += event.detail.unicode;
  } else {
    messageInput.value += event.detail.unicode;
  }
});

document.addEventListener("click", (e) => {
  const isEmojiButton = e.target.closest("button")?.textContent === "😄";
  const isInsidePicker = emojiPicker.contains(e.target);
  if (!isInsidePicker && !isEmojiButton) {
    emojiPicker.style.display = "none";
    emojiPicker.removeAttribute("data-editing");
  }
});

if (!document.getElementById("emojiDoneBtn")) {
  const doneBtn = document.createElement("button");
  doneBtn.id = "emojiDoneBtn";
  doneBtn.textContent = "Done";
  doneBtn.style.margin = "10px";
  doneBtn.style.padding = "5px 12px";
  doneBtn.style.backgroundColor = "#f57c00";
  doneBtn.style.color = "white";
  doneBtn.style.border = "none";
  doneBtn.style.borderRadius = "5px";
  doneBtn.style.cursor = "pointer";
  doneBtn.onclick = () => {
    emojiPicker.style.display = "none";
    emojiPicker.removeAttribute("data-editing");
  };
  emojiPicker.appendChild(doneBtn);
}

function showPreview(text) {
  previewText.textContent = text;
  filePreview.style.display = "flex";
}

function clearPreview() {
  previewText.textContent = "";
  filePreview.style.display = "none";
  imageInput.value = "";
  fileInput.value = "";
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

socket.on("receiveMessage", (msg) => {
  if (msg.senderId === selectedUser || msg.receiverId === selectedUser) {
    appendMessage(msg);
    scrollToBottom();
  }
  notificationSound.play();
});

async function editMessage(msg) {
  if (document.querySelector(".edit-box")) return;
  const messageDiv = document.querySelector(`[data-id="${msg._id}"]`);
  const originalContent = msg.content;

  const editContainer = document.createElement("div");
  editContainer.className = "edit-box";
  editContainer.style.marginTop = "8px";

  const input = document.createElement("input");
  input.type = "text";
  input.value = originalContent;
  input.style.width = "70%";
  input.style.padding = "4px 6px";
  input.style.marginRight = "6px";

  const emojiBtn = document.createElement("button");
  emojiBtn.textContent = "😄";
  emojiBtn.onclick = () => {
    emojiPicker.style.display = "block";
    emojiPicker.setAttribute("data-editing", msg._id);
  };

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.onclick = async () => {
    const newContent = input.value.trim();
    if (!newContent || newContent === originalContent) {
      editContainer.remove();
      return;
    }

    try {
      await fetch(`http://localhost:5000/api/chat/edit/${msg._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent })
      });
      editContainer.remove();
      loadOldMessages();
    } catch (err) {
      alert("❌ Failed to edit message");
    }
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = () => editContainer.remove();

  editContainer.appendChild(input);
  editContainer.appendChild(emojiBtn);
  editContainer.appendChild(saveBtn);
  editContainer.appendChild(cancelBtn);
  messageDiv.appendChild(editContainer);
}

async function deleteMessage(msg) {
  if (!confirm("Unsend this message?")) return;

  try {
    await fetch(`http://localhost:5000/api/chat/delete/${msg._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    loadOldMessages();
  } catch (err) {
    alert("❌ Failed to delete message");
  }
}

window.sendMessage = sendMessage;
loadUsers();
