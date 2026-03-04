import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";

const BG_IMAGE = "https://cdn.poehali.dev/projects/1bc32aaf-dada-46ea-b752-420ce3e53085/bucket/77b654eb-c8b2-4250-9e59-bfd74974cb7f.jpg";

const TRAP_OPTIONS = [
  { count: 1, label: "1 ловушка", maxWin: 4.7 },
  { count: 3, label: "3 ловушки", maxWin: 432.4 },
];

const BET_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10];

type CellState = "hidden" | "safe" | "mine";

interface Cell {
  state: CellState;
  isMine: boolean;
}

function generateBoard(mineCount: number): Cell[] {
  const cells: Cell[] = Array(25).fill(null).map(() => ({ state: "hidden", isMine: false }));
  let placed = 0;
  while (placed < mineCount) {
    const idx = Math.floor(Math.random() * 25);
    if (!cells[idx].isMine) {
      cells[idx].isMine = true;
      placed++;
    }
  }
  return cells;
}

export default function Index() {
  const [balance, setBalance] = useState(100);
  const [trapIdx, setTrapIdx] = useState(1);
  const [betIdx, setBetIdx] = useState(1);
  const [gameActive, setGameActive] = useState(false);
  const [board, setBoard] = useState<Cell[]>([]);
  const [safeOpened, setSafeOpened] = useState(0);
  const [gameOver, setGameOver] = useState<null | "win" | "lose">(null);
  const [showHow, setShowHow] = useState(false);
  const [animating, setAnimating] = useState<number | null>(null);

  const trap = TRAP_OPTIONS[trapIdx];
  const bet = BET_STEPS[betIdx];

  const multiplier = useCallback((safe: number, mines: number) => {
    const total = 25;
    let m = 1;
    for (let i = 0; i < safe; i++) {
      m *= (total - mines - i) / (total - i);
    }
    return safe > 0 ? (1 / m) * 0.95 : 1;
  }, []);

  const currentWin = gameActive && safeOpened > 0
    ? (bet * multiplier(safeOpened, trap.count)).toFixed(2)
    : "0.00";

  function startGame() {
    if (balance < bet) return;
    setBalance(prev => parseFloat((prev - bet).toFixed(2)));
    const newBoard = generateBoard(trap.count);
    setBoard(newBoard);
    setSafeOpened(0);
    setGameActive(true);
    setGameOver(null);
  }

  function handleCellClick(idx: number) {
    if (!gameActive || board[idx].state !== "hidden") return;
    setAnimating(idx);
    setTimeout(() => setAnimating(null), 300);

    const newBoard = [...board];
    newBoard[idx] = { ...newBoard[idx], state: newBoard[idx].isMine ? "mine" : "safe" };

    if (newBoard[idx].isMine) {
      // Reveal all mines
      newBoard.forEach((c, i) => {
        if (c.isMine) newBoard[i] = { ...c, state: "mine" };
      });
      setBoard(newBoard);
      setGameActive(false);
      setGameOver("lose");
    } else {
      const newSafe = safeOpened + 1;
      setSafeOpened(newSafe);
      setBoard(newBoard);

      const remaining = newBoard.filter(c => c.state === "hidden" && !c.isMine).length;
      if (remaining === 0) {
        setGameActive(false);
        setGameOver("win");
        const win = parseFloat((bet * multiplier(newSafe, trap.count)).toFixed(2));
        setBalance(prev => parseFloat((prev + win).toFixed(2)));
      }
    }
  }

  function cashOut() {
    if (!gameActive || safeOpened === 0) return;
    const win = parseFloat((bet * multiplier(safeOpened, trap.count)).toFixed(2));
    setBalance(prev => parseFloat((prev + win).toFixed(2)));
    setGameActive(false);
    setGameOver("win");
    const newBoard = board.map(c => c.isMine ? { ...c, state: "mine" as CellState } : c);
    setBoard(newBoard);
  }

  function changeTrap(dir: -1 | 1) {
    if (gameActive) return;
    setTrapIdx(prev => Math.max(0, Math.min(TRAP_OPTIONS.length - 1, prev + dir)));
  }

  function changeBet(dir: -1 | 1) {
    if (gameActive) return;
    setBetIdx(prev => Math.max(0, Math.min(BET_STEPS.length - 1, prev + dir)));
  }

  function getCellStyle(cell: Cell, idx: number) {
    if (cell.state === "safe") return "cell-safe";
    if (cell.state === "mine") return "cell-mine";
    if (animating === idx) return "cell-hidden cell-animating";
    return "cell-hidden";
  }

  return (
    <div className="mines-root">
      {/* Background */}
      <div
        className="mines-bg"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      />
      <div className="mines-overlay" />

      {/* How to play modal */}
      {showHow && (
        <div className="modal-backdrop" onClick={() => setShowHow(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>Как играть</h2>
            <p>1. Выберите количество ловушек (1 или 3)</p>
            <p>2. Установите размер ставки</p>
            <p>3. Нажмите «Играть» — ставка спишется с баланса</p>
            <p>4. Открывайте клетки — избегайте мин!</p>
            <p>5. Заберите выигрыш кнопкой «Забрать» или продолжайте</p>
            <p>6. Попали в мину — ставка сгорает</p>
            <button className="modal-close" onClick={() => setShowHow(false)}>Понятно</button>
          </div>
        </div>
      )}

      <div className="mines-container">
        {/* Header */}
        <div className="mines-header">
          <button className="header-btn" disabled>
            <Icon name="VolumeX" size={18} />
          </button>
          <div className="balance-chip">
            <Icon name="Wallet" size={16} />
            <span>{balance.toFixed(2)} $</span>
          </div>
          <button className="header-btn how-btn" onClick={() => setShowHow(true)}>
            <Icon name="CircleHelp" size={16} />
            <span>Как играть</span>
          </button>
        </div>

        {/* Game result banner */}
        {gameOver === "lose" && (
          <div className="result-banner lose-banner animate-fade-in">
            💥 Мина! Ставка {bet} $ сгорела
          </div>
        )}
        {gameOver === "win" && (
          <div className="result-banner win-banner animate-fade-in">
            🎉 Победа! +{currentWin} $
          </div>
        )}

        {/* Grid container with bg image border */}
        <div className="grid-wrapper">
          <div className="grid-inner">
            {(gameActive || gameOver ? board : Array(25).fill({ state: "hidden", isMine: false })).map((cell, idx) => (
              <button
                key={idx}
                className={`cell ${getCellStyle(cell, idx)}`}
                onClick={() => handleCellClick(idx)}
                disabled={!gameActive || cell.state !== "hidden"}
              >
                {cell.state === "safe" && <span className="cell-icon">💎</span>}
                {cell.state === "mine" && <span className="cell-icon">💣</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom panel */}
        <div className="bottom-panel">
          {/* Trap selector + max win */}
          <div className="trap-row">
            <div className="max-win-block">
              <span className="star-icon">⭐</span>
              <div>
                <div className="max-win-label">Макс. выигрыш</div>
                <div className="max-win-value">{trap.maxWin} $</div>
              </div>
            </div>
            <div className="trap-selector">
              <button
                className="trap-arrow"
                onClick={() => changeTrap(-1)}
                disabled={trapIdx === 0 || gameActive}
              >
                <Icon name="ChevronLeft" size={18} />
              </button>
              <div className="trap-info">
                <span className="trap-count">{trap.count}</span>
                <span className="trap-text">ловушек</span>
              </div>
              <button
                className="trap-arrow"
                onClick={() => changeTrap(1)}
                disabled={trapIdx === TRAP_OPTIONS.length - 1 || gameActive}
              >
                <Icon name="ChevronRight" size={18} />
              </button>
            </div>
          </div>

          {/* Bet selector */}
          <div className="bet-row">
            <button
              className="bet-btn"
              onClick={() => changeBet(-1)}
              disabled={betIdx === 0 || gameActive}
            >
              <Icon name="Minus" size={20} />
            </button>
            <div className="bet-value">
              {bet.toFixed(1)} <span className="bet-dollar">$</span>
            </div>
            <button
              className="bet-btn"
              onClick={() => changeBet(1)}
              disabled={betIdx === BET_STEPS.length - 1 || gameActive}
            >
              <Icon name="Plus" size={20} />
            </button>
          </div>

          {/* Action buttons */}
          {!gameActive ? (
            <button
              className="play-btn"
              onClick={startGame}
              disabled={balance < bet}
            >
              {gameOver ? "Играть снова" : "Играть"}
            </button>
          ) : (
            <button
              className={`cashout-btn ${safeOpened > 0 ? "cashout-active" : ""}`}
              onClick={cashOut}
              disabled={safeOpened === 0}
            >
              Забрать {safeOpened > 0 ? `${currentWin} $` : ""}
            </button>
          )}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .mines-root {
          font-family: 'Rubik', sans-serif;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .mines-bg {
          position: fixed;
          inset: 0;
          background-size: cover;
          background-position: center top;
          background-repeat: no-repeat;
          z-index: 0;
        }

        .mines-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 10, 25, 0.55);
          z-index: 1;
        }

        .mines-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 420px;
          padding: 12px 12px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 100vh;
        }

        /* Header */
        .mines-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }

        .header-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: #cdd6f4;
          border-radius: 10px;
          padding: 8px 10px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Rubik', sans-serif;
          font-size: 13px;
        }

        .header-btn:hover { background: rgba(255,255,255,0.14); }
        .how-btn { font-size: 13px; color: #cdd6f4; }

        .balance-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(0,0,0,0.45);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 8px 16px;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
        }

        /* Result banner */
        .result-banner {
          text-align: center;
          padding: 10px 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
        }

        .lose-banner {
          background: rgba(220, 50, 50, 0.25);
          border: 1px solid rgba(220,50,50,0.5);
          color: #ff6b6b;
        }

        .win-banner {
          background: rgba(50, 200, 100, 0.2);
          border: 1px solid rgba(50,200,100,0.4);
          color: #69db7c;
        }

        /* Grid */
        .grid-wrapper {
          background: rgba(10, 20, 50, 0.6);
          border: 2px solid rgba(100, 180, 255, 0.15);
          border-radius: 20px;
          padding: 10px;
          backdrop-filter: blur(4px);
          box-shadow:
            0 0 40px rgba(0, 120, 255, 0.1),
            inset 0 0 30px rgba(0,0,0,0.3);
        }

        .grid-inner {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 7px;
        }

        /* Cells */
        .cell {
          aspect-ratio: 1;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .cell:active { transform: scale(0.93); }

        .cell-hidden {
          background: linear-gradient(145deg, #3bb8d8 0%, #1a7fa8 40%, #0d5a7a 100%);
          box-shadow:
            0 4px 12px rgba(0,0,0,0.4),
            0 0 8px rgba(59, 184, 216, 0.3),
            inset 0 1px 0 rgba(255,255,255,0.25),
            inset 0 -2px 4px rgba(0,0,0,0.3);
        }

        .cell-hidden:hover:not(:disabled) {
          transform: scale(1.06);
          box-shadow:
            0 6px 18px rgba(0,0,0,0.5),
            0 0 15px rgba(59, 184, 216, 0.5),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .cell-hidden:disabled {
          cursor: default;
          opacity: 0.85;
        }

        .cell-animating {
          animation: cellPop 0.3s ease;
        }

        @keyframes cellPop {
          0% { transform: scale(1); }
          50% { transform: scale(0.85); }
          100% { transform: scale(1); }
        }

        .cell-safe {
          background: linear-gradient(145deg, #2ecc71 0%, #1a9950 100%);
          box-shadow:
            0 4px 14px rgba(46,204,113,0.4),
            inset 0 1px 0 rgba(255,255,255,0.3);
          cursor: default;
        }

        .cell-mine {
          background: linear-gradient(145deg, #e74c3c 0%, #a93226 100%);
          box-shadow:
            0 4px 14px rgba(231,76,60,0.5),
            inset 0 1px 0 rgba(255,255,255,0.2);
          cursor: default;
          animation: mineShake 0.4s ease;
        }

        @keyframes mineShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-5px) rotate(-3deg); }
          40% { transform: translateX(5px) rotate(3deg); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .cell-icon {
          display: block;
          line-height: 1;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }

        /* Bottom panel */
        .bottom-panel {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .trap-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(10, 20, 50, 0.7);
          border: 1px solid rgba(100,180,255,0.12);
          border-radius: 16px;
          padding: 12px 16px;
          gap: 12px;
        }

        .max-win-block {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .star-icon { font-size: 28px; }

        .max-win-label {
          font-size: 11px;
          color: #f59e0b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .max-win-value {
          font-size: 20px;
          font-weight: 800;
          color: #f59e0b;
        }

        .trap-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .trap-arrow {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: #cdd6f4;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .trap-arrow:hover:not(:disabled) { background: rgba(255,255,255,0.16); }
        .trap-arrow:disabled { opacity: 0.35; cursor: default; }

        .trap-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 50px;
        }

        .trap-count {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }

        .trap-text {
          font-size: 11px;
          color: #8899cc;
          font-weight: 500;
        }

        /* Bet row */
        .bet-row {
          display: flex;
          align-items: center;
          background: rgba(10, 20, 50, 0.7);
          border: 1px solid rgba(100,180,255,0.12);
          border-radius: 16px;
          overflow: hidden;
        }

        .bet-btn {
          background: transparent;
          border: none;
          color: #cdd6f4;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 22px;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .bet-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
        .bet-btn:disabled { opacity: 0.35; cursor: default; }

        .bet-value {
          flex: 1;
          text-align: center;
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          border-left: 1px solid rgba(255,255,255,0.08);
          border-right: 1px solid rgba(255,255,255,0.08);
        }

        .bet-dollar {
          font-size: 16px;
          font-weight: 500;
          color: #8899cc;
        }

        /* Play / Cashout buttons */
        .play-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #2980e8 0%, #1565c0 100%);
          border: none;
          border-radius: 16px;
          color: #fff;
          font-family: 'Rubik', sans-serif;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(41,128,232,0.4);
          transition: transform 0.15s, box-shadow 0.15s;
          letter-spacing: 0.3px;
        }

        .play-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(41,128,232,0.55);
        }

        .play-btn:active:not(:disabled) { transform: translateY(0); }
        .play-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .cashout-btn {
          width: 100%;
          padding: 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          color: #8899cc;
          font-family: 'Rubik', sans-serif;
          font-size: 18px;
          font-weight: 700;
          cursor: not-allowed;
          transition: all 0.2s;
        }

        .cashout-active {
          background: linear-gradient(135deg, #27ae60 0%, #1a7a43 100%);
          border: none;
          color: #fff;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(39,174,96,0.4);
        }

        .cashout-active:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(39,174,96,0.55);
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-box {
          background: #0d1b3e;
          border: 1px solid rgba(100,180,255,0.2);
          border-radius: 20px;
          padding: 28px 24px;
          max-width: 340px;
          width: 100%;
          color: #cdd6f4;
        }

        .modal-box h2 {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 16px;
        }

        .modal-box p {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 8px;
          color: #aab8d8;
        }

        .modal-close {
          margin-top: 16px;
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #2980e8 0%, #1565c0 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-family: 'Rubik', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }

        /* Mobile optimizations */
        @media (max-width: 390px) {
          .mines-container { padding: 8px 8px 16px; gap: 8px; }
          .cell { border-radius: 10px; }
          .cell-icon { font-size: 18px; }
          .max-win-value { font-size: 17px; }
          .trap-count { font-size: 19px; }
          .play-btn, .cashout-btn { font-size: 16px; padding: 14px; }
        }

        @media (min-height: 700px) {
          .grid-inner { gap: 8px; }
        }
      `}</style>
    </div>
  );
}
