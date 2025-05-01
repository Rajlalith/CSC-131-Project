const socket = io("http://localhost:5000");

const usersList = document.getElementById("usersList");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const currentUser = localStorage.getItem("userEmail");
const token = localStorage.getItem("token");
let selectedUser = sessionStorage.getItem("chat_selected_user") || null;

const notificationSound = new Audio("https://www.soundjay.com/button/beep-07.wav");

if (!token) {
  alert("❌ Session expired. Please login again.");
  window.location.href = "login-tutor.html";
}

async function fetchStudents() {
  try {
    const res = await fetch("http://localhost:5000/api/users", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const users = await res.json();

    usersList.innerHTML = '<div class="sidebar-header">Students</div>';

    const studentMap = {};

    users
      .filter(user => user.role === "student")
      .forEach(user => {
        const div = document.createElement("div");
        div.className = "user";
        div.dataset.email = user.email;
        div.innerHTML = `
          <img src="https://www.w3schools.com/howto/img_avatar.png" />
          <div class="user-name">${user.name}</div>
        `;
        div.onclick = () => {
          selectedUser = user.email;
          sessionStorage.setItem("chat_selected_user", selectedUser);
          chatHeader.textContent = `Chatting with ${user.name}`;
          document.querySelectorAll(".user").forEach(u => u.classList.remove("selected-user"));
          div.classList.add("selected-user");
          chatMessages.innerHTML = "";
          loadMessages();
        };
        usersList.appendChild(div);

        studentMap[user.email] = div;
      });

    // ✅ Try to auto-restore chat
    if (selectedUser && studentMap[selectedUser]) {
      setTimeout(() => {
        studentMap[selectedUser].click();
      }, 300);
    }
  } catch (err) {
    console.error("❌ Failed to load users:", err.message);
    usersList.innerHTML = `<p style="padding:1rem;">❌ Failed to load users.</p>`;
  }
}

async function loadMessages() {
  try {
    const res = await fetch(`http://localhost:5000/api/chat/conversations/${currentUser}/${selectedUser}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const messages = await res.json();
    chatMessages.innerHTML = "";

    messages.forEach(msg => {
      appendMessage(msg, msg.senderId === currentUser);
    });

    scrollToBottom();
  } catch (err) {
    chatMessages.innerHTML = `<p style="padding:1rem;">❌ Failed to load messages.</p>`;
  }
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

function appendMessage(msg, isSender) {
  const div = document.createElement("div");
  div.className = `message ${isSender ? "sent" : "received"}`;
  div.innerHTML = `<div class="message-content">${msg.content}</div>`;
  chatMessages.appendChild(div);
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

messageInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.onclick = sendMessage;

socket.on("receiveMessage", (msg) => {
  if (msg.senderId === selectedUser || msg.receiverId === selectedUser) {
    appendMessage(msg, msg.senderId === currentUser);
    scrollToBottom();
    notificationSound.play();
  }
});

fetchStudents();



