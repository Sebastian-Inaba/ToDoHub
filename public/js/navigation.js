// Root navigation dispatcher for sidebar routes
import { renderDashboard } from './components/dashboard.js';
import { showAddProjectTemplate, loadProjectFolder } from './components/project.js';
import { renderImportant } from './components/important.js';
import { renderCalendar } from './components/calendar.js';
import { renderAttachments } from './components/attachments.js';
import { renderNotes } from './components/notes.js';
import { renderMessages } from './components/messages.js';
import { renderTrash } from './components/trash.js';
import { setBreadcrumb } from './components/breadcrumb.js';

const routeMap = {
    Dashboard: {
        handler: () => {
            renderDashboard();
            setBreadcrumb(["Dashboard"]);
        }
    },
    'Add Project': {
        handler: () => {
            showAddProjectTemplate();
            setBreadcrumb(["Add Project"]);
        }
    },
    Important: {
        handler: () => {
            renderImportant();
            setBreadcrumb(["Important"]);
        }
    },
    Calendar: {
        handler: () => {
            renderCalendar();
            setBreadcrumb(["Calendar"]);
        }
    },
    Attachments: {
        handler: () => {
            renderAttachments();
            setBreadcrumb(["Attachments"]);
        }
    },
    Notes: {
        handler: () => {
            renderNotes();
            setBreadcrumb(["Notes"]);
        }
    },
    Messages: {
        handler: () => {
            renderMessages();
            setBreadcrumb(["Messages"]);
        }
    },
    Trash: {
        handler: () => {
            renderTrash();
            setBreadcrumb(["Trash"]);
        }
    },
    Project: {
        handler: (project) => {
            loadProjectFolder(project);
            setBreadcrumb([project.title]);
        }
    }
};

// Listen for navigation events
window.addEventListener('navigate', (e) => {
    const { route, project } = e.detail || {};
    if (routeMap[route]) {
        if (route === 'Project') {
            routeMap[route].handler(project);
        } else {
            routeMap[route].handler();
        }
    }
});

