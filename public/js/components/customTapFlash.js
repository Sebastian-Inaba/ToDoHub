// public/js/components/customTapFlash.js
// Custom Tap Flash Effect component

//
// Not working 100% Should be fixed
//

const FLASH_DURATION = 300; // match your CSS animation duration

function addFlashEffect(target) {
    if (!target) return;

    // If a flash is already running, reset the animation by removing and forcing reflow
    if (target._isFlashing) {
        target.classList.remove("custom-tap-flash");
        void target.offsetWidth; // trigger reflow
    }

    // Start flash
    target.classList.add("custom-tap-flash");
    target._isFlashing = true;

    // Clear any existing timeout to avoid premature removal
    if (target._flashTimeout) clearTimeout(target._flashTimeout);

    // Remove flash class after animation completes
    target._flashTimeout = setTimeout(() => {
        target.classList.remove("custom-tap-flash");
        target._isFlashing = false;
        target._flashTimeout = null;
    }, FLASH_DURATION);
}

function handleTapFlash(e) {
    // Only left click or touch
    if (e.type === "mousedown" && e.button !== 0) return;
    // Only flash if the event target is a button, not a parent
    const selectors = [".sidebarButton", ".addProjectButton", ".headerButton"];
    let target = e.target;
    // Find the closest matching button
    for (const sel of selectors) {
        if (target.matches(sel)) {
            addFlashEffect(target);
            break;
        }
    }
}

document.addEventListener("mousedown", handleTapFlash, { passive: true });
document.addEventListener("touchstart", handleTapFlash, { passive: true });

// Optional: export for manual use
export { addFlashEffect };
