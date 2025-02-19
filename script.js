const board = document.getElementById('board');
const cells = document.querySelectorAll('[data-cell]');
const status = document.getElementById('status');
const restartButton = document.getElementById('restartButton');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const timerElement = document.getElementById('timer');
const toggleAIButton = document.getElementById('toggleAI');
const toggleTimerButton = document.getElementById('toggleTimer');
const enginePanel = document.getElementById('enginePanel');
const toggleEngineButton = document.getElementById('toggleEngine');
const engineDepthSelect = document.getElementById('engineDepth');
const bestMovesDiv = document.getElementById('bestMoves');
const evaluationDiv = document.getElementById('evaluation');
const evaluationFill = document.querySelector('.evaluation-fill');
const evaluationText = document.querySelector('.evaluation-text');

let currentPlayer = 'x';
let gameActive = true;
let gameState = ['', '', '', '', '', '', '', '', ''];
let scores = { x: 0, o: 0 };
let timerInterval;
let timeLeft = 10;
let isAIMode = false;
let isAITurn = false;
let isTimerEnabled = true;
let engineVisible = false;

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
];

const messages = {
    playerTurn: (player) => `Player ${player.toUpperCase()}'s Turn`,
    win: (player) => `Player ${player.toUpperCase()} Wins! `,
    draw: 'Game Draw! ',
    ai: 'AI is thinking...'
};

function startTimer() {
    if (!isTimerEnabled) return;
    
    clearInterval(timerInterval);
    timeLeft = 10;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft === 0) {
            clearInterval(timerInterval);
            if (gameActive) {
                makeRandomMove();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    timerElement.textContent = isTimerEnabled ? `Time: ${timeLeft}s` : 'Timer: OFF';
}

function makeRandomMove() {
    const emptyCells = gameState.reduce((acc, cell, index) => {
        if (cell === '') acc.push(index);
        return acc;
    }, []);
    
    if (emptyCells.length > 0) {
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        handleCellClick({ target: cells[randomIndex] }, randomIndex);
    }
}

// AI Implementation using Minimax algorithm
function evaluateBoard(board) {
    // Проверяем выигрыш
    const winner = checkWinningMove(board);
    if (winner === 'x') return -100;
    if (winner === 'o') return 100;
    if (board.every(cell => cell !== '')) return 0;

    // Оцениваем позицию
    let score = 0;

    // Проверяем центр (важная позиция)
    if (board[4] === 'o') score += 3;
    if (board[4] === 'x') score -= 3;

    // Проверяем углы
    const corners = [0, 2, 6, 8];
    corners.forEach(corner => {
        if (board[corner] === 'o') score += 2;
        if (board[corner] === 'x') score -= 2;
    });

    // Проверяем возможные линии
    winningCombinations.forEach(line => {
        const [a, b, c] = line;
        const lineStr = board[a] + board[b] + board[c];
        
        // Для O
        if (lineStr.match(/o{2}$/)) score += 10;
        if (lineStr.match(/o{1}$/)) score += 1;
        
        // Для X
        if (lineStr.match(/x{2}$/)) score -= 10;
        if (lineStr.match(/x{1}$/)) score -= 1;
    });

    return score;
}

function minimax(board, depth, alpha, beta, isMaximizing) {
    // Проверяем терминальные состояния
    const winner = checkWinningMove(board);
    if (winner === 'x') return -100;
    if (winner === 'o') return 100;
    if (board.every(cell => cell !== '')) return 0;
    if (depth === 0) return evaluateBoard(board);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < board.length; i++) {
            if (board[i] === '') {
                board[i] = 'o';
                const eval = minimax(board, depth - 1, alpha, beta, false);
                board[i] = '';
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break;
            }
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let i = 0; i < board.length; i++) {
            if (board[i] === '') {
                board[i] = 'x';
                const eval = minimax(board, depth - 1, alpha, beta, true);
                board[i] = '';
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break;
            }
        }
        return minEval;
    }
}

