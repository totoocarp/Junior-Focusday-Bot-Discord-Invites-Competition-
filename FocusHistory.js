const db = require('../db');

function rowToHistory(row) {
    if (!row) return null;
    const focusDays = JSON.parse(row.focusDays || '[]').map(fd => ({
        ...fd,
        startDate: fd.startDate ? new Date(fd.startDate) : null,
        endDate: fd.endDate ? new Date(fd.endDate) : null,
    }));
    return {
        id: row.id,
        guildId: row.guildId,
        focusDays,
        save() {
            const serialized = this.focusDays.map(fd => ({
                ...fd,
                startDate: fd.startDate ? fd.startDate.toISOString() : null,
                endDate: fd.endDate ? fd.endDate.toISOString() : null,
            }));
            if (this.id) {
                db.prepare('UPDATE focus_history SET focusDays = ? WHERE id = ?').run(JSON.stringify(serialized), this.id);
            } else {
                const result = db.prepare('INSERT INTO focus_history (guildId, focusDays) VALUES (?, ?)').run(this.guildId, JSON.stringify(serialized));
                this.id = result.lastInsertRowid;
            }
        }
    };
}

class FocusHistoryDB {
    constructor({ guildId }) {
        this.id = null;
        this.guildId = guildId;
        this.focusDays = [];
    }
    save() {
        const serialized = this.focusDays.map(fd => ({
            ...fd,
            startDate: fd.startDate ? fd.startDate.toISOString() : null,
            endDate: fd.endDate ? fd.endDate.toISOString() : null,
        }));
        if (this.id) {
            db.prepare('UPDATE focus_history SET focusDays = ? WHERE id = ?').run(JSON.stringify(serialized), this.id);
        } else {
            const result = db.prepare('INSERT INTO focus_history (guildId, focusDays) VALUES (?, ?)').run(this.guildId, JSON.stringify(serialized));
            this.id = result.lastInsertRowid;
        }
    }

    static findOne(query = {}) {
        const row = db.prepare('SELECT * FROM focus_history WHERE guildId = ?').get(query.guildId);
        return rowToHistory(row);
    }
}

module.exports = FocusHistoryDB;
