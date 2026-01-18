
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TetrominoType, Point, Piece, GameStatus, Whisper } from './types';
import { COLS, ROWS, SHAPES, COLORS, INITIAL_DROP_SPEED, MIN_DROP_SPEED } from './constants';
import { getHorrorWhisper, speakWhisper } from './services/geminiService';

const App: React.FC = () => {
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill('')));
  const [activePiece, setActivePiece] = useState<Piece | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>(TetrominoType.T);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [status, setStatus] = useState<GameStatus>('START');
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [insanity, setInsanity] = useState(0); // 0 to 100 scale

  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const dropCounterRef = useRef<number>(0);

  const createPiece = useCallback((type: TetrominoType): Piece => {
    return {
      pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
      shape: SHAPES[type],
      color: COLORS[type],
      type,
    };
  }, []);

  const getRandomType = useCallback((): TetrominoType => {
    const types = Object.values(TetrominoType).filter(t => t !== TetrominoType.GLITCH);
    // 5% chance of glitch piece at insanity > 30
    if (insanity > 30 && Math.random() < 0.05) return TetrominoType.GLITCH;
    return types[Math.floor(Math.random() * types.length)];
  }, [insanity]);

  const startGame = () => {
    setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill('')));
    setScore(0);
    setLevel(1);
    setLines(0);
    setInsanity(0);
    setWhispers([]);
    const firstType = getRandomType();
    setActivePiece(createPiece(firstType));
    setNextPieceType(getRandomType());
    setStatus('PLAYING');
    
    // Initial creepy whisper
    triggerWhisper(0, 1);
  };

  const triggerWhisper = async (s: number, l: number) => {
    const text = await getHorrorWhisper(s, l);
    const newWhisper: Whisper = { id: Math.random().toString(), text, timestamp: Date.now() };
    setWhispers(prev => [newWhisper, ...prev].slice(0, 5));
    if (insanity > 20) {
      speakWhisper(text);
    }
  };

  const collision = (p: Piece, g: string[][], move: Point = { x: 0, y: 0 }): boolean => {
    for (let y = 0; y < p.shape.length; y++) {
      for (let x = 0; x < p.shape[y].length; x++) {
        if (p.shape[y][x]) {
          const newX = p.pos.x + x + move.x;
          const newY = p.pos.y + y + move.y;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && g[newY][newX]) return true;
        }
      }
    }
    return false;
  };

  const rotate = (shape: number[][]) => {
    const newShape = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
    return newShape;
  };

  const handleMove = useCallback((dir: Point) => {
    if (!activePiece || status !== 'PLAYING') return;
    if (!collision(activePiece, grid, dir)) {
      setActivePiece({ ...activePiece, pos: { x: activePiece.pos.x + dir.x, y: activePiece.pos.y + dir.y } });
    }
  }, [activePiece, grid, status]);

  const handleRotate = useCallback(() => {
    if (!activePiece || status !== 'PLAYING') return;
    const newShape = rotate(activePiece.shape);
    const rotatedPiece = { ...activePiece, shape: newShape };
    if (!collision(rotatedPiece, grid)) {
      setActivePiece(rotatedPiece);
    }
  }, [activePiece, grid, status]);

  const drop = useCallback(() => {
    if (!activePiece || status !== 'PLAYING') return;
    if (!collision(activePiece, grid, { x: 0, y: 1 })) {
      setActivePiece({ ...activePiece, pos: { x: activePiece.pos.x, y: activePiece.pos.y + 1 } });
    } else {
      // Merge
      const newGrid = grid.map(row => [...row]);
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const gridY = activePiece.pos.y + y;
            const gridX = activePiece.pos.x + x;
            if (gridY >= 0) newGrid[gridY][gridX] = activePiece.color;
          }
        });
      });

      // Clear lines
      let linesCleared = 0;
      const filteredGrid = newGrid.filter(row => {
        const isFull = row.every(cell => cell !== '');
        if (isFull) linesCleared++;
        return !isFull;
      });
      while (filteredGrid.length < ROWS) {
        filteredGrid.unshift(Array(COLS).fill(''));
      }

      if (linesCleared > 0) {
        const newScore = score + (linesCleared * 100 * level);
        const newLines = lines + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;
        setScore(newScore);
        setLines(newLines);
        setLevel(newLevel);
        setInsanity(prev => Math.min(100, prev + (linesCleared * 5)));
        
        if (newLines % 3 === 0) {
           triggerWhisper(newScore, newLevel);
        }
      }

      setGrid(filteredGrid);
      
      // New Piece
      const nextPiece = createPiece(nextPieceType);
      if (collision(nextPiece, filteredGrid)) {
        setStatus('GAMEOVER');
        setActivePiece(null);
      } else {
        setActivePiece(nextPiece);
        setNextPieceType(getRandomType());
      }
    }
  }, [activePiece, grid, score, level, lines, nextPieceType, status, createPiece, getRandomType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'PLAYING') return;
      switch (e.key) {
        case 'ArrowLeft': handleMove({ x: -1, y: 0 }); break;
        case 'ArrowRight': handleMove({ x: 1, y: 0 }); break;
        case 'ArrowDown': drop(); break;
        case 'ArrowUp': handleRotate(); break;
        case ' ': // Hard drop
          let offset = 0;
          while (activePiece && !collision(activePiece, grid, { x: 0, y: offset + 1 })) {
            offset++;
          }
          if (activePiece) {
            setActivePiece({ ...activePiece, pos: { x: activePiece.pos.x, y: activePiece.pos.y + offset } });
            drop();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, handleRotate, drop, activePiece, grid, status]);

  const update = (time: number) => {
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    dropCounterRef.current += deltaTime;
    const currentSpeed = Math.max(MIN_DROP_SPEED, INITIAL_DROP_SPEED - (level * 50));
    
    if (dropCounterRef.current > currentSpeed) {
      drop();
      dropCounterRef.current = 0;
    }

    gameLoopRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    if (status === 'PLAYING') {
      gameLoopRef.current = requestAnimationFrame(update);
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [status, drop]);

  const renderCell = (x: number, y: number) => {
    let color = grid[y][x];
    
    // Check if active piece occupies this cell
    if (activePiece) {
      const pieceY = y - activePiece.pos.y;
      const pieceX = x - activePiece.pos.x;
      if (
        pieceY >= 0 && pieceY < activePiece.shape.length &&
        pieceX >= 0 && pieceX < activePiece.shape[0].length &&
        activePiece.shape[pieceY][pieceX]
      ) {
        color = activePiece.color;
      }
    }

    // Horror visual distortion
    const shouldGlitch = insanity > 50 && Math.random() < 0.02;
    const displayColor = shouldGlitch ? 'bg-red-500 animate-ping' : (color || 'bg-zinc-900/50');

    return (
      <div 
        key={`${x}-${y}`} 
        className={`w-full h-full border border-zinc-800/20 rounded-sm transition-all duration-100 ${displayColor} ${color ? 'shadow-lg' : ''}`}
      />
    );
  };

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden crt-effect">
      {/* Background Horror Ambience */}
      <div className={`absolute inset-0 transition-opacity duration-1000 bg-red-950/20 pointer-events-none vignette`} style={{ opacity: insanity / 100 }} />
      
      {/* Insanity Visual Effects */}
      <div className={`absolute inset-0 pointer-events-none z-40 transition-all duration-500 ${insanity > 70 ? 'backdrop-blur-[1px] invert-[0.05]' : ''}`} />

      <div className="z-10 flex flex-col md:flex-row gap-8 items-start p-4 max-w-5xl w-full">
        {/* Left Side: Stats & Messages */}
        <div className="flex-1 flex flex-col gap-4 w-full md:w-auto order-2 md:order-1">
          <div className="bg-zinc-900/80 p-6 rounded-lg border border-red-900/30 backdrop-blur-md shadow-2xl">
            <h1 className="text-3xl font-black text-red-600 mb-4 tracking-tighter uppercase italic glitch-text">Tetra-Phobia</h1>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Score</span>
                <span className="text-xl font-bold text-zinc-100 font-mono">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Level</span>
                <span className="text-xl font-bold text-red-500 font-mono">{level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Insanity</span>
                <div className="w-2/3 h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
                   <div 
                     className="h-full bg-red-600 transition-all duration-500" 
                     style={{ width: `${insanity}%` }} 
                   />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/90 p-4 rounded-lg border border-zinc-800 min-h-[150px] flex flex-col gap-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold">The Architect's Whispers</span>
            <div className="flex flex-col gap-2 overflow-hidden">
              {whispers.map((w, i) => (
                <p 
                  key={w.id} 
                  className={`text-sm font-serif italic transition-all duration-700 ${i === 0 ? 'text-red-400 opacity-100 scale-100' : 'text-zinc-500 opacity-40 scale-95'}`}
                  style={{ animation: i === 0 ? 'glitch 0.2s 1' : '' }}
                >
                  "{w.text}"
                </p>
              ))}
              {whispers.length === 0 && <p className="text-zinc-700 text-xs font-mono">... silence is deafening ...</p>}
            </div>
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="relative order-1 md:order-2">
           <div className={`grid grid-cols-10 grid-rows-20 w-[300px] h-[600px] bg-zinc-950/50 border-4 border-zinc-800 rounded-md shadow-[0_0_50px_rgba(0,0,0,1)] ${insanity > 80 ? 'animate-[shake_0.5s_infinite]' : ''}`}>
             {Array.from({ length: ROWS }).map((_, y) => 
               Array.from({ length: COLS }).map((_, x) => renderCell(x, y))
             )}
           </div>

           {/* Overlays */}
           {status === 'START' && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-8 text-center">
               <div className="space-y-6">
                 <h2 className="text-4xl font-black text-red-700 animate-pulse tracking-tighter">THE VOID AWAITS</h2>
                 <p className="text-zinc-500 text-sm font-mono uppercase">Your failure is pre-ordained.</p>
                 <button 
                   onClick={startGame}
                   className="px-8 py-3 bg-red-900 text-white font-black hover:bg-red-700 transition-all hover:tracking-widest rounded uppercase shadow-[0_0_20px_rgba(153,27,27,0.5)]"
                 >
                   Enter The Matrix
                 </button>
               </div>
             </div>
           )}

           {status === 'GAMEOVER' && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/90 backdrop-blur-md p-8 text-center animate-in fade-in duration-1000">
               <div className="space-y-6">
                 <h2 className="text-5xl font-black text-white tracking-tighter">YOU DECAYED</h2>
                 <div className="bg-black/50 p-4 rounded border border-white/10 font-mono">
                   <p className="text-zinc-400 text-xs">FINAL SCORE</p>
                   <p className="text-3xl text-white">{score.toLocaleString()}</p>
                 </div>
                 <button 
                   onClick={startGame}
                   className="px-8 py-3 bg-white text-black font-black hover:bg-zinc-200 transition-all rounded uppercase"
                 >
                   Try To Escape Again
                 </button>
               </div>
             </div>
           )}
        </div>

        {/* Right Side: Next Piece & Help */}
        <div className="flex-1 flex flex-col gap-4 order-3 w-full md:w-auto">
          <div className="bg-zinc-900/80 p-6 rounded-lg border border-zinc-800 backdrop-blur-md">
            <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest block mb-4">Upcoming Piece</span>
            <div className="flex items-center justify-center h-24">
              <div className="grid grid-cols-4 grid-rows-4 gap-1">
                {SHAPES[nextPieceType].map((row, y) => 
                  row.map((val, x) => (
                    <div 
                      key={`next-${x}-${y}`} 
                      className={`w-4 h-4 rounded-sm ${val ? COLORS[nextPieceType] : 'bg-transparent'}`} 
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/50 p-4 rounded border border-zinc-800 text-[10px] font-mono text-zinc-500 space-y-2 uppercase">
             <div className="flex justify-between"><span>Rotate</span> <span className="text-zinc-300">UP</span></div>
             <div className="flex justify-between"><span>Move</span> <span className="text-zinc-300">Arrows</span></div>
             <div className="flex justify-between"><span>Soft Drop</span> <span className="text-zinc-300">DOWN</span></div>
             <div className="flex justify-between"><span>Hard Drop</span> <span className="text-zinc-300">SPACE</span></div>
          </div>
          
          <div className="mt-auto p-4 border border-red-950/30 rounded bg-red-950/10">
             <p className="text-[9px] text-red-900/70 font-mono leading-tight">
               WARNING: Prolonged exposure to The Architect may cause digital psychosis.
             </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
