const db = require('../db');

class QueryBuilder {
    constructor(rows) {
        this._rows = rows;
    }
    sort(field) {
        const key = Object.keys(field)[0];
        const dir = field[key];
        this._rows.sort((a, b) => dir === -1 ? b[key] - a[key] : a[key] - b[key]);
        return this;
    }
    limit(n) {
        this._rows = this._rows.slice(0, n);
        return this;
    }
    then(resolve, reject) {
        try { resolve(this._rows); } catch (e) { reject(e); }
    }
}

function rowToUser(row) {
    if (!row) return null;
    return {
        userId: row.userId,
        guildId: row.guildId,
        totalInvites: row.totalInvites,
        focusInvites: row.focusInvites,
        invitedUsers: JSON.parse(row.invitedUsers || '[]'),
        save() {
            db.prepare(`
                INSERT INTO users (userId, guildId, totalInvites, focusInvites, invitedUsers)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(userId, guildId) DO UPDATE SET
                    totalInvites = excluded.totalInvites,
                    focusInvites = excluded.focusInvites,
                    invitedUsers = excluded.invitedUsers
            `).run(this.userId, this.guildId, this.totalInvites, this.focusInvites, JSON.stringify(this.invitedUsers));
        }
    };
}

class UserDB {
    constructor({ userId, guildId }) {
        this.userId = userId;
        this.guildId = guildId;
        this.totalInvites = 0;
        this.focusInvites = 0;
        this.invitedUsers = [];
    }
    save() {
        db.prepare(`
            INSERT INTO users (userId, guildId, totalInvites, focusInvites, invitedUsers)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(userId, guildId) DO UPDATE SET
                totalInvites = excluded.totalInvites,
                focusInvites = excluded.focusInvites,
                invitedUsers = excluded.invitedUsers
        `).run(this.userId, this.guildId, this.totalInvites, this.focusInvites, JSON.stringify(this.invitedUsers));
    }

    static findOne(query = {}) {
        if (query.invitedUsers !== undefined) {
            const memberId = query.invitedUsers;
            const row = db.prepare(`
                SELECT * FROM users WHERE guildId = ?
                AND EXISTS (SELECT 1 FROM json_each(invitedUsers) WHERE value = ?)
            `).get(query.guildId, memberId);
            return rowToUser(row);
        }
        if (query.userId && query.guildId) {
            const row = db.prepare('SELECT * FROM users WHERE userId = ? AND guildId = ?').get(query.userId, query.guildId);
            return rowToUser(row);
        }
        return null;
    }

    static find(query = {}) {
        let rows = db.prepare('SELECT * FROM users WHERE guildId = ?').all(query.guildId);
        if (query.focusInvites && query.focusInvites.$gt !== undefined) {
            rows = rows.filter(r => r.focusInvites > query.focusInvites.$gt);
        }
        if (query.totalInvites && query.totalInvites.$gt !== undefined) {
            rows = rows.filter(r => r.totalInvites > query.totalInvites.$gt);
        }
        return new QueryBuilder(rows.map(rowToUser));
    }

    static updateMany(filter, update) {
        if (update.$set && update.$set.focusInvites === 0) {
            db.prepare('UPDATE users SET focusInvites = 0 WHERE guildId = ?').run(filter.guildId);
        }
    }
}

module.exports = UserDB;
