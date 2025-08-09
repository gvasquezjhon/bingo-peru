document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    const state = {
        gameId: null,
        db_id: null,
        board: null,
        cards: 0,
        participants: 0,
        numbersCalled: new Set(),
        winnerInfo: null,
        autoDrawInterval: null,
    };

    // --- DOM ELEMENTS ---
    const setupSection = document.getElementById('game-setup');
    const gameArea = document.getElementById('game-area');
    const newGameBtn = document.getElementById('new-game-btn');
    const cardsInput = document.getElementById('cards-input');
    const participantsInput = document.getElementById('participants-input');
    const boardHeader = document.getElementById('game-board-header');
    const boardBody = document.getElementById('game-board-body');

    // --- HELPERS ---
    function getRandomColor() {
        // Using HSL for more pleasant, less jarring colors
        const h = Math.floor(Math.random() * 360);
        const s = Math.floor(Math.random() * 20 + 70); // Saturation 70-90%
        const l = Math.floor(Math.random() * 20 + 50); // Lightness 50-70%
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    function getTextColorForBg(hslColor) {
        // A simplified method for HSL
        const lightness = parseInt(hslColor.split(',')[2]);
        return (lightness > 60) ? '#000000' : '#FFFFFF';
    }


    // --- RENDER FUNCTIONS ---
    function renderBoard() {
        // Clear previous board
        boardHeader.innerHTML = '';
        boardBody.innerHTML = '';

        const participantColors = Array.from({ length: state.participants }, () => getRandomColor());

        // --- Render Header ---
        const headerRow = document.createElement('tr');

        // Participant headers
        const participantsTh = document.createElement('th');
        participantsTh.textContent = 'Participantes';
        participantsTh.colSpan = state.participants;
        participantsTh.className = 'p-2 border border-slate-600 bg-slate-700';
        headerRow.appendChild(participantsTh);

        // BINGO headers
        ['B', 'I', 'N', 'G', 'O'].forEach(letter => {
            const th = document.createElement('th');
            th.textContent = letter;
            th.className = 'p-2 border border-slate-600 bg-amber-500 text-slate-900 font-bold';
            headerRow.appendChild(th);
        });
        boardHeader.appendChild(headerRow);

        // --- Render Body ---
        for (let i = 0; i < state.cards; i++) {
            const bodyRow = document.createElement('tr');
            bodyRow.className = 'border border-slate-700';

            // Participant cells
            for (let j = 0; j < state.participants; j++) {
                const td = document.createElement('td');
                td.contentEditable = "true";
                const bgColor = participantColors[j];
                const textColor = getTextColorForBg(bgColor);
                td.style.backgroundColor = bgColor;
                td.style.color = textColor;
                td.className = 'p-2 border border-slate-600 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-amber-400';
                td.dataset.rowIndex = i;
                td.dataset.participantIndex = j;
                bodyRow.appendChild(td);
            }

            // BINGO cells
            ['B', 'I', 'N', 'G', 'O'].forEach(letter => {
                const number = state.board[letter][i];
                const td = document.createElement('td');
                td.textContent = number;
                td.id = `cell-${number}`;
                td.className = 'p-2 border border-slate-600 font-mono text-lg';
                bodyRow.appendChild(td);
            });
            boardBody.appendChild(bodyRow);
        }
    }


    // --- API FUNCTIONS ---
    async function startNewGame() {
        const cards = cardsInput.value;
        const participants = participantsInput.value;

        try {
            const response = await fetch('/api/games', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cards: parseInt(cards, 10),
                    participants: parseInt(participants, 10),
                })
            });

            if (response.status === 401) {
                alert('Autenticación fallida. Por favor, refresca la página e inténtalo de nuevo.');
                return;
            }
            if (!response.ok) {
                throw new Error('No se pudo crear la partida.');
            }

            const gameData = await response.json();

            // Update state
            state.gameId = gameData.id;
            state.db_id = gameData.db_id;
            state.board = gameData.board;
            state.cards = gameData.cards;
            state.participants = gameData.participants;

            // Update UI
            setupSection.classList.add('hidden');
            gameArea.classList.remove('hidden');

            // Render the board
            renderBoard();

        } catch (error) {
            console.error('Error al iniciar nueva partida:', error);
            alert('Error: ' + error.message);
        }
    }

    const drawNumberBtn = document.getElementById('draw-number-btn');
    const bolillero = document.getElementById('bolillero');
    const lastNumberDisplay = document.getElementById('last-number-display');
    const winnerOverlay = document.getElementById('winner-overlay');

    // --- RENDER FUNCTIONS (continued) ---
    function updateBolillero(number) {
        const display = number !== null ? number : '-';
        lastNumberDisplay.textContent = display;
        bolillero.textContent = display;

        if (number !== null) {
            bolillero.classList.add('animate-pulse');
            setTimeout(() => bolillero.classList.remove('animate-pulse'), 1000);
        }
    }

    function highlightNumberOnBoard(number) {
        const cell = document.getElementById(`cell-${number}`);
        if (cell) {
            cell.classList.add('bg-amber-400', 'text-slate-900', 'font-bold', 'rounded-lg');
        }
    }

    const winnerText = document.getElementById('winner-text');

    function triggerConfetti() {
        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    }

    function handleWin(winnerInfo) {
        console.log("Winner found!", winnerInfo);
        // Disable controls
        drawNumberBtn.disabled = true;
        document.getElementById('auto-draw-checkbox').disabled = true;
        clearInterval(state.autoDrawInterval);
        state.autoDrawInterval = null;

        // Highlight winning row
        const winningRowIndex = winnerInfo.winningRow;
        const rows = boardBody.getElementsByTagName('tr');
        if(rows[winningRowIndex]) {
            rows[winningRowIndex].classList.add('bg-green-500', 'bg-opacity-50', 'animate-pulse');
        }

        // Show winning animation
        const winnerNames = winnerInfo.winners && winnerInfo.winners.length > 0
            ? winnerInfo.winners.join(', ')
            : 'Fila Ganadora';
        winnerText.innerHTML = `¡BINGO!<br><span class="text-4xl mt-4 block">${winnerNames}</span>`;

        winnerOverlay.classList.remove('hidden');
        triggerConfetti();

        setTimeout(() => {
            winnerOverlay.classList.add('hidden');
        }, 5000); // Hide after 5 seconds
    }

    // --- API FUNCTIONS (continued) ---
    function getParticipantData() {
        const participants = [];
        const cells = boardBody.querySelectorAll('td[contenteditable="true"]');
        cells.forEach(cell => {
            if (cell.textContent.trim() !== '') {
                participants.push({
                    name: cell.textContent.trim(),
                    rowIndex: parseInt(cell.dataset.rowIndex, 10),
                });
            }
        });
        return participants;
    }

    async function saveParticipants() {
        const participants = getParticipantData();
        if (participants.length === 0) {
            state.participantsSaved = true; // No participants to save, proceed.
            return;
        };

        try {
            const response = await fetch(`/api/games/${state.gameId}/participants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participants })
            });
            if (!response.ok) throw new Error('Failed to save participants');
            state.participantsSaved = true;
            console.log('Participants saved.');
        } catch (error) {
            console.error('Error saving participants:', error);
            alert('Could not save participant names. Continuing without saving.');
            state.participantsSaved = true; // Mark as "handled" to not block the game
        }
    }

    const autoDrawCheckbox = document.getElementById('auto-draw-checkbox');

    // --- HELPERS (continued) ---
    function speak(text) {
        // Announce the number in Spanish
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            window.speechSynthesis.speak(utterance);
        }
    }

    // --- API FUNCTIONS (continued) ---
    async function drawNumber() {
        if (state.winnerInfo) return; // Game has ended

        // Save participants on the first draw
        if (!state.participantsSaved) {
            await saveParticipants();
        }

        try {
            drawNumberBtn.disabled = true; // Prevent double clicks during manual draw
            const response = await fetch(`/api/games/${state.gameId}/draw`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to draw number');

            const data = await response.json();

            if (data.drawnNumber) {
                state.numbersCalled.add(data.drawnNumber);
                updateBolillero(data.drawnNumber);
                highlightNumberOnBoard(data.drawnNumber);
                speak(data.drawnNumber.toString()); // Announce the number
            }

            if (data.winnerInfo) {
                state.winnerInfo = data.winnerInfo;
                handleWin(data.winnerInfo);
            }

        } catch (error) {
            console.error('Error drawing number:', error);
            // Stop auto-draw on error
            if (state.autoDrawInterval) {
                autoDrawCheckbox.checked = false;
                clearInterval(state.autoDrawInterval);
                state.autoDrawInterval = null;
            }
        } finally {
            if (!state.winnerInfo && !state.autoDrawInterval) {
                 drawNumberBtn.disabled = false;
            }
        }
    }

    // --- MODAL ELEMENTS & FUNCTIONS ---
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const historyBtn = document.getElementById('history-btn');
    const winnersBtn = document.getElementById('winners-btn');

    function openModal(title, content) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modalContainer.classList.remove('hidden');
    }

    function closeModal() {
        modalContainer.classList.add('hidden');
    }

    function renderHistory(games) {
        if (games.length === 0) {
            return '<p>No hay partidas en el historial.</p>';
        }
        let table = '<table class="w-full text-left border-collapse"><thead><tr><th class="p-2 border-b border-slate-600">ID</th><th class="p-2 border-b border-slate-600">Inicio</th><th class="p-2 border-b border-slate-600">Fin</th><th class="p-2 border-b border-slate-600">Cartones</th><th class="p-2 border-b border-slate-600">Jugadores</th></tr></thead><tbody>';
        games.forEach(game => {
            table += `<tr class="border-t border-slate-700 hover:bg-slate-700">
                <td class="p-2">${game.id}</td>
                <td class="p-2">${new Date(game.start_time).toLocaleString()}</td>
                <td class="p-2">${game.end_time ? new Date(game.end_time).toLocaleString() : 'En curso'}</td>
                <td class="p-2">${game.number_of_cards}</td>
                <td class="p-2">${game.number_of_participants}</td>
            </tr>`;
        });
        table += '</tbody></table>';
        return table;
    }

    function renderWinners(winners) {
        if (winners.length === 0) {
            return '<p>Todavía no hay ganadores registrados.</p>';
        }
        let table = '<table class="w-full text-left border-collapse"><thead><tr><th class="p-2 border-b border-slate-600">Fecha</th><th class="p-2 border-b border-slate-600">Nombre</th><th class="p-2 border-b border-slate-600">Fila Ganadora</th><th class="p-2 border-b border-slate-600">ID Partida</th></tr></thead><tbody>';
        winners.forEach(winner => {
            table += `<tr class="border-t border-slate-700 hover:bg-slate-700">
                <td class="p-2">${new Date(winner.timestamp).toLocaleString()}</td>
                <td class="p-2">${winner.participant_name}</td>
                <td class="p-2">${winner.winning_row_index + 1}</td>
                <td class="p-2">${winner.game_id}</td>
            </tr>`;
        });
        table += '</tbody></table>';
        return table;
    }

    async function showHistory() {
        try {
            const response = await fetch('/api/history');
            if (!response.ok) throw new Error('Failed to fetch history');
            const games = await response.json();
            openModal('Historial de Partidas', renderHistory(games));
        } catch (error) {
            console.error('Error fetching history:', error);
            openModal('Error', '<p>No se pudo cargar el historial.</p>');
        }
    }

    async function showWinners() {
        try {
            const response = await fetch('/api/winners');
            if (!response.ok) throw new Error('Failed to fetch winners');
            const winners = await response.json();
            openModal('Lista de Ganadores', renderWinners(winners));
        } catch (error) {
            console.error('Error fetching winners:', error);
            openModal('Error', '<p>No se pudo cargar la lista de ganadores.</p>');
        }
    }

    // --- EVENT LISTENERS ---
    newGameBtn.addEventListener('click', startNewGame);
    drawNumberBtn.addEventListener('click', drawNumber);
    historyBtn.addEventListener('click', showHistory);
    winnersBtn.addEventListener('click', showWinners);
    modalCloseBtn.addEventListener('click', closeModal);
    modalContainer.addEventListener('click', (e) => {
        // Close modal if clicking on the background overlay
        if (e.target === modalContainer) {
            closeModal();
        }
    });
    autoDrawCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            drawNumberBtn.disabled = true;
            state.autoDrawInterval = setInterval(drawNumber, 3000);
            drawNumber(); // Draw the first one immediately
        } else {
            clearInterval(state.autoDrawInterval);
            state.autoDrawInterval = null;
            if (!state.winnerInfo) {
                drawNumberBtn.disabled = false;
            }
        }
    });
});
