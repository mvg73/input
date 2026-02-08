// storage.js - localStorage CRUD operations
// This module is designed for easy replacement with AWS API calls

const Storage = {
    // Generic CRUD helpers
    _getCollection(name) {
        const data = localStorage.getItem(name);
        return data ? JSON.parse(data) : [];
    },

    _saveCollection(name, data) {
        localStorage.setItem(name, JSON.stringify(data));
    },

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Organizations
    getOrganizations() {
        return this._getCollection('organizations');
    },

    getOrganization(id) {
        return this.getOrganizations().find(o => o.id === id);
    },

    getOrganizationByEmail(email) {
        return this.getOrganizations().find(o => o.email.toLowerCase() === email.toLowerCase());
    },

    saveOrganization(org) {
        const orgs = this.getOrganizations();
        if (org.id) {
            const idx = orgs.findIndex(o => o.id === org.id);
            if (idx !== -1) orgs[idx] = org;
        } else {
            org.id = this._generateId();
            orgs.push(org);
        }
        this._saveCollection('organizations', orgs);
        return org;
    },

    deleteOrganization(id) {
        const orgs = this.getOrganizations().filter(o => o.id !== id);
        this._saveCollection('organizations', orgs);
        // Clean up links
        const links = this.getOrgProjectLinks().filter(l => l.orgId !== id);
        this._saveCollection('orgProjectLinks', links);
    },

    // Projects
    getProjects() {
        return this._getCollection('projects');
    },

    getProject(id) {
        return this.getProjects().find(p => p.id === id);
    },

    saveProject(project) {
        const projects = this.getProjects();
        if (project.id) {
            const idx = projects.findIndex(p => p.id === project.id);
            if (idx !== -1) projects[idx] = project;
        } else {
            project.id = this._generateId();
            projects.push(project);
        }
        this._saveCollection('projects', projects);
        return project;
    },

    deleteProject(id) {
        const projects = this.getProjects().filter(p => p.id !== id);
        this._saveCollection('projects', projects);
        // Clean up links
        const orgLinks = this.getOrgProjectLinks().filter(l => l.projectId !== id);
        this._saveCollection('orgProjectLinks', orgLinks);
        const expLinks = this.getProjectExpectationLinks().filter(l => l.projectId !== id);
        this._saveCollection('projectExpectationLinks', expLinks);
    },

    // Data Set Expectations
    getExpectations() {
        return this._getCollection('dataSetExpectations');
    },

    getExpectation(id) {
        return this.getExpectations().find(e => e.id === id);
    },

    saveExpectation(expectation) {
        const expectations = this.getExpectations();
        if (expectation.id) {
            const idx = expectations.findIndex(e => e.id === expectation.id);
            if (idx !== -1) expectations[idx] = expectation;
        } else {
            expectation.id = this._generateId();
            expectations.push(expectation);
        }
        this._saveCollection('dataSetExpectations', expectations);
        return expectation;
    },

    deleteExpectation(id) {
        const expectations = this.getExpectations().filter(e => e.id !== id);
        this._saveCollection('dataSetExpectations', expectations);
        // Clean up links
        const links = this.getProjectExpectationLinks().filter(l => l.expectationId !== id);
        this._saveCollection('projectExpectationLinks', links);
    },

    // Organization-Project Links
    getOrgProjectLinks() {
        return this._getCollection('orgProjectLinks');
    },

    getOrgProjectLink(orgId, projectId) {
        return this.getOrgProjectLinks().find(l => l.orgId === orgId && l.projectId === projectId);
    },

    getProjectsForOrg(orgId) {
        const links = this.getOrgProjectLinks().filter(l => l.orgId === orgId);
        return links.map(l => this.getProject(l.projectId)).filter(Boolean);
    },

    getOrgProjectLinksForOrg(orgId) {
        return this.getOrgProjectLinks().filter(l => l.orgId === orgId);
    },

    linkOrgToProject(orgId, projectId, reportingInterval = null, reportingDay = null) {
        const links = this.getOrgProjectLinks();
        const existing = links.find(l => l.orgId === orgId && l.projectId === projectId);

        if (!existing) {
            const newLink = {
                orgId,
                projectId,
                reportingInterval: reportingInterval, // 'daily', 'weekly', 'monthly', or null
                reportingDayOfWeek: reportingInterval === 'weekly' ? reportingDay : null,
                reportingDayOfMonth: reportingInterval === 'monthly' ? reportingDay : null,
                nextDueDate: null,
                streak: 0,
                history: []
            };
            // Calculate initial due date if interval is set
            if (reportingInterval) {
                newLink.nextDueDate = this.calculateNextDueDate(newLink);
            }
            links.push(newLink);
            this._saveCollection('orgProjectLinks', links);
        }
    },

    updateOrgProjectLink(orgId, projectId, updates) {
        const links = this.getOrgProjectLinks();
        const idx = links.findIndex(l => l.orgId === orgId && l.projectId === projectId);
        if (idx !== -1) {
            links[idx] = { ...links[idx], ...updates };
            // Recalculate due date if interval changed
            if (updates.reportingInterval !== undefined) {
                links[idx].nextDueDate = this.calculateNextDueDate(links[idx]);
            }
            this._saveCollection('orgProjectLinks', links);
            return links[idx];
        }
        return null;
    },

    unlinkOrgFromProject(orgId, projectId) {
        const links = this.getOrgProjectLinks().filter(
            l => !(l.orgId === orgId && l.projectId === projectId)
        );
        this._saveCollection('orgProjectLinks', links);
    },

    // Compliance calculation functions
    calculateNextDueDate(link, fromDate = null) {
        if (!link.reportingInterval) return null;

        const now = fromDate ? new Date(fromDate) : new Date();
        let dueDate = new Date(now);

        switch (link.reportingInterval) {
            case 'daily':
                // Due end of today (or tomorrow if already past 5pm)
                dueDate.setHours(23, 59, 59, 999);
                break;

            case 'weekly':
                // Due on the specified day of week
                const targetDay = link.reportingDayOfWeek || 0; // Default Sunday
                const currentDay = dueDate.getDay();
                let daysUntil = targetDay - currentDay;
                if (daysUntil <= 0) daysUntil += 7; // Next week if today or past
                dueDate.setDate(dueDate.getDate() + daysUntil);
                dueDate.setHours(23, 59, 59, 999);
                break;

            case 'monthly':
                // Due on the specified day of month
                const targetDayOfMonth = link.reportingDayOfMonth || 1;
                if (dueDate.getDate() >= targetDayOfMonth) {
                    // Move to next month
                    dueDate.setMonth(dueDate.getMonth() + 1);
                }
                dueDate.setDate(Math.min(targetDayOfMonth, this._getDaysInMonth(dueDate)));
                dueDate.setHours(23, 59, 59, 999);
                break;
        }

        return dueDate.toISOString();
    },

    _getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    },

    getComplianceStatus(link) {
        if (!link.reportingInterval || !link.nextDueDate) {
            return { status: 'no-schedule', daysUntil: null, message: 'No schedule set' };
        }

        const now = new Date();
        const dueDate = new Date(link.nextDueDate);
        const diffMs = dueDate - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                status: 'overdue',
                daysUntil: diffDays,
                message: `OVERDUE by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
            };
        } else if (diffDays === 0) {
            return {
                status: 'due-today',
                daysUntil: 0,
                message: 'Due TODAY'
            };
        } else if (diffDays === 1) {
            return {
                status: 'due-soon',
                daysUntil: 1,
                message: 'Due tomorrow'
            };
        } else if (diffDays <= 3) {
            return {
                status: 'due-soon',
                daysUntil: diffDays,
                message: `Due in ${diffDays} days`
            };
        } else {
            return {
                status: 'on-track',
                daysUntil: diffDays,
                message: `Due in ${diffDays} days`
            };
        }
    },

    recordSubmission(orgId, projectId) {
        const links = this.getOrgProjectLinks();
        const idx = links.findIndex(l => l.orgId === orgId && l.projectId === projectId);

        if (idx === -1 || !links[idx].reportingInterval) return null;

        const link = links[idx];
        const now = new Date();
        const dueDate = new Date(link.nextDueDate);
        const wasOnTime = now <= dueDate;

        // Add to history (keep last 12 entries)
        const historyEntry = {
            dueDate: link.nextDueDate,
            submittedDate: now.toISOString(),
            wasOnTime: wasOnTime
        };
        link.history = link.history || [];
        link.history.unshift(historyEntry);
        if (link.history.length > 12) link.history.pop();

        // Update streak
        if (wasOnTime) {
            link.streak = (link.streak || 0) + 1;
        } else {
            link.streak = 0;
        }

        // Calculate next due date
        link.nextDueDate = this.calculateNextDueDate(link, now);

        this._saveCollection('orgProjectLinks', links);
        return link;
    },

    // Project-Expectation Links
    getProjectExpectationLinks() {
        return this._getCollection('projectExpectationLinks');
    },

    getExpectationsForProject(projectId) {
        const links = this.getProjectExpectationLinks().filter(l => l.projectId === projectId);
        return links.map(l => this.getExpectation(l.expectationId)).filter(Boolean);
    },

    linkExpectationToProject(expectationId, projectId) {
        const links = this.getProjectExpectationLinks();
        if (!links.find(l => l.expectationId === expectationId && l.projectId === projectId)) {
            links.push({ expectationId, projectId });
            this._saveCollection('projectExpectationLinks', links);
        }
    },

    unlinkExpectationFromProject(expectationId, projectId) {
        const links = this.getProjectExpectationLinks().filter(
            l => !(l.expectationId === expectationId && l.projectId === projectId)
        );
        this._saveCollection('projectExpectationLinks', links);
    },

    // Collected Data
    getCollectedData() {
        return this._getCollection('collectedData');
    },

    getCollectedDataForProject(projectId) {
        return this.getCollectedData().filter(d => d.projectId === projectId);
    },

    saveCollectedData(entry) {
        const data = this.getCollectedData();
        if (entry.id) {
            const idx = data.findIndex(d => d.id === entry.id);
            if (idx !== -1) data[idx] = entry;
        } else {
            entry.id = this._generateId();
            entry.timestamp = new Date().toISOString();
            data.push(entry);
        }
        this._saveCollection('collectedData', data);
        return entry;
    },

    deleteCollectedData(id) {
        const data = this.getCollectedData().filter(d => d.id !== id);
        this._saveCollection('collectedData', data);
    },

    // Utility: Clear all data (for testing)
    clearAll() {
        localStorage.removeItem('organizations');
        localStorage.removeItem('projects');
        localStorage.removeItem('dataSetExpectations');
        localStorage.removeItem('orgProjectLinks');
        localStorage.removeItem('projectExpectationLinks');
        localStorage.removeItem('collectedData');
    }
};
