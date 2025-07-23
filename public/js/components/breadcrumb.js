export function setBreadcrumb(pathArray, onClickHandler) {
    const breadcrumbNav = document.querySelector(".headerBreadcrumb");
    if (!breadcrumbNav) return;

    breadcrumbNav.innerHTML = "";

    const leadingSlash = document.createElement("span");
    leadingSlash.textContent = "/";
    leadingSlash.classList.add("separator");
    breadcrumbNav.appendChild(leadingSlash);

    pathArray.forEach((crumb, index) => {
        const link = document.createElement("a");
        link.textContent = crumb;
        link.href = "#";
        link.addEventListener("click", (e) => {
            e.preventDefault();
            if (onClickHandler) onClickHandler(index);
        });
        breadcrumbNav.appendChild(link);

        // Add slash after all but last
        if (index < pathArray.length - 1) {
            const sep = document.createElement("span");
            sep.textContent = "/";
            sep.classList.add("separator");
            breadcrumbNav.appendChild(sep);
        }
    });
}
