// auth.js - Login/session management

const Auth = {
    SESSION_KEY: 'currentSession',

    login(email) {
        const org = Storage.getOrganizationByEmail(email);
        if (!org) {
            return { success: false, error: 'Organization not found with that email.' };
        }
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(org));
        return { success: true, org };
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        // Determine correct path based on current location
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            window.location.href = 'goodbye.html';
        } else {
            window.location.href = 'pages/goodbye.html';
        }
    },

    getCurrentUser() {
        const data = sessionStorage.getItem(this.SESSION_KEY);
        return data ? JSON.parse(data) : null;
    },

    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    isWrangler() {
        const user = this.getCurrentUser();
        return user && user.isWrangler;
    },

    requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    requireWrangler() {
        if (!this.requireLogin()) return false;
        if (!this.isWrangler()) {
            window.location.href = 'pages/customer-dashboard.html';
            return false;
        }
        return true;
    }
};