function makeAIMove() {
    let bestScore = -Infinity;
    let bestMove;

    // First move strategy: if player started in corner, take center
    const moveCount = gameState.filter(cell => cell !== '').length;
    if (moveCount === 1) {
        if (gameState[4] === '') {
            bestMove = 4; // Take center if available
        } else {
            // If center taken, take corner
            const corners = [0, 2, 6, 8];
            for (let corner of corners) {
                if (gameState[corner] === '') {
                    bestMove = corner;
                    break;
                }
            }
        }
    } else {
        // Regular minimax with alpha-beta pruning
        for (let i = 0; i < gameState.length; i++) {
            if (gameState[i] === '') {
                gameState[i] = 'o';
                const score = minimax(gameState, 5, -Infinity, Infinity, false);
                gameState[i] = '';
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = i;
                }
            }
        }
    }

    if (bestMove !== undefined) {
        setTimeout(() => {
            handleCellClick({ target: cells[bestMove] }, bestMove);
        }, 500);
    }
}

function checkWinningMove(board) {
    for (const combination of winningCombinations) {
        if (combination.every(index => board[index] === 'x')) return 'x';
        if (combination.every(index => board[index] === 'o')) return 'o';
    }
    
    if (board.every(cell => cell !== '')) return 'draw';
    return null;
}

function handleCellClick(e, index) {
    const cell = e.target;
    
    if (gameState[index] !== '' || !gameActive || (isAIMode && isAITurn)) return;

    clearSuggestions(); // Clear suggestions before making a move
    gameState[index] = currentPlayer;
    cell.classList.add(currentPlayer);
    cell.style.animation = 'appear 0.3s ease-in-out';
    
    if (checkWin()) {
        clearInterval(timerInterval);
        gameActive = false;
        updateScore();
        highlightWinningCombination();
        status.textContent = messages.win(currentPlayer);
        return;
    }

    if (checkDraw()) {
        clearInterval(timerInterval);
        gameActive = false;
        status.textContent = messages.draw;
        return;
    }

    currentPlayer = currentPlayer === 'x' ? 'o' : 'x';
    status.textContent = isAIMode && currentPlayer === 'o' ? messages.ai : messages.playerTurn(currentPlayer);
    
    if (isAIMode && currentPlayer === 'o') {
        isAITurn = true;
        clearInterval(timerInterval);
        setTimeout(() => {
            makeAIMove();
            isAITurn = false;
        }, 500);
    } else {
        startTimer();
    }

    if (engineVisible && gameActive) {
        setTimeout(updateEngineAnalysis, 100);
    }
}

function clearSuggestions() {
    cells.forEach(cell => {
        cell.classList.remove('suggestion-x', 'suggestion-o');
        const scoreElement = cell.querySelector('.suggestion-score');
        if (scoreElement) {
            scoreElement.remove();
        }
    });
}

function displayEngineAnalysis(moves) {
    bestMovesDiv.innerHTML = '';
    clearSuggestions();
    
    // Display top 3 moves
    const topMoves = moves.slice(0, 3);
    topMoves.forEach((move, index) => {
        const moveElement = document.createElement('div');
        moveElement.className = 'move-suggestion';
        
        const position = getCellPosition(move.position);
        const scoreNormalized = Math.tanh(move.score / 100);
        const scorePercentage = ((scoreNormalized + 1) / 2 * 100).toFixed(1);
        
        moveElement.innerHTML = `
            <span>${index + 1}. ${position}</span>
            <span class="move-score">${scorePercentage}%</span>
        `;
        bestMovesDiv.appendChild(moveElement);

        // Add visual suggestion on the board
        const cell = cells[move.position];
        if (!cell.classList.contains('x') && !cell.classList.contains('o')) {
            cell.classList.add(`suggestion-${currentPlayer}`);
            
            // Add score overlay
            const scoreOverlay = document.createElement('div');
            scoreOverlay.className = 'suggestion-score';
            scoreOverlay.textContent = `${scorePercentage}%`;
            cell.appendChild(scoreOverlay);
        }
    });
    
    // Update evaluation bar
    const bestScore = moves[0]?.score || 0;
    const normalizedScore = Math.tanh(bestScore / 100);
    const evaluationPercentage = ((normalizedScore + 1) / 2 * 100).toFixed(1);
    
    evaluationDiv.innerHTML = `
        <div class="evaluation-bar">
            <div class="evaluation-fill" style="width: ${evaluationPercentage}%"></div>
        </div>
        <div style="text-align: center; margin-top: 5px;">
            ${currentPlayer.toUpperCase()} evaluation: ${evaluationPercentage}%
        </div>
    `;
}

