const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'focusday.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT NOT NULL,
    guildId TEXT NOT NULL,
    totalInvites INTEGER DEFAULT 0,
    focusInvites INTEGER DEFAULT 0,
    invitedUsers TEXT DEFAULT '[]',
    PRIMARY KEY (userId, guildId)
  );

  CREATE TABLE IF NOT EXISTS focusdays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    active INTEGER DEFAULT 0,
    startDate TEXT,
    endDate TEXT,
    reward TEXT DEFAULT 'Ninguno',
    results TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS focus_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    focusDays TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS invites (
    code TEXT NOT NULL,
    guildId TEXT NOT NULL,
    uses INTEGER DEFAULT 0,
    inviterId TEXT NOT NULL,
    PRIMARY KEY (code, guildId)
  );
`);

module.exports = db;
