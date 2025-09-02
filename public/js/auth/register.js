// public/js/auth/register.js
// This script handles the registration functionality for the web application.

const uploadBtn = document.getElementById("uploadBtn"); // Select the upload button element that triggers file(pfp) input click
const profilePicInput = document.getElementById("profilePic"); // Select the hidden file input for profile picture selection
const previewImg = document.getElementById("pfpPreviewImg"); // Select the image element used to preview the chosen profile picture
const icon = document.getElementById("pfpIcon"); // Select the icon element displayed when no profile picture is chosen
const form = document.getElementById("registerForm"); // Select the registration form element for handeling form submission

// Add submit event listener to the registration form to handle form submission
form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submit which reloads the page

    // Get values from password and confirm password fields
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Basic client-side validation: check if both passwords match
    if (password !== confirmPassword) {
        alert("Passwords do not match, please try again.");
        return; // Stop submission if passwords don't match
    }

    // Create FormData object from form fields including file input for better handling of file uploads by javascript
    // FormData allows us to easily send form data including files in a POST request
    const formData = new FormData(form);

    try {
        // Send POST request to the backend register endpoint inside server.js with formData
        const response = await fetch("http://localhost:3000/api/register", {
            method: "POST", // Use POST method to send user data
            body: formData, // FormData automatically sets up the appropriate data we want to send
        });

        if (response.ok) {
            // If registration succeeded we notify user
            alert("Registration successful!");
            // Then redirect to login page after successful registration
            window.location.href = "login.html";
        } else {
            // If registration failed, we check if the response is JSON to handle errors properly
            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                alert(
                    "Error: " + (errorData.error || "Unknown error occurred."),
                );
            } else {
                const errorText = await response.text();
                alert("Server Error: " + errorText);
            }
        }
    } catch (err) {
        if (err instanceof TypeError && err.message === "Failed to fetch") {
            // This happens when server is not reachable at all (network error)
            alert(
                "Cannot reach the server. Is it running at http://localhost:3000?",
            );
        } else {
            // Other unexpected issues
            console.error(err);
            alert("Unexpected error occurred.");
        }
    }
});

// Add click event listener to upload button to trigger hidden file(pfp) input click
uploadBtn.addEventListener("click", () => {
    profilePicInput.click(); // Open file picker
});

// Listen for changes in the profile picture file input (when user selects a file)
profilePicInput.addEventListener("change", (event) => {
    const file = event.target.files[0]; // Get the first selected file hence the [0] index and store it in file variable

    if (file) {
        // If a file was selected, create a FileReader to read it
        const reader = new FileReader();

        // When file is read successfully, update preview image source so user can see the selected profile picture before submitting
        reader.onload = (e) => {
            previewImg.src = e.target.result; // Set preview image to selected file data URL
            previewImg.style.display = "block"; // Show the preview image element
            icon.style.display = "none"; // Hide the default icon since we have a preview
        };

        // Read the selected file as a Data URL (base64 encoded image)
        reader.readAsDataURL(file);
    } else {
        // If no file is selected, reset preview image and show default icon
        previewImg.src = ""; // Clear preview image source
        previewImg.style.display = "none"; // Hide the preview image element
        icon.style.display = "flex"; // Show the default icon
    }
});
