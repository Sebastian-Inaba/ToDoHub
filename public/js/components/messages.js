export function renderMessages() {
    const main = document.querySelector(".mainContent");
    main.innerHTML = "";
    const tpl = document.getElementById("templateMessages");
    if (tpl) {
        const content = tpl.content.cloneNode(true);
        main.appendChild(content);
    }
}
