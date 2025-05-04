const baseURL = "http://localhost:5000/api"; // Change if hosted elsewhere

// Secure wrapper for protected API calls
async function secureFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
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

    let data;
    try {
      data = await res.json();
    } catch (err) {
      console.warn("⚠️ Failed to parse JSON:", err);
      throw new Error("Invalid server response format");
    }

    if (!res.ok) {
      console.error("❌ API error:", data.message || "Unknown error");
      throw new Error(data.message || "Request failed");
    }

    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (err) {
    console.error("❌ secureFetch failed:", err.message);
    throw err;
  }
}

// Register user (student/tutor/admin)
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

  return res.json();
}

// Login user
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
    if (res.status === 403 && expectedRole !== "admin") {
      sessionStorage.setItem("pendingVerificationEmail", email);
      window.location.href = "verify-otp.html";
      return { redirected: true };
    }
    throw new Error(data.message || "Login failed");
  }

  return data;
}

// Forgot password
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

// Reset password via token
async function resetPassword(token, password) {
  const res = await fetch(`${baseURL}/auth/reset-password/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Password reset failed");
  }

  return data;
}

// Create test user
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

// Export
window.auth = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  createTestUser,
  secureFetch,
};
