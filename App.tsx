
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Bullet, Enemy } from './types';
import { 
  COLORS, 
  CANNON_WIDTH, 
  CANNON_HEIGHT, 
  BULLET_SIZE, 
  ENEMY_SIZE, 
  BULLET_SPEED, 
  INITIAL_ENEMY_SPEED, 
  INITIAL_SPAWN_COOLDOWN 
} from './constants';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface MovementInput {
  left: boolean;
  right: boolean;
}

const SHIP_ACCEL = 1.2;
const SHIP_FRICTION = 0.85;
const SHIP_MAX_SPEED = 10;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START_SCREEN);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentAmmoIndex, setCurrentAmmoIndex] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const ammoRef = useRef(0);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // Physics & Position Refs
  const playerXRef = useRef(0);
  const velocityXRef = useRef(0);
  const inputsRef = useRef<MovementInput>({ left: false, right: false });

  const spawnCooldownRef = useRef(INITIAL_SPAWN_COOLDOWN);
  const framesSinceLastSpawnRef = useRef(0);
  const difficultyRef = useRef(1);
  const starsRef = useRef<Star[]>([]);

  // Initialize Stars
  const initStars = useCallback((width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
    starsRef.current = stars;
  }, []);

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color
      });
    }
  };

  const resetGame = () => {
    scoreRef.current = 0;
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    ammoRef.current = 0;
    setCurrentAmmoIndex(0);
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    velocityXRef.current = 0;
    
    if (canvasRef.current) {
        playerXRef.current = canvasRef.current.width / 2 - CANNON_WIDTH / 2;
    }
    spawnCooldownRef.current = INITIAL_SPAWN_COOLDOWN;
    framesSinceLastSpawnRef.current = 0;
    difficultyRef.current = 1;
    setGameState(GameState.PLAYING);
  };

  const resumeFromCrash = () => {
    enemiesRef.current = [];
    bulletsRef.current = [];
    velocityXRef.current = 0;
    setGameState(GameState.PLAYING);
  };

  const togglePause = useCallback(() => {
    setGameState(prev => {
      if (prev === GameState.PLAYING) return GameState.PAUSED;
      if (prev === GameState.PAUSED) return GameState.PLAYING;
      return prev;
    });
  }, []);

  const handleFire = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    bulletsRef.current.push({
      x: playerXRef.current + CANNON_WIDTH / 2 - BULLET_SIZE / 2,
      y: canvas.height - CANNON_HEIGHT - 30,
      width: BULLET_SIZE,
      height: BULLET_SIZE,
      colorIndex: ammoRef.current
    });
  }, [gameState]);

  const cycleAmmo = useCallback((direction: 'next' | 'prev') => {
    setCurrentAmmoIndex(prev => {
      let next = direction === 'next' ? prev + 1 : prev - 1;
      if (next < 0) next = COLORS.length - 1;
      if (next >= COLORS.length) next = 0;
      ammoRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle special states first
      if (gameState === GameState.CRASHED && e.code === 'Space') {
        resumeFromCrash();
        return;
      }
      
      if (gameState === GameState.PAUSED && (e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Space')) {
        setGameState(GameState.PLAYING);
        return;
      }

      // Handle standard gameplay keys
      if (gameState === GameState.PLAYING) {
        switch (e.code) {
          case 'ArrowLeft': inputsRef.current.left = true; break;
          case 'ArrowRight': inputsRef.current.right = true; break;
          case 'KeyA': cycleAmmo('prev'); break;
          case 'KeyS': cycleAmmo('next'); break;
          case 'Space': handleFire(); break;
          case 'KeyP':
          case 'Escape': togglePause(); break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft': inputsRef.current.left = false; break;
        case 'ArrowRight': inputsRef.current.right = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handleFire, cycleAmmo, togglePause]);

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Background: Starfield
    starsRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }
    });

    // VFX: Particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // Skip gameplay updates if not in PLAYING state
    if (gameState !== GameState.PLAYING) return;

    // Smooth Continuous Horizontal Movement
    const inputs = inputsRef.current;
    if (inputs.left) velocityXRef.current -= SHIP_ACCEL;
    if (inputs.right) velocityXRef.current += SHIP_ACCEL;

    // Apply friction
    velocityXRef.current *= SHIP_FRICTION;

    // Clamp speed
    if (velocityXRef.current > SHIP_MAX_SPEED) velocityXRef.current = SHIP_MAX_SPEED;
    if (velocityXRef.current < -SHIP_MAX_SPEED) velocityXRef.current = -SHIP_MAX_SPEED;

    // Apply position
    playerXRef.current += velocityXRef.current;

    // Boundaries
    if (playerXRef.current < 0) {
      playerXRef.current = 0;
      velocityXRef.current = 0;
    } else if (playerXRef.current > canvas.width - CANNON_WIDTH) {
      playerXRef.current = canvas.width - CANNON_WIDTH;
      velocityXRef.current = 0;
    }

    // Spawning logic
    const hits = Math.floor(scoreRef.current / 10);
    let maxEnemies = 2 + Math.floor(hits / 5);
    
    framesSinceLastSpawnRef.current++;
    if (
      framesSinceLastSpawnRef.current >= spawnCooldownRef.current && 
      enemiesRef.current.length < maxEnemies
    ) {
      const colorIndex = Math.floor(Math.random() * COLORS.length);
      enemiesRef.current.push({
        x: Math.random() * (canvas.width - ENEMY_SIZE),
        y: -ENEMY_SIZE,
        width: ENEMY_SIZE,
        height: ENEMY_SIZE,
        colorIndex,
        speed: INITIAL_ENEMY_SPEED * difficultyRef.current
      });
      framesSinceLastSpawnRef.current = 0;
      difficultyRef.current += 0.0015; 
      spawnCooldownRef.current = Math.max(30, INITIAL_SPAWN_COOLDOWN - (difficultyRef.current * 4));
    }

    // Move Bullets
    bulletsRef.current.forEach(b => b.y -= BULLET_SPEED);
    bulletsRef.current = bulletsRef.current.filter(b => b.y + b.height > 0);

    // Move Enemies
    enemiesRef.current.forEach(e => e.y += e.speed);
    
    // Enemy reached bottom
    const reachedBottomIdx = enemiesRef.current.findIndex(e => e.y + e.height >= canvas.height);
    if (reachedBottomIdx !== -1) {
      const enemy = enemiesRef.current[reachedBottomIdx];
      createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffffff');
      
      livesRef.current -= 1;
      setLives(livesRef.current);
      
      if (livesRef.current <= 0) {
        setGameState(GameState.GAME_OVER);
      } else {
        setGameState(GameState.CRASHED);
      }
      return;
    }

    // Collision Detection
    bulletsRef.current.forEach((bullet, bIdx) => {
      enemiesRef.current.forEach((enemy, eIdx) => {
        if (
          bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y
        ) {
          const targetColor = COLORS[enemy.colorIndex];
          if (bullet.colorIndex === targetColor.compIndex) {
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, COLORS[enemy.colorIndex].hex);
            enemiesRef.current.splice(eIdx, 1);
            bulletsRef.current.splice(bIdx, 1);
            scoreRef.current += 10;
            setScore(scoreRef.current);
          }
        }
      });
    });
  }, [gameState]);

  const drawPixelSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, sprite: string[]) => {
    const rows = sprite.length;
    const cols = sprite[0].length;
    const pSize = size / Math.max(rows, cols);
    
    sprite.forEach((row, rowIdx) => {
      row.split('').forEach((pixel, colIdx) => {
        if (pixel === "0") return;
        
        if (pixel === "1") ctx.fillStyle = color; 
        else if (pixel === "2") ctx.fillStyle = color; 
        else if (pixel === "3") ctx.fillStyle = "#ef4444"; 
        else if (pixel === "4") ctx.fillStyle = "#3b82f6"; 
        else if (pixel === "5") ctx.fillStyle = "#ffffff"; 
        
        ctx.fillRect(x + colIdx * pSize, y + rowIdx * pSize, pSize, pSize);
      });
    });
  };

  const drawAlien = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    const sprite = [
      "00500500",
      "00055000",
      "05555550",
      "55055055",
      "55555555",
      "05055050",
      "50000005",
      "05000050"
    ];
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    const pSize = size / 8;
    sprite.forEach((row, rowIdx) => {
      row.split('').forEach((pixel, colIdx) => {
        if (pixel === "5") ctx.fillRect(x + colIdx * pSize, y + rowIdx * pSize, pSize, pSize);
      });
    });
    ctx.shadowBlur = 0;
  };

  const drawShip = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ammoColor: string) => {
    const sprite = [
      "00000200000",
      "00002220000",
      "00002220000",
      "00022222000",
      "00044444000",
      "00444444400",
      "04444144440",
      "44444444444",
      "33000000033",
      "33000000033"
    ];
    drawPixelSprite(ctx, x, y, size, ammoColor, sprite);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Starfield
    ctx.fillStyle = 'white';
    starsRef.current.forEach(star => {
      ctx.globalAlpha = star.speed / 3;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // Draw entities in active gameplay or frozen states
    if (gameState === GameState.PLAYING || gameState === GameState.CRASHED || gameState === GameState.PAUSED) {
      // Bullets
      bulletsRef.current.forEach(b => {
        ctx.fillStyle = COLORS[b.colorIndex].hex;
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS[b.colorIndex].hex;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.shadowBlur = 0;
      });

      // Aliens
      enemiesRef.current.forEach(e => {
        drawAlien(ctx, e.x, e.y, e.width, COLORS[e.colorIndex].hex);
      });

      // Ship
      const shipY = canvas.height - CANNON_HEIGHT - 30;
      drawShip(ctx, playerXRef.current, shipY, CANNON_WIDTH, COLORS[ammoRef.current].hex);
    }
  }, [gameState]);

  const loop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const resize = () => {
      if (canvasRef.current && containerRef.current) {
        const parent = containerRef.current;
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight;
        playerXRef.current = canvasRef.current.width / 2 - CANNON_WIDTH / 2;
        initStars(canvasRef.current.width, canvasRef.current.height);
      }
    };
    
    resize();
    
    window.addEventListener('resize', resize);
    
    // Using requestAnimationFrame to wrap the ResizeObserver callback
    // prevents the 'ResizeObserver loop completed with undelivered notifications' error
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(resize);
    });
    
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => {
        window.removeEventListener('resize', resize);
        observer.disconnect();
    };
  }, [initStars]);

  const setInputState = (key: keyof MovementInput, value: boolean) => {
    inputsRef.current[key] = value;
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono select-none overflow-hidden">
      {/* HUD Header constrained to play area width */}
      <header className="flex justify-center bg-slate-900/50 border-b border-white/10 relative z-20 backdrop-blur-sm shadow-2xl">
        <div className="w-full max-w-[600px] h-16 px-4 flex justify-between items-center">
          <div className="text-2xl font-black tracking-tighter text-blue-500 italic">CHROMA CANNON</div>
          <div className="flex items-center gap-6">
            <div className="flex gap-1 items-center bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {Array.from({ length: 3 }).map((_, i) => (
                <svg 
                  key={i} 
                  className={`w-6 h-6 transition-all duration-300 ${i < lives ? 'text-red-500 fill-red-500 scale-100' : 'text-white/10 fill-white/10 scale-90'}`} 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              ))}
            </div>

            <div className="flex flex-col items-end min-w-[100px]">
              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase leading-none">Score</span>
              <span className="text-xl font-bold text-yellow-400 font-mono leading-none mt-1">{score.toString().padStart(6, '0')}</span>
            </div>

            {gameState === GameState.PLAYING && (
              <button 
                onClick={togglePause}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10"
                title="Pause (P or Esc)"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Play Area */}
      <div className="flex-grow flex justify-center bg-black overflow-hidden border-x border-white/5">
        <main ref={containerRef} className="relative w-full max-w-[600px] h-full overflow-hidden">
          <canvas ref={canvasRef} />

          {/* Ammo Status */}
          {gameState === GameState.PLAYING && (
            <div className="absolute top-4 left-4 p-3 bg-black/60 border border-white/10 rounded-xl flex items-center gap-4 shadow-xl backdrop-blur-md z-10">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-black leading-none">Ammo</span>
                <span className="text-sm font-bold mt-1" style={{ color: COLORS[currentAmmoIndex].hex }}>
                  {COLORS[currentAmmoIndex].name}
                </span>
              </div>
              <div 
                className="w-10 h-10 rounded-lg border-2 border-white/10 shadow-lg transition-colors duration-300"
                style={{ backgroundColor: COLORS[currentAmmoIndex].hex, boxShadow: `0 0 20px ${COLORS[currentAmmoIndex].hex}44` }}
              />
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-black leading-none">Target</span>
                <span className="text-sm font-bold mt-1" style={{ color: COLORS[COLORS[currentAmmoIndex].compIndex].hex }}>
                  {COLORS[COLORS[currentAmmoIndex].compIndex].name}
                </span>
              </div>
            </div>
          )}

          {/* Overlays */}
          {gameState === GameState.START_SCREEN && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-30">
              <h1 className="text-6xl font-black mb-4 text-white tracking-tighter italic drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                CHROMA<span className="text-blue-500">CANNON</span>
              </h1>
              <p className="max-w-md text-slate-300 mb-8 leading-relaxed text-sm">
                Neutralize intruders with their <span className="text-white font-bold underline decoration-blue-500 underline-offset-4">COMPLEMENTARY</span> color. <br/>
                Arrows to Move • A / S Ammo Swap • SPACE Fire
              </p>
              <div className="grid grid-cols-1 gap-2 mb-10 text-[10px] w-full max-w-[280px]">
                 {[[0,1], [2,3], [4,5]].map(([idx1, idx2]) => (
                   <div key={idx1} className="p-2 border border-white/10 rounded-lg bg-white/5 flex flex-col gap-1 items-center">
                      <span className="text-slate-400 font-bold uppercase">{COLORS[idx1].name} / {COLORS[idx2].name}</span>
                      <div className="flex gap-1 h-1.5 w-full">
                        <div className="flex-1 rounded-sm" style={{ backgroundColor: COLORS[idx1].hex }}/>
                        <div className="flex-1 rounded-sm" style={{ backgroundColor: COLORS[idx2].hex }}/>
                      </div>
                   </div>
                 ))}
              </div>
              <button 
                onClick={resetGame}
                className="px-10 py-4 bg-blue-600 hover:bg-blue-500 transition-all rounded-full font-black text-xl shadow-2xl shadow-blue-500/40 active:scale-95 border-b-4 border-blue-800"
              >
                LAUNCH MISSION
              </button>
            </div>
          )}

          {gameState === GameState.PAUSED && (
            <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in duration-300">
              <h2 className="text-7xl font-black mb-2 text-white italic tracking-tighter drop-shadow-lg">PAUSED</h2>
              <div className="bg-black/90 p-8 rounded-3xl border-2 border-blue-500/50 mb-8 shadow-2xl">
                <p className="text-slate-300 text-sm mb-6 uppercase tracking-widest font-bold">Tactical Recalibration</p>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => setGameState(GameState.PLAYING)}
                    className="px-12 py-4 bg-blue-600 text-white hover:bg-blue-500 transition-all rounded-xl font-black text-xl shadow-lg border-b-4 border-blue-800"
                  >
                    RESUME
                  </button>
                  <button 
                    onClick={() => setGameState(GameState.START_SCREEN)}
                    className="px-12 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all rounded-xl font-bold text-sm border border-white/10"
                  >
                    QUIT TO MENU
                  </button>
                </div>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase">Press P or SPACE to Resume</p>
            </div>
          )}

          {gameState === GameState.CRASHED && (
            <div className="absolute inset-0 bg-yellow-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in duration-300">
              <h2 className="text-7xl font-black mb-2 text-white italic tracking-tighter drop-shadow-lg">CRASHED!</h2>
              <p className="text-xl text-yellow-300 mb-8 uppercase tracking-widest font-black">Atmospheric breach detected</p>
              <div className="bg-black/90 p-8 rounded-3xl border-2 border-yellow-500/50 mb-8 shadow-2xl">
                <p className="text-slate-300 text-sm mb-4">Systems damaged, but holding. Aliens are regrouping.</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-slate-500 text-xs font-bold uppercase">Hearts Left:</span>
                  <span className="text-3xl font-black text-red-500">{lives}</span>
                </div>
              </div>
              <button 
                onClick={resumeFromCrash}
                className="px-12 py-5 bg-yellow-500 text-black hover:bg-yellow-400 transition-all rounded-full font-black text-2xl shadow-2xl active:scale-95 border-b-4 border-yellow-700"
              >
                CONTINUE MISSION
              </button>
              <p className="mt-4 text-slate-400 text-[10px] font-bold uppercase">Press SPACE to Resume</p>
            </div>
          )}

          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in duration-500">
              <h2 className="text-6xl font-black mb-2 text-white italic tracking-tighter">FAILURE</h2>
              <div className="bg-black/90 p-6 rounded-2xl border-2 border-red-500/50 mb-8 shadow-2xl">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Mission Results</span>
                <div className="text-5xl font-black text-white">{score}</div>
              </div>
              <button 
                onClick={resetGame}
                className="px-10 py-4 bg-white text-black hover:bg-gray-200 transition-all rounded-full font-black text-xl shadow-2xl active:scale-95"
              >
                RE-TRY
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Controller Controls */}
      <footer className="h-44 bg-slate-950 border-t border-white/10 p-4 flex gap-8 items-center justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.8)] z-20">
        {/* Horizontal Movement Controls */}
        <div className="flex gap-4">
          <button 
            onPointerDown={() => setInputState('left', true)}
            onPointerUp={() => setInputState('left', false)}
            onPointerLeave={() => setInputState('left', false)}
            disabled={gameState !== GameState.PLAYING}
            className={`w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl transition-all active:scale-90 ${gameState !== GameState.PLAYING ? 'opacity-30' : 'active:bg-blue-600'}`}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button 
            onPointerDown={() => setInputState('right', true)}
            onPointerUp={() => setInputState('right', false)}
            onPointerLeave={() => setInputState('right', false)}
            disabled={gameState !== GameState.PLAYING}
            className={`w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl transition-all active:scale-90 ${gameState !== GameState.PLAYING ? 'opacity-30' : 'active:bg-blue-600'}`}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <button 
          onPointerDown={(e) => { 
            e.preventDefault(); 
            if (gameState === GameState.CRASHED) resumeFromCrash();
            else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
            else handleFire(); 
          }}
          className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all border-8 ${
            gameState === GameState.PAUSED || gameState === GameState.CRASHED 
              ? 'bg-yellow-600 border-yellow-700 hover:border-yellow-500' 
              : 'bg-red-600 border-red-700 hover:border-red-500'
          }`}
        >
          <span className="font-black text-xl italic tracking-tighter text-white drop-shadow-md">
            {gameState === GameState.CRASHED || gameState === GameState.PAUSED ? 'RESUME' : 'FIRE'}
          </span>
        </button>

        <div className="flex flex-col gap-2">
           <button 
            onPointerDown={(e) => { e.preventDefault(); cycleAmmo('next'); }}
            disabled={gameState !== GameState.PLAYING}
            className={`w-40 h-20 bg-white/5 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-90 transition-all border border-white/10 px-4 ${gameState !== GameState.PLAYING ? 'opacity-30' : 'active:bg-blue-600'}`}
          >
            <span className="font-black text-xs leading-tight text-left uppercase text-slate-400">Ammo Swap<br/>(A / S)</span>
            <div className="w-10 h-10 rounded-lg shadow-inner border border-white/20" style={{ backgroundColor: COLORS[currentAmmoIndex].hex }} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
