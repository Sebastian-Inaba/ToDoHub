// module import in to index
import { initSidebarToggle } from "./components/sidebarToggle.js";
import "./components/darkLightToggle.js";
import "./navigation.js";
import "./components/customTapFlash.js";
import "./components/theme-init.js";
import { loadSidebarProjects } from "./components/project.js";

document.addEventListener("DOMContentLoaded", () => {
    initSidebarToggle();
    loadSidebarProjects();
    // Add event listeners to sidebarNav buttons
    const nav = document.querySelector(".sidebarNav");
    if (nav) {
        const buttons = nav.querySelectorAll(".sidebarButton");
        const routes = [
            "Dashboard",
            "Add Project",
            "Important",
            "Calendar",
            "Attachments",
            "Notes",
            "Messages",
            "Trash",
        ];
        buttons.forEach((btn, i) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                window.dispatchEvent(
                    new CustomEvent("navigate", {
                        detail: { route: routes[i] },
                    }),
                );
            });
        });
    }
    // Always load Dashboard on refresh(for now)
    window.dispatchEvent(
        new CustomEvent("navigate", { detail: { route: "Dashboard" } }),
    );
    // No need to call darkLightToggle, project, or customTapFlash directly; they self-initialize
});
