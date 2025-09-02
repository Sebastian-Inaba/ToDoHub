export function renderAttachments() {
    const main = document.querySelector(".mainContent");
    main.innerHTML = "";
    const tpl = document.getElementById("templateAttachments");
    if (tpl) {
        const content = tpl.content.cloneNode(true);
        main.appendChild(content);
    }
}
