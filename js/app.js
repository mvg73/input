// app.js - Main app controller

const App = {
    init() {
        this.setupNavigation();
        this.checkAuth();
    },

    setupNavigation() {
        // Add logout handler to any logout buttons
        document.querySelectorAll('[data-action="logout"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
            });
        });
    },

    checkAuth() {
        const path = window.location.pathname;
        const isLoginPage = path.endsWith('index.html') || path.endsWith('/');

        if (!isLoginPage && !Auth.isLoggedIn()) {
            window.location.href = path.includes('/pages/') ? '../index.html' : 'index.html';
            return;
        }

        // Update UI with user info if logged in
        const user = Auth.getCurrentUser();
        if (user) {
            document.querySelectorAll('[data-user-name]').forEach(el => {
                el.textContent = user.name;
            });
            document.querySelectorAll('[data-user-email]').forEach(el => {
                el.textContent = user.email;
            });
        }
    },

    // Helper to show messages
    showMessage(elementId, message, isError = false) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.className = isError ? 'message error' : 'message success';
            el.style.display = 'block';
            if (!isError) {
                setTimeout(() => { el.style.display = 'none'; }, 3000);
            }
        }
    },

    // Helper to clear form
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
    },

    // Helper to populate a select dropdown
    populateSelect(selectId, items, valueKey, textKey, placeholder = 'Select...') {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = `<option value="">${placeholder}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            select.appendChild(option);
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
