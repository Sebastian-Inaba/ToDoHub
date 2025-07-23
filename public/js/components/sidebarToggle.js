export function initSidebarToggle() {
    const hamburgerBtn = document.querySelector(".hamburgerButton");
    const sidebar = document.querySelector(".sidebar");
    const navButtons = document.querySelectorAll(".sidebarButton");

    let isOpen = false;
    let animationFrame;

    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add("is-touch");
    }

    function addRightArrows() {
        if (window.innerWidth > 1024) {
            navButtons.forEach((btn) => {
                const arrow = btn.querySelector(".fa-arrow-right");
                if (arrow) arrow.remove();
            });
            return;
        }
        navButtons.forEach((btn) => {
            if (!btn.querySelector(".fa-arrow-right")) {
                const arrow = document.createElement("i");
                arrow.className = "fas fa-arrow-right";
                arrow.style.marginLeft = "auto";
                btn.appendChild(arrow);
            }
        });
    }

    function slideSidebar(open) {
        cancelAnimationFrame(animationFrame);
        const start = performance.now();
        const duration = 300;
        const from = open ? -100 : 0;
        const to = open ? 0 : -100;

        function animate(time) {
            let elapsed = time - start;
            let progress = Math.min(elapsed / duration, 1);
            let easeProgress = 1 - Math.pow(1 - progress, 3);
            let currentX = from + (to - from) * easeProgress;

            sidebar.style.transform = `translateX(${currentX}%)`;

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                isOpen = open;
                if (!open) {
                    sidebar.style.transform = "translateX(-100%)";
                }
            }
        }
        animationFrame = requestAnimationFrame(animate);
    }

    function initSidebar() {
        addRightArrows();
        if (window.innerWidth <= 1024) {
            sidebar.style.transform = "translateX(-100%)";
            isOpen = false;
        } else {
            sidebar.style.transform = "";
            sidebar.classList.remove("open");
            isOpen = true;
        }
    }

    initSidebar();

    window.addEventListener("resize", initSidebar);

    hamburgerBtn.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
            slideSidebar(!isOpen);
            document.body.classList.toggle("no-scroll");
        }
    });

    navButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (window.innerWidth <= 1024 && isOpen) {
                slideSidebar(false);
                document.body.classList.remove("no-scroll");
            }
        });
    });
}

function updateTouchClass() {
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add("is-touch");
    } else {
        document.body.classList.remove("is-touch");
    }
}

updateTouchClass();

window.addEventListener("resize", () => {
    updateTouchClass();
});
