export function renderNotes() {
    const main = document.querySelector('.mainContent');
    main.innerHTML = '';
    const tpl = document.getElementById('templateNotes');
    if (tpl) {
        const content = tpl.content.cloneNode(true);
        main.appendChild(content);
    }
}
