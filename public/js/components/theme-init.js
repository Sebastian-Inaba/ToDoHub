function applySavedTheme() {
    // Add a class to temporarily disable transitions (prevent flash during theme switch)
    document.documentElement.classList.add("themeInitializing");

    // Get the saved theme from localStorage
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
        // If the saved theme is light, set the dataTheme attribute to 'light'
        document.documentElement.setAttribute("dataTheme", "light");
    } else {
        // Otherwise, remove the dataTheme attribute to default to dark
        document.documentElement.removeAttribute("dataTheme");
    }

    // Wait until the next animation frame before transitions
    // This ensures the theme is applied before any CSS transitions can occur
    requestAnimationFrame(() => {
        document.documentElement.classList.remove("themeInitializing");
    });
}

// Apply the saved theme on initial page load
applySavedTheme();

// Also apply the saved theme when navigating with the back/forward in browser cache
window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        applySavedTheme(); // Reapply theme if the page was restored from browser cache
    }
});
