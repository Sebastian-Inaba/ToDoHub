//public/js/auth/login.js
// This script handles the login functionality for the web application.

const loginForm = document.getElementById("loginForm"); // Select the login form element by its ID to attach event listener
const loginError = document.getElementById("loginError"); // Select the element to display error or success messages to the user

// Add a submit event listener to the login form to handle form submission
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent the default form submission behavior (page reload)

    // Get the trimmed values of email and password fields from the form just in case user has entered leading or trailing spaces
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    // Simple client-side validation: check if both email and password are provided
    if (!email || !password) {
        loginError.textContent = "Please fill out both fields.";
        return;
    }

    try {
        // Send POST request to backend login API with email and password
        // ✅ This is fine for local development (localhost over HTTP)
        // ⚠️ In production, use HTTPS and secure your API endpoints with proper headers and cookie settings
        const response = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include", // Include cookies in the request for session management
        });

        const data = await response.json();

        if (response.ok) {
            loginError.style.color = "green";
            loginError.textContent = data.message;

            // Redirect to home page (index.html) after 1 second delay
            setTimeout(() => {
                window.location.href = "index.html";
            }, 500);
        } else {
            // If login failed (e.g. wrong credentials), show error message in red
            loginError.style.color = "red";
            loginError.textContent = data.error || "Login failed"; // Use server error or fallback text
        }
    } catch (error) {
        // Catch any network or unexpected errors and log them to the console
        console.error("Error logging in:", error);

        // Show a generic server error message to the user
        loginError.textContent = "Server error. Try again later.";
    }
});
