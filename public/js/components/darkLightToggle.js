// public/js/components/darkLightToggle.js
// Dark/Light Theme Toggle Component

document.addEventListener("DOMContentLoaded", () => {
    // Check if the current page is the index (landing) page
    const isIndexPage = ["/", "/index.html", "/dashboard"].includes(
        window.location.pathname,
    );

    // Try to find the theme toggle button in the DOM
    // It could be either the header button (.themeToggle) or the floating button (.floatingThemeToggle)
    let themeToggle =
        document.querySelector(".themeToggle") ||
        document.querySelector(".floatingThemeToggle");

    // If no toggle button exists and we are NOT on the index page,
    // create a floating toggle button as a fallback
    if (!themeToggle && !isIndexPage) {
        themeToggle = document.createElement("button"); // Create a button element
        themeToggle.className = "floatingThemeToggle"; // Assign class for floating style
        themeToggle.setAttribute("aria-label", "Toggle theme"); // Accessibility label
        themeToggle.setAttribute("title", "Toggle light/dark theme"); // Tooltip text
        document.body.appendChild(themeToggle); // Add the button to the page
    }

    // If toggle button exists (found or created), set it up
    if (themeToggle) {
        // Function to update the icon inside the button based on current theme
        function updateIcon() {
            // Get current theme from <html> attribute, default to 'dark' if not set
            const currentTheme =
                document.documentElement.getAttribute("dataTheme") || "dark";
            // Show moon icon if theme is light, sun icon if dark
            themeToggle.innerHTML =
                currentTheme === "light"
                    ? '<i class="fas fa-moon"></i>'
                    : '<i class="fas fa-sun"></i>';
        }

        // Initial icon setup on page load
        updateIcon();

        // Add click event listener to toggle theme on button press
        themeToggle.addEventListener("click", () => {
            // Check current theme
            const current = document.documentElement.getAttribute("dataTheme");
            if (current === "light") {
                // Switch to dark theme: remove attribute and save preference
                document.documentElement.removeAttribute("dataTheme");
                localStorage.setItem("theme", "dark");
            } else {
                // Switch to light theme: set attribute and save preference
                document.documentElement.setAttribute("dataTheme", "light");
                localStorage.setItem("theme", "light");
            }
            // Update icon to reflect new theme
            updateIcon();
        });
    }
});
