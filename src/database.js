const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'bingo.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables();
    }
});

function createTables() {
    const createGamesTable = `
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_time DATETIME,
            number_of_cards INTEGER NOT NULL,
            number_of_participants INTEGER NOT NULL
        );
    `;

    const createParticipantsTable = `
        CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            card_row_index INTEGER NOT NULL,
            FOREIGN KEY (game_id) REFERENCES games (id)
        );
    `;

    const createWinnersTable = `
        CREATE TABLE IF NOT EXISTS winners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            participant_name TEXT NOT NULL,
            winning_row_index INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games (id)
        );
    `;

    db.serialize(() => {
        db.run(createGamesTable);
        db.run(createParticipantsTable);
        db.run(createWinnersTable, (err) => {
            if(err) {
                console.error("Error creating tables", err.message);
                return;
            }
            console.log("Tables created or already exist.");
        });
    });
}

module.exports = db;
