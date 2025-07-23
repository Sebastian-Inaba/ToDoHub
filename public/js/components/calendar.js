export function renderCalendar() {
    const main = document.querySelector('.mainContent');
    main.innerHTML = '';
    const tpl = document.getElementById('templateCalendar');
    if (tpl) {
        const content = tpl.content.cloneNode(true);
        main.appendChild(content);
    }
}