toggleAIButton.addEventListener('click', () => {
    isAIMode = !isAIMode;
    toggleAIButton.textContent = isAIMode ? 'Play vs Human' : 'Play vs AI';
    restartGame();
});

toggleTimerButton.addEventListener('click', () => {
    isTimerEnabled = !isTimerEnabled;
    toggleTimerButton.textContent = `Timer: ${isTimerEnabled ? 'ON' : 'OFF'}`;
    
    if (isTimerEnabled) {
        startTimer();
    } else {
        clearInterval(timerInterval);
        updateTimerDisplay();
    }
});

function restartGame() {
    gameActive = true;
    currentPlayer = 'x';
    gameState = ['', '', '', '', '', '', '', '', ''];
    isAITurn = false;
    status.textContent = messages.playerTurn(currentPlayer);
    
    cells.forEach(cell => {
        cell.className = 'cell';
        cell.style.animation = 'none';
    });
    
    clearSuggestions();
    startTimer();
    
    if (engineVisible) {
        updateEngineAnalysis();
    }
}

function checkWin() {
    return winningCombinations.some(combination => {
        return combination.every(index => {
            return gameState[index] === currentPlayer;
        });
    });
}

function checkDraw() {
    return gameState.every(cell => cell !== '');
}

function updateScore() {
    scores[currentPlayer]++;
    if (currentPlayer === 'x') {
        scoreX.textContent = scores.x;
    } else {
        scoreO.textContent = scores.o;
    }
}

function highlightWinningCombination() {
    winningCombinations.forEach(combination => {
        if (combination.every(index => gameState[index] === currentPlayer)) {
            combination.forEach(index => {
                cells[index].classList.add('winning-cell');
            });
        }
    });
}

toggleEngineButton.addEventListener('click', () => {
    engineVisible = !engineVisible;
    enginePanel.classList.toggle('visible');
    toggleEngineButton.textContent = engineVisible ? 'Hide Engine' : 'Show Engine';
    if (engineVisible) {
        updateEngineAnalysis();
    }
});

engineDepthSelect.addEventListener('change', () => {
    if (engineVisible) {
        updateEngineAnalysis();
    }
});

function updateEngineAnalysis() {
    if (!engineVisible) return;

    bestMovesDiv.innerHTML = '';
    clearSuggestions();

    // Получаем ходы как из карты, так и из минимакса
    const mapMoves = getBestMoveFromMap(gameState, currentPlayer);
    const minimaxMoves = findBestMoves(gameState, parseInt(engineDepthSelect.value));

    // Комбинируем результаты, приоритет отдаем карте
    const moves = mapMoves.map(mapMove => {
        const minimaxMove = minimaxMoves.find(m => m.position === mapMove.position);
        return {
            position: mapMove.position,
            score: mapMove.score,
            isFromMap: true,
            minimaxScore: minimaxMove ? minimaxMove.score : 0
        };
    });

    // Сортируем ходы
    moves.sort((a, b) => b.score - a.score);

    // Показываем топ-3 хода
    moves.slice(0, 3).forEach((move, index) => {
        const position = getCellPosition(move.position);
        const moveElement = document.createElement('div');
        moveElement.className = 'move-suggestion';
        
        moveElement.innerHTML = `
            <span>${index + 1}. ${position}</span>
            <span class="move-score">${move.score}%${move.isFromMap ? ' ★' : ''}</span>
        `;
        bestMovesDiv.appendChild(moveElement);

        // Добавляем подсказку на доску
        const cell = cells[move.position];
        if (!cell.classList.contains('x') && !cell.classList.contains('o')) {
            cell.classList.add(`suggestion-${currentPlayer}`);
            
            const scoreOverlay = document.createElement('div');
            scoreOverlay.className = 'suggestion-score';
            scoreOverlay.textContent = `${move.score}%${move.isFromMap ? ' ★' : ''}`;
            cell.appendChild(scoreOverlay);
        }
    });

    // Обновляем оценку позиции
    if (moves.length > 0) {
        const bestScore = moves[0].score;
        evaluationFill.style.width = `${bestScore}%`;
        evaluationText.textContent = `${currentPlayer.toUpperCase()} evaluation: ${bestScore}%`;
    }
}

