# 📘 CSC-EzPremiumTutors-Spring25

A collaborative full-stack tutoring platform built with Vite + React for the frontend and Node.js + Express + MongoDB for the backend.

---

## 🚀 Tech Stack

**Frontend:**
- React (via Vite)
- Chakra UI (for styling)
- JavaScript

**Backend:**
- Node.js
- Express
- MongoDB (Mongoose)

**Tools:**
- Git & GitHub for collaboration
- VS Code for development

---

## 📁 Project Structure

```
CSC 131 Project/
├── frontend/            # Vite + React app
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
├── backend/             # Express + MongoDB server
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── .env
│   ├── server.js
│   └── package.json
└── README.md            # You're here
```

---

## 🧑‍💻 Setup Instructions

### 🔹 Clone the Repository
```bash
git clone https://github.com/Kerr-A/CSC-EzPremiumTutors-Spring25.git
cd CSC-EzPremiumTutors-Spring25
```

### 🔹 Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Runs the frontend app at `http://localhost:5173`

### 🔹 Backend Setup
```bash
cd backend
npm install
npm run dev
```
Runs the backend API at `http://localhost:5000`

> ⚠️ Make sure MongoDB is running locally or update `.env` with your Atlas URI

---

## 👥 Git Workflow (Team Collaboration)

### Initial Push (one member only):
```bash
git init
git remote add origin https://github.com/Kerr-A/CSC-EzPremiumTutors-Spring25.git
git add .
git commit -m "Initial Vite + React setup"
git push -u origin main
```

### Team Members:
```bash
git clone https://github.com/Kerr-A/CSC-EzPremiumTutors-Spring25.git
cd CSC-EzPremiumTutors-Spring25
npm install
npm run dev
```

### Feature Development Workflow:
```bash
git checkout -b your-feature-name
# Make changes
npm run dev

# Before pushing:
git checkout main
git pull origin main
git checkout your-feature-name
git merge main

# Push your branch:
git add .
git commit -m "Add your feature"
git push origin your-feature-name
```
Then open a Pull Request (PR) on GitHub to merge your branch into `main`.

---

## 🌟 Features Overview

**EzPremiumTutors** is a web-based platform designed to connect students with tutors for seamless session scheduling, communication, and management. 

### Key Features
- **Account Logins for Students and Tutors**  
  Secure authentication with role-based dashboards.

- **Student Dashboard**  
  Search tutors by subject, availability, and rating. Book and track sessions. Chat with tutors.

- **Tutor Dashboard**  
  Manage student bookings, set availability, track sessions, and view earnings.

- **Real-time Communication**  
  Integrated chat for session planning and homework discussions.

- **Booking & Scheduling**  
  Students book based on tutor availability. Tutors manage slots.

- **Payment System** *(planned)*  
  Stripe integration for seamless in-app payments.

- **Reviews & Ratings**  
  Mutual feedback after each session for trust and transparency.

---

## 📆 Future Enhancements
- Live video call support for tutoring sessions
- Advanced availability filtering and smart tutor matching
- Admin dashboard for managing platform usage and performance

---

## 💼 Contributors
- Raj Lalith
---

## 📄 License
MIT

