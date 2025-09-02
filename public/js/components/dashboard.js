export function renderDashboard() {
    const main = document.querySelector(".mainContent");
    main.innerHTML = "";
    const tpl = document.getElementById("templateDashboard");
    if (tpl) {
        const content = tpl.content.cloneNode(true);
        main.appendChild(content);
    }
}
