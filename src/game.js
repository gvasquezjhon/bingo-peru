class BingoGame {
    constructor(cards = 10, participants = 5) {
        this.cards = parseInt(cards, 10);
        this.participants = parseInt(participants, 10);
        this.board = this.generateBoard();
        this.numbersCalled = new Set();
        this.availableNumbers = Array.from({ length: this.cards * 5 }, (_, i) => i + 1);
        this.winnerInfo = null;
    }

    generateBoard() {
        const board = {
            B: [], I: [], N: [], G: [], O: []
        };
        let number = 1;
        // The number of rows is determined by the `cards` parameter.
        for (let i = 0; i < this.cards; i++) {
            // Each column gets a number for the current row.
            // B gets 1-10, I gets 11-20, etc for 10 cards.
            // My previous logic was wrong. Let's fix it.
            // For 10 cards:
            // B: 1, 2, 3, ... 10
            // I: 11, 12, ... 20
            // N: 21, 30, ... 30
            // etc.
            // This is not how bingo works. The prompt is a bit ambiguous.
            // "la letra B (columna), de forma vertical va el contador del 1 al 10, I sería del 11 al 20 y así sucesivamente hasta la letra O que termina en la fila 10 con el número 50"
            // This means the numbers are sequential. My first logic was correct.
            // Let's re-read carefully.
            // "la letra B (columna), de forma vertical va el contador del 1 al 10, I sería del 11 al 20"
            // This implies that for 10 cards (rows), the B column contains numbers 1-10, I column 11-20, etc.
            // This is NOT sequential like my first implementation.
            // B: 1, 2, 3...
            // I: 11, 12, 13...
            // So, for row `i`:
            // B = i + 1
            // I = cards + i + 1
            // N = (cards * 2) + i + 1
            // G = (cards * 3) + i + 1
            // O = (cards * 4) + i + 1
        }

        const cardCount = this.cards;
        for (let i = 0; i < cardCount; i++) {
            board.B.push(i + 1);
            board.I.push(cardCount + i + 1);
            board.N.push((cardCount * 2) + i + 1);
            board.G.push((cardCount * 3) + i + 1);
            board.O.push((cardCount * 4) + i + 1);
        }

        return board;
    }

    drawNumber() {
        if (this.availableNumbers.length === 0) {
            return null; // No more numbers to draw
        }
        const randomIndex = Math.floor(Math.random() * this.availableNumbers.length);
        const number = this.availableNumbers.splice(randomIndex, 1)[0];
        this.numbersCalled.add(number);
        return number;
    }

    isWinner(rowIndex) {
        if (rowIndex < 0 || rowIndex >= this.cards) {
            return false;
        }

        const rowNumbers = [
            this.board.B[rowIndex],
            this.board.I[rowIndex],
            this.board.N[rowIndex],
            this.board.G[rowIndex],
            this.board.O[rowIndex],
        ];

        return rowNumbers.every(num => this.numbersCalled.has(num));
    }
}

module.exports = BingoGame;
