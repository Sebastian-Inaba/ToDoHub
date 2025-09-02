// public/js/auth/logout.js
// This script handles the logout functionality for the web application.

async function logout() {
    localStorage.removeItem("lastSection");
    const confirmLogout = confirm("Are you sure you want to logout?");
    if (!confirmLogout) return; // User canceled, cancel call

    // Fetch logout route and try to run
    try {
        const res = await fetch("http://localhost:3000/api/logout", {
            method: "POST",
            credentials: "include",
        });
        const data = await res.json();
        console.log(data.message);
        window.location.href = "login.html";
    } catch (err) {
        console.error("Logout failed:", err);
        alert("Logout failed. Please try again.");
    }
}
