const db = require('../db');

const InviteDB = {
    findOneAndUpdate({ code, guildId }, { uses, inviterId }) {
        db.prepare(`
            INSERT INTO invites (code, guildId, uses, inviterId)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(code, guildId) DO UPDATE SET uses = excluded.uses, inviterId = excluded.inviterId
        `).run(code, guildId, uses, inviterId);
    },

    create({ code, guildId, uses, inviterId }) {
        db.prepare(`
            INSERT INTO invites (code, guildId, uses, inviterId)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(code, guildId) DO UPDATE SET uses = excluded.uses, inviterId = excluded.inviterId
        `).run(code, guildId, uses, inviterId);
    },

    deleteOne({ code }) {
        db.prepare('DELETE FROM invites WHERE code = ?').run(code);
    }
};

module.exports = InviteDB;
