import { useState, useEffect } from 'react'
import './App.css'

const pad = (num: number) => num.toString().padStart(2, '0')

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${pad(min)}:${pad(sec)}`
}

type Cell = {
  isMine: boolean;
  revealed: boolean;
  adjacentMines: number;
  flagged: boolean;
};

type Difficulty = 'fácil' | 'médio' | 'difícil';

function getSettings(difficulty: Difficulty) {
  switch (difficulty) {
    case 'médio':
      return { gridSize: 15, minesCount: 40 };
    case 'difícil':
      return { gridSize: 20, minesCount: 80 };
    case 'fácil':
    default:
      return { gridSize: 10, minesCount: 15 };
  }
}

function generateGrid(gridSize: number, minesCount: number, excludeX?: number, excludeY?: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({
      isMine: false,
      revealed: false,
      adjacentMines: 0,
      flagged: false,
    }))
  );

  let minesPlaced = 0;
  while (minesPlaced < minesCount) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);

    if (
      !grid[x][y].isMine &&
      (excludeX === undefined || excludeY === undefined ||
        (Math.abs(x - excludeX) > 1 || Math.abs(y - excludeY) > 1))
    ) {
      grid[x][y].isMine = true;
      minesPlaced++;
    }
  }

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!grid[x][y].isMine) {
        let adjacentMines = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 &&
              nx < gridSize &&
              ny >= 0 &&
              ny < gridSize &&
              grid[nx][ny].isMine
            ) {
              adjacentMines++;
            }
          }
        }
        grid[x][y].adjacentMines = adjacentMines;
      }
    }
  }
  return grid;
}

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>('fácil');
  const { gridSize, minesCount } = getSettings(difficulty);

  const [grid, setGrid] = useState<Cell[][]>(generateGrid(gridSize, minesCount));
  const [gameOver, setGameOver] = useState(false);
  const [firstClick, setFirstClick] = useState(true);
  const [victory, setVictory] = useState(false);
  const [flagsLeft, setFlagsLeft] = useState(minesCount);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && !gameOver && !victory) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameOver, victory]);

  useEffect(() => {
    resetGame();
  }, [difficulty]);

  function revealCell(x: number, y: number) {
    if (gameOver || grid[x][y].revealed || grid[x][y].flagged) return;

    let newGrid = grid.map(row => row.map(cell => ({ ...cell })));

    if (firstClick) {
      newGrid = generateGrid(gridSize, minesCount, x, y);
      setFirstClick(false);
      setTimerActive(true);
      setGrid(newGrid);
    }

    if (newGrid[x][y].isMine) {
      newGrid = newGrid.map(row =>
        row.map(cell => ({
          ...cell,
          revealed: cell.isMine ? true : cell.revealed,
        }))
      );
      setGrid(newGrid);
      setGameOver(true);
      setTimerActive(false);
      alert("Game Over! Você atingiu uma mina.");
      return;
    }

    const reveal = (cx: number, cy: number) => {
      if (
        cx < 0 ||
        cx >= gridSize ||
        cy < 0 ||
        cy >= gridSize ||
        newGrid[cx][cy].revealed ||
        newGrid[cx][cy].flagged
      )
        return;

      newGrid[cx][cy].revealed = true;

      if (newGrid[cx][cy].adjacentMines === 0) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx !== 0 || dy !== 0) {
              reveal(cx + dx, cy + dy);
            }
          }
        }
      }
    };

    reveal(x, y);
    setGrid(newGrid);
    checkWin(newGrid);
  }

  function toggleFlag(x: number, y: number, event: React.MouseEvent) {
    event.preventDefault();
    if (gameOver || grid[x][y].revealed) return;
    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    const cell = newGrid[x][y];
    cell.flagged = !cell.flagged;
    setFlagsLeft(prev => prev + (cell.flagged ? -1 : 1));
    setGrid(newGrid);
  }

  function revealAdjacent(x: number, y: number) {
    if (!grid[x][y].revealed) return;
    let flagCount = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < gridSize &&
          ny >= 0 &&
          ny < gridSize &&
          grid[nx][ny].flagged
        ) {
          flagCount++;
        }
      }
    }
    if (flagCount === grid[x][y].adjacentMines) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < gridSize &&
            ny >= 0 &&
            ny < gridSize &&
            !grid[nx][ny].flagged
          ) {
            revealCell(nx, ny);
          }
        }
      }
    }
  }

  function checkWin(newGrid: Cell[][]) {
    const allSafeRevealed = newGrid.every(row =>
      row.every(cell => cell.isMine || cell.revealed)
    );
    if (allSafeRevealed) {
      setVictory(true);
      setTimerActive(false);
      alert("Parabéns! Você venceu!");
    }
  }

  function resetGame() {
    setGrid(generateGrid(gridSize, minesCount));
    setGameOver(false);
    setVictory(false);
    setFirstClick(true);
    setFlagsLeft(minesCount);
    setTime(0);
    setTimerActive(false);
  }

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-2xl font-bold">Campo Minado</h1>

      <div className="flex gap-4 mt-2">
        {(['fácil', 'médio', 'difícil'] as Difficulty[]).map(level => (
          <button
            key={level}
            onClick={() => setDifficulty(level)}
            className={`px-2 py-1 rounded ${difficulty === level ? 'bg-blue-700 text-white' : 'bg-gray-300'}`}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-6">
        <p className="text-lg">⏱️ Tempo: {formatTime(time)}</p>
        <p className="text-lg">🚩 Bandeiras: {flagsLeft}</p>
      </div>
      <button
        onClick={resetGame}
        className="mt-2 p-2 bg-blue-500 text-white rounded">
        Resetar Jogo
      </button>
      <div
        className="grid gap-1 mt-4 border p-2"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 2.5rem)` }}
      >
        {grid.map((row, x) =>
          row.map((cell, y) => (
            <button
              key={`${x}-${y}`}
              className={`w-10 h-10 flex items-center justify-center border text-lg font-bold
                ${cell.revealed
                  ? cell.isMine
                    ? "bg-red-500 text-white"
                    : "bg-gray-200"
                  : "bg-gray-400 text-white"}
              `}
              onClick={() => revealCell(x, y)}
              onContextMenu={(e) => toggleFlag(x, y, e)}
              onDoubleClick={() => revealAdjacent(x, y)}
              disabled={gameOver || victory}
            >
              {cell.flagged ? "🚩" : cell.revealed && !cell.isMine ? cell.adjacentMines || "" : ""}
            </button>
          ))
        )}
      </div>
      {gameOver && <p className="mt-4 text-red-600">Game Over! Pressione reset para recomeçar.</p>}
      {victory && <p className="mt-4 text-green-600">🎉 Você venceu! Parabéns!</p>}
    </div>
  );
}
