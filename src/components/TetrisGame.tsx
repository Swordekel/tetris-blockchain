import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { getAudioManager } from '../utils/audio';
import { Volume2, VolumeX } from 'lucide-react';
import { LineClearEffect } from './LineClearEffect';

interface TetrisGameProps {
  selectedSkin: string;
  onGameOver: (score: number) => void;
}

interface Position {
  x: number;
  y: number;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

const SHAPES = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[1, 0, 0], [1, 1, 1]], // L
  [[0, 0, 1], [1, 1, 1]], // J
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
];

// Skin colors based on selected theme
const skinColors: Record<string, string[]> = {
  default: ['#00F0F0', '#F0F000', '#A000F0', '#F0A000', '#00F000', '#F00000', '#0000F0'],
  neon: ['#00FFFF', '#FFFF00', '#FF00FF', '#FF8800', '#00FF00', '#FF0000', '#0088FF'],
  candy: ['#FFB6C1', '#FFE4B5', '#E0BBE4', '#FFA07A', '#98D8C8', '#F6B7D2', '#FFDAB9'],
  galaxy: ['#4B0082', '#8A2BE2', '#9370DB', '#BA55D3', '#DA70D6', '#EE82EE', '#DDA0DD'],
  rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
  gold: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520', '#B8860B', '#CD853F', '#D4AF37'],
  // ZOOTOPIA ARENA - Savanna Sunset Theme
  zootopia: [
    '#E76F51', // Terracotta Red (I piece)
    '#F4A261', // Sandy Orange (O piece) 
    '#E9C46A', // Golden Yellow (T piece)
    '#2A9D8F', // Teal Green (L piece)
    '#264653', // Deep Navy (J piece)
    '#8D5B4C', // Brown Earth (S piece)
    '#D4A373', // Warm Tan (Z piece)
  ],
  // GACHA EXCLUSIVE SKINS
  crystal: ['#E0F7FA', '#80DEEA', '#4DD0E1', '#00BCD4', '#26C6DA', '#00ACC1', '#0097A7'],
  fire: ['#FF5722', '#FF7043', '#FF8A65', '#FFAB91', '#FF6E40', '#FF3D00', '#DD2C00'],
  ocean: ['#006064', '#00838F', '#0097A7', '#00ACC1', '#00BCD4', '#26C6DA', '#4DD0E1'],
  sunset: ['#FF6F00', '#FF8F00', '#FFA000', '#FFB300', '#FFC107', '#FFD54F', '#FFE082'],
  aurora: ['#1A237E', '#4A148C', '#6A1B9A', '#9C27B0', '#AB47BC', '#BA68C8', '#CE93D8'],
  cosmic: ['#000000', '#1E3A8A', '#4338CA', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD'],
};

const SKIN_BACKGROUNDS: Record<string, string> = {
  default: '#1a1a2e',
  neon: '#0a0a14',
  candy: '#ffe4e9',
  galaxy: '#0d0221',
  rainbow: '#1a1a1a',
  gold: '#1c1810',
  // Zootopia Savanna Sunset - Sky gradient (kontras dengan warm blocks)
  zootopia: 'linear-gradient(180deg, #1E88E5 0%, #0D47A1 50%, #1A237E 100%)',
};

const SKIN_GRID_COLORS: Record<string, string> = {
  default: 'rgba(255, 255, 255, 0.05)',
  neon: 'rgba(0, 255, 255, 0.1)',
  candy: 'rgba(255, 182, 193, 0.2)',
  galaxy: 'rgba(138, 43, 226, 0.1)',
  rainbow: 'rgba(255, 255, 255, 0.08)',
  gold: 'rgba(255, 215, 0, 0.1)',
  // Grid dengan warna dark brown agar kontras dengan semua block colors
  zootopia: 'rgba(61, 37, 20, 0.5)',
};

export function TetrisGame({ selectedSkin, onGameOver }: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [lineClearEffects, setLineClearEffects] = useState<Array<{ id: number; lineY: number }>>([]);
  
  const boardRef = useRef<number[][]>(Array(BOARD_HEIGHT).fill(0).map(() => Array(BOARD_WIDTH).fill(0)));
  const currentPieceRef = useRef<{ shape: number[][]; x: number; y: number; color: number } | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const dropIntervalRef = useRef<number>(1000);
  const lastDropTimeRef = useRef<number>(0);

  const colors = skinColors[selectedSkin] || skinColors.default;
  const backgroundColor = SKIN_BACKGROUNDS[selectedSkin] || SKIN_BACKGROUNDS.default;
  const gridColor = SKIN_GRID_COLORS[selectedSkin] || SKIN_GRID_COLORS.default;

  const createPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    return {
      shape: SHAPES[shapeIndex],
      x: Math.floor(BOARD_WIDTH / 2) - 1,
      y: 0,
      color: shapeIndex,
    };
  }, []);

  const checkCollision = useCallback((piece: typeof currentPieceRef.current, offsetX = 0, offsetY = 0) => {
    if (!piece) return true;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX;
          const newY = piece.y + y + offsetY;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          
          if (newY >= 0 && boardRef.current[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const drawBlock = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, colorIndex: number) => {
    const color = colors[colorIndex % colors.length];
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;
    
    // Zootopia theme - SIMPLE SOLID COLOR TANPA GRADIENT PUTIH/HITAM
    if (selectedSkin === 'zootopia') {
      // Main block color SOLID (tidak ada gradient putih/hitam)
      ctx.fillStyle = color;
      ctx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
      
      // Simple border saja
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 0.5, py + 0.5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
    } else {
      // Simple block style for other themes
      ctx.fillStyle = color;
      ctx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
      
      // Border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
    }
  }, [colors, selectedSkin]);

  const drawBoard = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas with background
    if (selectedSkin === 'zootopia') {
      // Create sky blue gradient for Zootopia
      const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT * BLOCK_SIZE);
      gradient.addColorStop(0, '#1E88E5');    // Light blue (top)
      gradient.addColorStop(0.5, '#0D47A1');  // Medium blue (middle)
      gradient.addColorStop(1, '#1A237E');    // Dark blue (bottom)
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, BOARD_WIDTH * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, BOARD_WIDTH * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
    }

    // Draw board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (boardRef.current[y][x]) {
          drawBlock(ctx, x, y, boardRef.current[y][x] - 1);
        }
      }
    }

    // Draw ghost piece (preview)
    if (currentPieceRef.current) {
      let ghostY = currentPieceRef.current.y;
      while (!checkCollision(currentPieceRef.current, 0, ghostY - currentPieceRef.current.y + 1)) {
        ghostY++;
      }
      
      const { shape, x: px, color } = currentPieceRef.current;
      const ghostColor = colors[color % colors.length];
      
      // Draw ghost piece dengan outline saja untuk Zootopia (tidak pakai fill)
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const gx = (px + x) * BLOCK_SIZE;
            const gy = (ghostY + y) * BLOCK_SIZE;
            
            if (selectedSkin === 'zootopia') {
              // Ghost piece outline only - tidak ada fill putih/hitam
              ctx.strokeStyle = ghostColor;
              ctx.lineWidth = 2;
              ctx.globalAlpha = 0.5;
              ctx.strokeRect(gx + 2, gy + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
              ctx.globalAlpha = 1.0;
            } else {
              // Default ghost piece untuk skin lain
              ctx.globalAlpha = 0.3;
              drawBlock(ctx, px + x, ghostY + y, color);
              ctx.globalAlpha = 1.0;
            }
          }
        }
      }
    }

    // Draw current piece
    if (currentPieceRef.current) {
      const { shape, x: px, y: py, color } = currentPieceRef.current;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            drawBlock(ctx, px + x, py + y, color);
          }
        }
      }
    }

    // Draw grid
    ctx.strokeStyle = gridColor;
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK_SIZE);
      ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK_SIZE, 0);
      ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
      ctx.stroke();
    }
  }, [drawBlock, checkCollision, backgroundColor, gridColor]);

  const mergePiece = useCallback(() => {
    if (!currentPieceRef.current) return;
    
    const { shape, x, y, color } = currentPieceRef.current;
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) {
          boardRef.current[y + py][x + px] = color + 1;
        }
      }
    }
  }, []);

  const clearLines = useCallback(() => {
    let linesCleared = 0;
    const clearedLineYPositions: number[] = [];
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (boardRef.current[y].every(cell => cell !== 0)) {
        clearedLineYPositions.push(y);
        boardRef.current.splice(y, 1);
        boardRef.current.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        y++;
      }
    }
    
    if (linesCleared > 0) {
      console.log('🎆 Lines cleared:', linesCleared, 'at positions:', clearedLineYPositions);
      
      setLines(prev => prev + linesCleared);
      setScore(prev => prev + linesCleared * 100 * linesCleared);
      
      // Play sound effect based on lines cleared
      const audio = getAudioManager();
      if (linesCleared === 4) {
        audio.playTetrisSound(); // Special sound for Tetris!
      } else {
        audio.playLineClearSound(linesCleared);
      }
      
      // Increase difficulty
      dropIntervalRef.current = Math.max(100, 1000 - lines * 10);
      
      // Add line clear effects for each cleared line
      const newEffects = clearedLineYPositions.map((lineY, i) => ({ 
        id: Date.now() + i, 
        lineY 
      }));
      
      console.log('✨ Adding line clear effects:', newEffects);
      
      setLineClearEffects(prev => [...prev, ...newEffects]);
    }
  }, [lines]);

  const rotatePiece = useCallback(() => {
    if (!currentPieceRef.current) return;
    
    const rotated = currentPieceRef.current.shape[0].map((_, i) =>
      currentPieceRef.current!.shape.map(row => row[i]).reverse()
    );
    
    const newPiece = { ...currentPieceRef.current, shape: rotated };
    
    if (!checkCollision(newPiece)) {
      currentPieceRef.current = newPiece;
      getAudioManager().playRotateSound();
    }
  }, [checkCollision]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPieceRef.current) return false;
    
    if (!checkCollision(currentPieceRef.current, dx, dy)) {
      currentPieceRef.current.x += dx;
      currentPieceRef.current.y += dy;
      if (dx !== 0) {
        getAudioManager().playMoveSound();
      }
      return true;
    }
    return false;
  }, [checkCollision]);

  const dropPiece = useCallback(() => {
    if (!movePiece(0, 1)) {
      getAudioManager().playDropSound();
      mergePiece();
      clearLines();
      
      currentPieceRef.current = createPiece();
      
      if (checkCollision(currentPieceRef.current)) {
        setGameOver(true);
        setIsPlaying(false);
        getAudioManager().playGameOverSound();
        getAudioManager().stopBackgroundMusic();
        onGameOver(score);
      }
    }
  }, [movePiece, mergePiece, clearLines, createPiece, checkCollision, score, onGameOver]);

  const hardDrop = useCallback(() => {
    while (movePiece(0, 1)) {
      setScore(prev => prev + 2);
    }
    dropPiece();
  }, [movePiece, dropPiece]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused || gameOver) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
          movePiece(1, 0);
          break;
        case 'ArrowDown':
          dropPiece();
          setScore(prev => prev + 1);
          break;
        case 'ArrowUp':
        case ' ':
          rotatePiece();
          break;
        case 'Enter':
          hardDrop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, isPaused, gameOver, movePiece, dropPiece, rotatePiece, hardDrop]);

  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;

    const gameLoop = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (timestamp - lastDropTimeRef.current > dropIntervalRef.current) {
        dropPiece();
        lastDropTimeRef.current = timestamp;
      }

      drawBoard(ctx);
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, isPaused, gameOver, dropPiece, drawBoard]);

  const startGame = () => {
    boardRef.current = Array(BOARD_HEIGHT).fill(0).map(() => Array(BOARD_WIDTH).fill(0));
    currentPieceRef.current = createPiece();
    setScore(0);
    setLines(0);
    setGameOver(false);
    setIsPlaying(true);
    setIsPaused(false);
    lastDropTimeRef.current = 0;
    dropIntervalRef.current = 1000;
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-sm text-white/60 mb-1">Active Theme</div>
        <div className="text-lg capitalize">{selectedSkin}</div>
      </div>
      
      <div className="flex gap-8 items-start flex-wrap justify-center">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={BOARD_WIDTH * BLOCK_SIZE}
              height={BOARD_HEIGHT * BLOCK_SIZE}
              className={`rounded-lg shadow-2xl ${
                selectedSkin === 'zootopia' 
                  ? 'border-4 border-orange-400/70' 
                  : 'border-4 border-white/20'
              }`}
              style={
                selectedSkin === 'zootopia'
                  ? {
                      boxShadow: '0 0 30px rgba(247,127,0,0.4), 0 20px 50px rgba(214,40,40,0.3)',
                    }
                  : undefined
              }
            />
            
            {/* Line Clear Effects Overlay */}
            {lineClearEffects.map(effect => (
              <div
                key={effect.id}
                className="absolute top-0 left-0 z-50"
                style={{
                  width: BOARD_WIDTH * BLOCK_SIZE,
                  height: BOARD_HEIGHT * BLOCK_SIZE,
                  pointerEvents: 'none',
                }}
              >
                <LineClearEffect
                  skin={selectedSkin}
                  lineY={effect.lineY}
                  canvasWidth={BOARD_WIDTH * BLOCK_SIZE}
                  canvasHeight={BOARD_HEIGHT * BLOCK_SIZE}
                  blockSize={BLOCK_SIZE}
                  onComplete={() => {
                    setLineClearEffects(prev => prev.filter(e => e.id !== effect.id));
                  }}
                />
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 justify-center">
            {!isPlaying ? (
              <Button onClick={startGame} size="lg">
                {gameOver ? 'Play Again' : 'Start Game'}
              </Button>
            ) : (
              <Button onClick={togglePause} size="lg" variant="outline">
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-[200px]">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-sm text-white/60 mb-1">Score</div>
            <div className="text-3xl">{score}</div>
          </div>
          
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-sm text-white/60 mb-1">Lines</div>
            <div className="text-3xl">{lines}</div>
          </div>

          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="text-sm text-white/60 mb-2">Controls</div>
            <div className="text-xs space-y-1 text-white/80">
              <div>← → Move</div>
              <div>↑ / Space: Rotate</div>
              <div>↓ Soft Drop</div>
              <div>Enter: Hard Drop</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}