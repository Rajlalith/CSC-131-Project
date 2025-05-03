const baseURL = "http://localhost:5000/api"; // Change if hosted elsewhere

// 🔐 Secure wrapper for protected API calls
async function secureFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${baseURL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    alert("Session expired. Redirecting to login...");
    const role = localStorage.getItem("role");
    localStorage.clear();
    sessionStorage.clear();

    if (role === "tutor") {
      window.location.href = "login-tutor.html";
    } else if (role === "admin") {
      window.location.href = "login-admin.html";
    } else {
      window.location.href = "login.html";
    }
    return;
  }

  return res;
}

// 🔐 Register user (student/tutor/admin)
async function registerUser(data) {
  const res = await fetch(`${baseURL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Registration failed");
  }

  return res.json(); // May contain { message }
}

// 🔐 Login user
async function loginUser(email, password, expectedRole = "student") {
  const res = await fetch(`${baseURL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    throw new Error("Invalid server response");
  }

  if (!res.ok) {
    // 🚫 Only redirect to OTP page for non-admins
    if (res.status === 403 && expectedRole !== "admin") {
      sessionStorage.setItem("pendingVerificationEmail", email);
      window.location.href = "verify-otp.html";
      return { redirected: true };
    }
    throw new Error(data.message || "Login failed");
  }

  return data; // { token, role, user }
}

// 🔐 Forgot password
async function forgotPassword(email) {
  const res = await fetch(`${baseURL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to send reset link");
  }

  return res.json();
}

// 🧪 Create test user (dev only)
async function createTestUser() {
  const res = await fetch(`${baseURL}/auth/create-test-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create test user");
  }

  return res.json();
}

// ✅ Export everything globally
window.auth = {
  registerUser,
  loginUser,
  forgotPassword,
  createTestUser,
  secureFetch,
};
