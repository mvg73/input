// validation.js - Data validation logic

const Validation = {
    /**
     * Validate a single value against column rules
     * @param {*} value - The value to validate
     * @param {Object} column - Column definition { name, nullsOk, mustBeInt }
     * @returns {Object} - { valid: boolean, error: string|null }
     */
    validateValue(value, column) {
        const trimmedValue = String(value).trim();

        // Check for null/empty
        if (trimmedValue === '' || trimmedValue === null || trimmedValue === undefined) {
            if (!column.nullsOk) {
                return {
                    valid: false,
                    error: `"${column.name}" cannot be empty. Please enter a value.`
                };
            }
            return { valid: true, error: null };
        }

        // Check for integer if required
        if (column.mustBeInt) {
            // Must be a valid integer (no decimals, no letters)
            const intRegex = /^-?\d+$/;
            if (!intRegex.test(trimmedValue)) {
                return {
                    valid: false,
                    error: `"${column.name}" must be a whole number (integer). You entered "${value}" which is not valid.`
                };
            }
        }

        return { valid: true, error: null };
    },

    /**
     * Validate all data against an expectation's columns
     * @param {Object} data - Key-value pairs of column names to values
     * @param {Array} columns - Array of column definitions
     * @returns {Object} - { valid: boolean, errors: { columnName: errorMessage } }
     */
    validateData(data, columns) {
        const errors = {};
        let valid = true;

        columns.forEach(column => {
            const value = data[column.name];
            const result = this.validateValue(value, column);
            if (!result.valid) {
                valid = false;
                errors[column.name] = result.error;
            }
        });

        return { valid, errors };
    },

    /**
     * Get a friendly description of column requirements
     * @param {Object} column - Column definition
     * @returns {string} - Human-readable requirements
     */
    getColumnRequirements(column) {
        const reqs = [];
        if (!column.nullsOk) {
            reqs.push('Required');
        }
        if (column.mustBeInt) {
            reqs.push('Must be integer');
        }
        return reqs.length > 0 ? reqs.join(', ') : 'Optional';
    }
};
