export function renderTrash() {
    const main = document.querySelector('.mainContent');
    main.innerHTML = '';
    const tpl = document.getElementById('templateTrash');
    if (tpl) {
        const content = tpl.content.cloneNode(true);
        main.appendChild(content);
    }
}
