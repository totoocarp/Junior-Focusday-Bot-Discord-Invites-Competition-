const db = require('../db');

class SingleQueryBuilder {
    constructor(rows) {
        this._rows = rows;
    }
    sort(field) {
        const key = Object.keys(field)[0];
        const dir = field[key];
        this._rows.sort((a, b) => {
            const aVal = a[key] || '';
            const bVal = b[key] || '';
            if (dir === -1) return bVal > aVal ? 1 : -1;
            return aVal > bVal ? 1 : -1;
        });
        return this;
    }
    then(resolve, reject) {
        try { resolve(rowToFocusDay(this._rows[0] || null)); } catch (e) { reject(e); }
    }
}

function rowToFocusDay(row) {
    if (!row) return null;
    return {
        id: row.id,
        guildId: row.guildId,
        active: row.active === 1,
        startDate: row.startDate ? new Date(row.startDate) : null,
        endDate: row.endDate ? new Date(row.endDate) : null,
        reward: row.reward,
        results: JSON.parse(row.results || '[]'),
        save() {
            db.prepare(`
                UPDATE focusdays SET active = ?, endDate = ?, results = ?
                WHERE id = ?
            `).run(this.active ? 1 : 0, this.endDate ? this.endDate.toISOString() : null, JSON.stringify(this.results), this.id);
        }
    };
}

const FocusDayDB = {
    findOne(query = {}) {
        if (query.active !== undefined) {
            const row = db.prepare('SELECT * FROM focusdays WHERE guildId = ? AND active = ?').get(query.guildId, query.active ? 1 : 0);
            return rowToFocusDay(row);
        }
        // No active filter — return QueryBuilder for chaining .sort()
        const rows = db.prepare('SELECT * FROM focusdays WHERE guildId = ?').all(query.guildId);
        return new SingleQueryBuilder(rows);
    },

    create({ guildId, active, startDate, reward }) {
        db.prepare(`
            INSERT INTO focusdays (guildId, active, startDate, reward)
            VALUES (?, ?, ?, ?)
        `).run(guildId, active ? 1 : 0, startDate ? startDate.toISOString() : null, reward);
    }
};

module.exports = FocusDayDB;
