// Enable mouse drag-to-scroll for a container (vertical only)
export function enableDragScroll(containerSelector) {
    const el = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
    if (!el) return;

    let isDown = false;
    let startY;
    let scrollTop;

    el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left mouse button
        isDown = true;
        el.classList.add('dragging');
        startY = e.pageY - el.getBoundingClientRect().top;
        scrollTop = el.scrollTop;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const y = e.pageY - el.getBoundingClientRect().top;
        const walk = y - startY;
        el.scrollTop = scrollTop - walk;
    });

    document.addEventListener('mouseup', () => {
        isDown = false;
        el.classList.remove('dragging');
    });

    // Optional: Prevent text selection while dragging
    el.addEventListener('dragstart', (e) => e.preventDefault());
}

// Usage example (in your main entry point):
// import { enableDragScroll } from './jsComponents/dragScroll.js';
// enableDragScroll('.sidebarProjectsList');
