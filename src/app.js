const express = require('express');
const path = require('path');
require('dotenv').config();
const basicAuth = require('./auth');

const app = express();
const port = process.env.PORT || 3000;

// Apply basic authentication to all routes
app.use(basicAuth);

const BingoGame = require('./game');
const db = require('./database');

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory storage for active games
const activeGames = {};
let nextGameId = 1;

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// API route to create a new game
app.post('/api/games', (req, res) => {
    const { cards, participants } = req.body;

    const numCards = cards || process.env.DEFAULT_CARDS;
    const numParticipants = participants || process.env.DEFAULT_PARTICIPANTS;

    const gameId = nextGameId++;

    const sql = `INSERT INTO games (number_of_cards, number_of_participants) VALUES (?, ?)`;
    db.run(sql, [numCards, numParticipants], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Error creating game in database' });
        }

        const newGame = new BingoGame(numCards, numParticipants);
        newGame.db_id = this.lastID; // Store db id
        activeGames[gameId] = newGame;

        res.status(201).json({
            id: gameId,
            db_id: newGame.db_id,
            board: newGame.board,
            cards: newGame.cards,
            participants: newGame.participants
        });
    });
});

// API route to get a specific game's state
app.get('/api/games/:id', (req, res) => {
    const game = activeGames[req.params.id];
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    res.json({
        id: parseInt(req.params.id),
        db_id: game.db_id,
        board: game.board,
        cards: game.cards,
        participants: game.participants,
        numbersCalled: Array.from(game.numbersCalled),
        winnerInfo: game.winnerInfo
    });
});

// API route to draw a number in a game
app.post('/api/games/:id/draw', (req, res) => {
    const game = activeGames[req.params.id];
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    if (game.winnerInfo) {
        return res.status(400).json({ message: 'Game has already ended.', winnerInfo: game.winnerInfo });
    }

    const drawnNumber = game.drawNumber();
    if (drawnNumber === null) {
        return res.status(400).json({ message: 'No more numbers to draw. Game is a draw.' });
    }

    // Check for a winner
    let winnerFound = false;
    for (let i = 0; i < game.cards; i++) {
        if (game.isWinner(i)) {
            winnerFound = true;
            const winningRow = i;
            game.winnerInfo = {
                winningRow: winningRow,
                timestamp: new Date().toISOString(),
                winners: []
            };

            // Update games table with end_time
            const updateGameSql = `UPDATE games SET end_time = ? WHERE id = ?`;
            db.run(updateGameSql, [game.winnerInfo.timestamp, game.db_id]);

            // Find winners from the participants table and save them to the winners table
            const findWinnersSql = `SELECT name FROM participants WHERE game_id = ? AND card_row_index = ?`;
            db.all(findWinnersSql, [game.db_id, winningRow], (err, rows) => {
                if (err) {
                    console.error("Error finding winners:", err.message);
                    return; // Continue without saving winners if there's an error
                }

                const winnerNames = rows.map(r => r.name);
                game.winnerInfo.winners = winnerNames;

                if (winnerNames.length > 0) {
                    const insertWinnerSql = `INSERT INTO winners (game_id, participant_name, winning_row_index) VALUES (?, ?, ?)`;
                    const stmt = db.prepare(insertWinnerSql);
                    winnerNames.forEach(name => {
                        stmt.run(game.db_id, name, winningRow);
                    });
                    stmt.finalize();
                }
            });

            break; // Stop checking after first winner
        }
    }

    res.json({
        drawnNumber: drawnNumber,
        winnerInfo: game.winnerInfo
    });
});

// API route to set participant names for a game
app.post('/api/games/:id/participants', (req, res) => {
    const game = activeGames[req.params.id];
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const { participants } = req.body; // Expected format: [{ name: 'Player1', rowIndex: 0 }, ...]
    if (!participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Invalid participants data' });
    }

    const sql = `INSERT INTO participants (game_id, name, card_row_index) VALUES (?, ?, ?)`;
    const db_id = game.db_id;

    db.serialize(() => {
        const stmt = db.prepare(sql);
        let errorOccurred = false;
        participants.forEach(p => {
            stmt.run(db_id, p.name, p.rowIndex, (err) => {
                if (err) {
                    errorOccurred = true;
                    console.error('Error inserting participant:', err.message);
                }
            });
        });
        stmt.finalize((err) => {
            if (err || errorOccurred) {
                return res.status(500).json({ error: 'Failed to save all participants.' });
            }
            res.status(200).json({ message: 'Participants saved successfully.' });
        });
    });
});


// --- History and Winners API Routes ---

// GET all game history
app.get('/api/history', (req, res) => {
    const sql = `SELECT id, start_time, end_time, number_of_cards, number_of_participants FROM games ORDER BY start_time DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET all winners
app.get('/api/winners', (req, res) => {
    const sql = `SELECT * FROM winners ORDER BY timestamp DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});


// Configurar ruta para la vista principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

app.listen(port, () => {
    console.log(`Bingo app listening at http://localhost:${port}`);
});