function getBestMoveFromMap(board, player) {
    // Первый ход
    if (board.every(cell => cell === '')) {
        if (player === 'x') {
            // X начинает с угла
            return [0, 2, 6, 8].map(i => ({ position: i, score: 100 }));
        } else {
            // O начинает с центра
            return [{ position: 4, score: 100 }];
        }
    }

    // Проверяем выигрышный ход
    for (const line of winningCombinations) {
        const [a, b, c] = line;
        const cells = [
            { pos: a, val: board[a] },
            { pos: b, val: board[b] },
            { pos: c, val: board[c] }
        ];
        
        const playerCells = cells.filter(cell => cell.val === player);
        const emptyCells = cells.filter(cell => cell.val === '');
        
        if (playerCells.length === 2 && emptyCells.length === 1) {
            return [{ position: emptyCells[0].pos, score: 100 }];
        }
    }

    // Блокируем выигрыш противника
    const opponent = player === 'x' ? 'o' : 'x';
    for (const line of winningCombinations) {
        const [a, b, c] = line;
        const cells = [
            { pos: a, val: board[a] },
            { pos: b, val: board[b] },
            { pos: c, val: board[c] }
        ];
        
        const opponentCells = cells.filter(cell => cell.val === opponent);
        const emptyCells = cells.filter(cell => cell.val === '');
        
        if (opponentCells.length === 2 && emptyCells.length === 1) {
            return [{ position: emptyCells[0].pos, score: 90 }];
        }
    }

    // Стратегические ходы
    if (player === 'x') {
        // Стратегия для X
        if (board[4] === 'o') {
            // Если O в центре, занимаем противоположный угол
            const corners = [
                [0, 8],
                [2, 6]
            ];
            for (const [a, b] of corners) {
                if (board[a] === 'x' && board[b] === '') {
                    return [{ position: b, score: 85 }];
                }
                if (board[b] === 'x' && board[a] === '') {
                    return [{ position: a, score: 85 }];
                }
            }
        }
        
        // Создаем вилку через углы
        const emptyCorners = [0, 2, 6, 8].filter(i => board[i] === '');
        if (emptyCorners.length > 0) {
            return emptyCorners.map(i => ({ position: i, score: 80 }));
        }
    } else {
        // Стратегия для O
        if (board[4] === '') {
            return [{ position: 4, score: 85 }];
        }
        
        // Защита от вилки
        const corners = [0, 2, 6, 8].filter(i => board[i] === 'x').length;
        if (corners >= 2) {
            const sides = [1, 3, 5, 7].filter(i => board[i] === '');
            if (sides.length > 0) {
                return sides.map(i => ({ position: i, score: 80 }));
            }
        }
    }

    // Если нет лучших ходов, используем минимакс
    const minimaxMoves = findBestMoves(board, 5);
    return minimaxMoves.map(move => ({
        position: move.position,
        score: Math.round((move.score + 100) / 2)
    }));
}

function findBestMoves(board, depth) {
    const moves = [];
    const isMaximizing = currentPlayer === 'o';
    
    // Analyze each possible move
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            board[i] = currentPlayer;
            const score = minimax(board, depth, -Infinity, Infinity, !isMaximizing);
            board[i] = '';
            
            moves.push({
                position: i,
                score: isMaximizing ? score : -score
            });
        }
    }
    
    // Sort moves by score
    moves.sort((a, b) => b.score - a.score);
    return moves;
}

function getCellPosition(index) {
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    return `Row ${row}, Col ${col}`;
}

// Initialize game
cells.forEach((cell, index) => {
    cell.addEventListener('click', (e) => handleCellClick(e, index));
});

restartButton.addEventListener('click', restartGame);
startTimer();

// Initialize game
status.textContent = messages.playerTurn(currentPlayer);
