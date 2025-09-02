// public/js/auth/authCheck.js
// This script checks if the user is authenticated by making a request to the server.

// When index DOM loads fetch data via get that must have credentials(cookies)
// If there is a response and its not ok send back to login if ok allow access
document.addEventListener("DOMContentLoaded", () => {
    fetch("http://localhost:3000/api/check", {
        method: "GET",
        credentials: "include", // includes cookies like the access token or refresh token
    })
        .then((response) => {
            if (response.status === 401) {
                // Access token expired? Try refresh
                return fetch("/api/refreshToken", {
                    method: "POST",
                    credentials: "include",
                }).then((refreshRes) => {
                    if (!refreshRes.ok) throw new Error("Refresh failed");

                    // Retry the original check
                    return fetch("/api/check", {
                        method: "GET",
                        credentials: "include",
                    });
                });
            }
            return response;
        })
        .then((response) => {
            if (!response.ok) throw new Error("Not authenticated");
            return response.json();
        })
        //chain the "then" response from before and and if there is one "unlock" the index we hide
        .then((responseData) => {
            if (responseData) {
                console.log("User is authenticated");
                document.body.style.display = "block"; // this can be forced open in browser but all they would see is the UI wth no user data
            }
        })
        // catch any error if something goes wrong
        .catch((err) => {
            console.log("Authentication failed:", err);
            window.location.href = "login.html";
        });
});
