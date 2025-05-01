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

let selectedUser = sessionStorage.getItem("chat_selected_user") || null;
let typingTimeout;
const onlineUsers = new Set();
const unreadMessages = {};
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
    const online = onlineUsers.has(selectedUser);
    const nameEl = chatHeader.querySelector("strong")?.textContent || "";
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

    searchInput.addEventListener("input", (e) => {
      const keyword = e.target.value.toLowerCase();
      document.querySelectorAll(".user-item").forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(keyword) ? "" : "none";
      });
    });

    // ✅ Restore previously selected user after list loads
    if (selectedUser) {
      const tryRestore = setInterval(() => {
        const selectedDiv = document.querySelector(`.user-item[data-email="${selectedUser}"]`);
        if (selectedDiv) {
          selectedDiv.click();
          clearInterval(tryRestore);
        }
      }, 100);
      setTimeout(() => clearInterval(tryRestore), 2000); // stop after 2s
    }

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
      unreadMessages[selectedUser] = 0;
      messagesDiv.innerHTML = "";
      highlightSelected(div);
      loadOldMessages();
      refreshUserList();
    };
    userList.appendChild(div);
  });
}

function highlightSelected(el) {
  document.querySelectorAll(".user-item").forEach(i => i.classList.remove("selected-user"));
  el.classList.add("selected-user");
}

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

function appendDateDivider(label) {
  const div = document.createElement("div");
  div.textContent = label;
  div.style = "text-align:center;color:#777;font-size:0.8rem;margin:10px 0;";
  messagesDiv.appendChild(div);
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString();
}

async function loadOldMessages() {
  if (!selectedUser) return;
  try {
    const res = await fetch(`http://localhost:5000/api/chat/conversations/${currentUser}/${selectedUser}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const messages = await res.json();
    if (!res.ok) throw new Error(messages.message);

    messagesDiv.innerHTML = "";
    let lastDate = null;

    messages.forEach(msg => {
      const msgDate = new Date(msg.createdAt || msg.timestamp);
      const label = formatDateLabel(msgDate);
      if (label !== lastDate) {
        appendDateDivider(label);
        lastDate = label;
      }
      appendMessage(msg);
    });
    scrollToBottom();
  } catch (err) {
    messagesDiv.innerHTML = `<p style="padding:1rem;">❌ Failed to load chat</p>`;
  }
}

function appendMessage(msg) {
  const div = document.createElement("div");
  div.className = "message " + (msg.senderId === currentUser ? "sent" : "received");
  div.textContent = msg.content;
  messagesDiv.appendChild(div);
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
  const content = messageInput.value.trim();
  if (!selectedUser) return alert("❗ Please select a user first.");
  if (!content) return;

  socket.emit("sendMessage", {
    senderId: currentUser,
    receiverId: selectedUser,
    content,
    createdAt: new Date()
  });

  try {
    await fetch("http://localhost:5000/api/chat/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ sender: currentUser, receiver: selectedUser, content })
    });
  } catch (err) {
    console.error("❌ Failed to store message:", err.message);
  }

  messageInput.value = "";
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

function refreshUserList() {
  document.querySelectorAll(".user-item").forEach(async item => {
    const email = item.dataset.email;
    const name = item.querySelector("strong")?.innerText || "";
    const lastMsg = await fetchLastMessage(currentUser, email);
    const status = onlineUsers.has(email) ? "Online" : "Offline";
    item.innerHTML = `
      <strong>${name}</strong><br>
      <small class="status" style="color:${status === "Online" ? "green" : "gray"};">${status}</small><br>
      <small style="color:#555;">${lastMsg || "No messages yet"}</small>
    `;
  });
}

window.sendMessage = sendMessage;
loadUsers();
