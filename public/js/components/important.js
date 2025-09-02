export function renderImportant() {
    const main = document.querySelector(".mainContent");
    main.innerHTML = "";
    const tpl = document.getElementById("templateImportant");
    if (tpl) {
        const content = tpl.content.cloneNode(true);
        main.appendChild(content);
    }
}
