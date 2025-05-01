const socket = io("http://localhost:5000");

const currentUserId = localStorage.getItem("userId");
const token = localStorage.getItem("token");

if (!token || !currentUserId) {
  alert("Session expired. Please log in again.");
  window.location.href = "login.html";
}

let receiverId = sessionStorage.getItem("chat_selected_user") || null;
let receiverName = null;
let typingTimeout = null;

const usersList = document.getElementById("userList");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const notificationSound = new Audio("https://www.soundjay.com/button/beep-07.wav");

async function fetchTutors() {
  try {
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await res.json();

    usersList.innerHTML = "<div class='sidebar-header'>Tutors</div>";

    users
      .filter(user => user.role === "tutor")
      .forEach(user => {
        const userDiv = document.createElement("div");
        userDiv.className = "user-item";
        userDiv.dataset.id = user._id;
        userDiv.innerHTML = `
          <strong>${user.name}</strong><br>
          <small style="color:#555;">Click to chat</small>
        `;
        userDiv.onclick = () => {
          sessionStorage.setItem("chat_selected_user", user._id);
          startChat(user._id, user.name);
          document.querySelectorAll(".user-item").forEach(item => item.classList.remove("selected-user"));
          userDiv.classList.add("selected-user");
        };
        usersList.appendChild(userDiv);

        // Auto-select previously selected chat
        if (user._id === receiverId) {
          startChat(user._id, user.name);
          userDiv.classList.add("selected-user");
        }
      });
  } catch (err) {
    usersList.innerHTML = `<p style="padding:1rem;">❌ Failed to load tutors</p>`;
    console.error(err);
  }
}

function startChat(id, name) {
  receiverId = id;
  receiverName = name;
  chatHeader.textContent = `${name}`;
  loadMessages();
}

async function loadMessages() {
  if (!receiverId) return;
  try {
    const res = await fetch(`/api/messages/${currentUserId}/${receiverId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const messages = await res.json();
    chatMessages.innerHTML = "";
    messages.forEach(m => addMessage(m, m.senderId === currentUserId));
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (err) {
    chatMessages.innerHTML = `<p style="padding:1rem;">❌ Failed to load messages</p>`;
    console.error(err);
  }
}

function addMessage(msg, isSender) {
  const div = document.createElement("div");
  div.className = `message ${isSender ? "sent" : "received"}`;
  div.innerHTML = `<div class="message-content">${msg.content}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn.onclick = () => {
  const content = messageInput.value.trim();
  if (!content || !receiverId) return;
  socket.emit("sendMessage", { senderId: currentUserId, receiverId, content });
  messageInput.value = "";
};

socket.on("receiveMessage", (msg) => {
  if (msg.senderId === receiverId || msg.receiverId === receiverId) {
    addMessage(msg, msg.senderId === currentUserId);
    notificationSound.play();
  }
});

messageInput.addEventListener("input", () => {
  if (receiverId) {
    socket.emit("typing", { senderId: currentUserId, receiverId });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping", { senderId: currentUserId, receiverId });
    }, 1000);
  }
});

socket.on("showTyping", ({ senderId }) => {
  if (senderId === receiverId) {
    chatHeader.textContent = `${receiverName} is typing...`;
  }
});

socket.on("hideTyping", ({ senderId }) => {
  if (senderId === receiverId) {
    chatHeader.textContent = `Chatting with ${receiverName}`;
  }
});

fetchTutors();
