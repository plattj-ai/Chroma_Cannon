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
  const [showSpeedUp, setShowSpeedUp] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const requestRef = useRef<number>();
  
  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const livesRef = useRef(3);
  const ammoRef = useRef(0);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  const playerXRef = useRef(0);
  const velocityXRef = useRef(0);
  const inputsRef = useRef<MovementInput>({ left: false, right: false });

  const spawnCooldownRef = useRef(INITIAL_SPAWN_COOLDOWN);
  const framesSinceLastSpawnRef = useRef(0);
  const difficultyRef = useRef(1);
  const speedMultiplierRef = useRef(1);
  const starsRef = useRef<Star[]>([]);

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
        x, y,
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
    hitsRef.current = 0;
    livesRef.current = 3;
    setLives(3);
    ammoRef.current = 0;
    setCurrentAmmoIndex(0);
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    velocityXRef.current = 0;
    speedMultiplierRef.current = 1;
    setShowSpeedUp(false);
    
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
      if (gameState === GameState.CRASHED && e.code === 'Space') return resumeFromCrash();
      if (gameState === GameState.PAUSED && (e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Space')) return setGameState(GameState.PLAYING);
      
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

    starsRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
    });

    particlesRef.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    if (gameState !== GameState.PLAYING) return;

    const inputs = inputsRef.current;
    if (inputs.left) velocityXRef.current -= SHIP_ACCEL;
    if (inputs.right) velocityXRef.current += SHIP_ACCEL;
    velocityXRef.current *= SHIP_FRICTION;
    if (velocityXRef.current > SHIP_MAX_SPEED) velocityXRef.current = SHIP_MAX_SPEED;
    if (velocityXRef.current < -SHIP_MAX_SPEED) velocityXRef.current = -SHIP_MAX_SPEED;
    playerXRef.current += velocityXRef.current;

    if (playerXRef.current < 0) { playerXRef.current = 0; velocityXRef.current = 0; }
    else if (playerXRef.current > canvas.width - CANNON_WIDTH) { playerXRef.current = canvas.width - CANNON_WIDTH; velocityXRef.current = 0; }

    framesSinceLastSpawnRef.current++;
    if (framesSinceLastSpawnRef.current >= spawnCooldownRef.current && enemiesRef.current.length < (2 + Math.floor(scoreRef.current / 50))) {
      const colorIndex = Math.floor(Math.random() * COLORS.length);
      enemiesRef.current.push({
        x: Math.random() * (canvas.width - ENEMY_SIZE),
        y: -ENEMY_SIZE,
        width: ENEMY_SIZE, height: ENEMY_SIZE,
        colorIndex,
        // Combined multiplier: frame-based ramp + the 10% jumps per 25 hits
        speed: INITIAL_ENEMY_SPEED * difficultyRef.current * speedMultiplierRef.current
      });
      framesSinceLastSpawnRef.current = 0;
      difficultyRef.current += 0.0015; 
      spawnCooldownRef.current = Math.max(30, INITIAL_SPAWN_COOLDOWN - (difficultyRef.current * 4));
    }

    bulletsRef.current.forEach(b => b.y -= BULLET_SPEED);
    bulletsRef.current = bulletsRef.current.filter(b => b.y + b.height > 0);
    enemiesRef.current.forEach(e => e.y += e.speed);
    
    const reachedBottomIdx = enemiesRef.current.findIndex(e => e.y + e.height >= canvas.height);
    if (reachedBottomIdx !== -1) {
      const enemy = enemiesRef.current[reachedBottomIdx];
      createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffffff');
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) setGameState(GameState.GAME_OVER);
      else setGameState(GameState.CRASHED);
      return;
    }

    bulletsRef.current.forEach((bullet, bIdx) => {
      enemiesRef.current.forEach((enemy, eIdx) => {
        if (bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
          if (bullet.colorIndex === COLORS[enemy.colorIndex].compIndex) {
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, COLORS[enemy.colorIndex].hex);
            enemiesRef.current.splice(eIdx, 1);
            bulletsRef.current.splice(bIdx, 1);
            
            // Score handling
            scoreRef.current += 10;
            setScore(scoreRef.current);
            
            // 25 Hit Difficulty Scaling
            hitsRef.current += 1;
            if (hitsRef.current > 0 && hitsRef.current % 25 === 0) {
              speedMultiplierRef.current *= 1.1; // 10% increase
              setShowSpeedUp(true);
              setTimeout(() => setShowSpeedUp(false), 2000);
              
              // Apply boost to existing enemies immediately
              enemiesRef.current.forEach(e => {
                e.speed *= 1.1;
              });
            }
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
        if (pixel === "1" || pixel === "2") ctx.fillStyle = color; 
        else if (pixel === "3") ctx.fillStyle = "#ef4444"; 
        else if (pixel === "4") ctx.fillStyle = "#3b82f6"; 
        else if (pixel === "5") ctx.fillStyle = "#ffffff"; 
        ctx.fillRect(x + colIdx * pSize, y + rowIdx * pSize, pSize, pSize);
      });
    });
  };

  const drawAlien = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    const sprite = [ "00500500", "00055000", "05555550", "55055055", "55555555", "05055050", "50000005", "05000050" ];
    ctx.shadowBlur = 10; ctx.shadowColor = color; ctx.fillStyle = color;
    const pSize = size / 8;
    sprite.forEach((row, rowIdx) => {
      row.split('').forEach((pixel, colIdx) => {
        if (pixel === "5") ctx.fillRect(x + colIdx * pSize, y + rowIdx * pSize, pSize, pSize);
      });
    });
    ctx.shadowBlur = 0;
  };

  const drawShip = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ammoColor: string) => {
    const sprite = [ "00000200000", "00002220000", "00002220000", "00022222000", "00044444000", "00444444400", "04444144440", "44444444444", "33000000033", "33000000033" ];
    drawPixelSprite(ctx, x, y, size, ammoColor, sprite);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    starsRef.current.forEach(star => {
      ctx.globalAlpha = star.speed / 3; ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    particlesRef.current.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); });
    ctx.globalAlpha = 1.0;

    if (gameState === GameState.PLAYING || gameState === GameState.CRASHED || gameState === GameState.PAUSED) {
      bulletsRef.current.forEach(b => {
        ctx.fillStyle = COLORS[b.colorIndex].hex; ctx.shadowBlur = 10; ctx.shadowColor = COLORS[b.colorIndex].hex;
        ctx.fillRect(b.x, b.y, b.width, b.height); ctx.shadowBlur = 0;
      });
      enemiesRef.current.forEach(e => drawAlien(ctx, e.x, e.y, e.width, COLORS[e.colorIndex].hex));
      drawShip(ctx, playerXRef.current, canvas.height - CANNON_HEIGHT - 30, CANNON_WIDTH, COLORS[ammoRef.current].hex);
    }
  }, [gameState]);

  useEffect(() => {
    const loop = () => { update(); draw(); requestRef.current = requestAnimationFrame(loop); };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update, draw]);

  useEffect(() => {
    const resize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        playerXRef.current = canvasRef.current.width / 2 - CANNON_WIDTH / 2;
        initStars(canvasRef.current.width, canvasRef.current.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    const observer = new ResizeObserver(() => window.requestAnimationFrame(resize));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { window.removeEventListener('resize', resize); observer.disconnect(); };
  }, [initStars]);

  const setInputState = (key: keyof MovementInput, value: boolean) => {
    inputsRef.current[key] = value;
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono select-none overflow-hidden">
      <header className="flex justify-center bg-slate-900/50 border-b border-white/10 relative z-20 backdrop-blur-sm">
        <div className="w-full max-w-[600px] h-16 px-4 flex justify-between items-center">
          <div className="text-xl font-black tracking-tighter text-blue-500 italic">CHROMA CANNON</div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1 items-center bg-white/5 px-2 py-1 rounded-full">
              {Array.from({ length: 3 }).map((_, i) => (
                <svg key={i} className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-white/10 fill-white/10'}`} viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              ))}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-yellow-400">{score.toString().padStart(6, '0')}</div>
            </div>
            {gameState === GameState.PLAYING && (
              <button onClick={togglePause} className="p-2 bg-white/10 rounded-lg"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg></button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-grow flex justify-center bg-black overflow-hidden relative">
        <main ref={containerRef} className="relative w-full max-w-[600px] h-full">
          <canvas ref={canvasRef} />
          
          {/* Speed Up Notification */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 z-40 ${showSpeedUp ? 'opacity-100' : 'opacity-0'}`}>
             <div className="bg-yellow-500 text-black px-8 py-4 rounded-full font-black text-4xl italic tracking-tighter animate-bounce shadow-[0_0_50px_rgba(234,179,8,0.5)]">
               SPEED UP!
             </div>
          </div>

          {gameState === GameState.PLAYING && (
            <div className="absolute top-4 left-4 p-2 bg-black/60 border border-white/10 rounded-xl flex items-center gap-3 backdrop-blur-md z-10">
              <div className="flex flex-col text-[10px]"><span className="text-slate-500 uppercase font-black">Ammo</span><span className="font-bold" style={{ color: COLORS[currentAmmoIndex].hex }}>{COLORS[currentAmmoIndex].name}</span></div>
              <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: COLORS[currentAmmoIndex].hex, boxShadow: `0 0 10px ${COLORS[currentAmmoIndex].hex}` }} />
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col text-[10px]"><span className="text-slate-500 uppercase font-black">Target</span><span className="font-bold" style={{ color: COLORS[COLORS[currentAmmoIndex].compIndex].hex }}>{COLORS[COLORS[currentAmmoIndex].compIndex].name}</span></div>
            </div>
          )}

          {gameState === GameState.START_SCREEN && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-30 overflow-y-auto">
              <div className="my-auto">
                <h1 className="text-5xl font-black mb-4 tracking-tighter italic">CHROMA<span className="text-blue-500">CANNON</span></h1>
                <p className="text-slate-400 mb-8 text-xs uppercase tracking-widest">Destroy targets with COMPLEMENTARY colors</p>
                <button onClick={resetGame} className="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-full font-black text-lg border-b-4 border-blue-800 mb-8">START MISSION</button>
                
                {/* Instructions Panel */}
                <div className="w-full max-w-sm mx-auto bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md text-left shadow-2xl">
                  <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Mission Intelligence</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex gap-1">
                        <span className="px-2 py-1 bg-white/10 rounded text-[9px] border border-white/20">←</span>
                        <span className="px-2 py-1 bg-white/10 rounded text-[9px] border border-white/20">→</span>
                      </div>
                      <div className="text-[11px] leading-tight"><span className="font-bold text-white block uppercase">Navigate</span> <span className="text-slate-400">Move your ship across the defense perimeter.</span></div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="px-3 py-1 bg-white/10 rounded text-[9px] border border-white/20 w-16 text-center">SPACE</span>
                      <div className="text-[11px] leading-tight"><span className="font-bold text-white block uppercase">Engage</span> <span className="text-slate-400">Fire your Chroma Cannon to neutralize threats.</span></div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex gap-1">
                        <span className="px-2 py-1 bg-white/10 rounded text-[9px] border border-white/20">A</span>
                        <span className="px-2 py-1 bg-white/10 rounded text-[9px] border border-white/20">S</span>
                      </div>
                      <div className="text-[11px] leading-tight"><span className="font-bold text-white block uppercase">Modulate</span> <span className="text-slate-400">Swap weapon frequency to match vulnerabilities.</span></div>
                    </div>

                    <div className="pt-4 mt-1 border-t border-white/5 flex flex-col items-center">
                      <span className="font-bold text-white block uppercase mb-3 text-[11px] text-center w-full">Complementary Matching</span>
                      <div className="flex flex-col gap-3 items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-3 rounded-full" style={{ backgroundColor: '#FF0000', boxShadow: '0 0 8px #FF0000' }} />
                          <span className="text-white/20 italic font-black text-[9px]">VS</span>
                          <div className="w-12 h-3 rounded-full" style={{ backgroundColor: '#00FF00', boxShadow: '0 0 8px #00FF00' }} />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-3 rounded-full" style={{ backgroundColor: '#0000FF', boxShadow: '0 0 8px #0000FF' }} />
                          <span className="text-white/20 italic font-black text-[9px]">VS</span>
                          <div className="w-12 h-3 rounded-full" style={{ backgroundColor: '#FFA500', boxShadow: '0 0 8px #FFA500' }} />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-3 rounded-full" style={{ backgroundColor: '#FFFF00', boxShadow: '0 0 8px #FFFF00' }} />
                          <span className="text-white/20 italic font-black text-[9px]">VS</span>
                          <div className="w-12 h-3 rounded-full" style={{ backgroundColor: '#800080', boxShadow: '0 0 8px #800080' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {gameState === GameState.PAUSED && (
            <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
              <h2 className="text-6xl font-black mb-8 italic">PAUSED</h2>
              <div className="bg-black/90 p-8 rounded-3xl border-2 border-blue-500/50 w-full max-w-xs shadow-2xl">
                <button onClick={() => setGameState(GameState.PLAYING)} className="px-12 py-4 bg-blue-600 rounded-xl font-black text-lg border-b-4 border-blue-800 mb-4 w-full">RESUME</button>
                <button onClick={() => setGameState(GameState.START_SCREEN)} className="px-12 py-3 bg-white/5 rounded-xl font-bold text-sm border border-white/10 w-full">EXIT</button>
              </div>
            </div>
          )}

          {gameState === GameState.CRASHED && (
            <div className="absolute inset-0 bg-yellow-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
              <h2 className="text-6xl font-black mb-4 italic">CRASHED!</h2>
              <div className="bg-black/90 p-8 rounded-3xl border-2 border-yellow-500/50 w-full max-w-xs shadow-2xl">
                <p className="text-slate-300 text-sm mb-6 uppercase font-bold">{lives} LIVES LEFT</p>
                <button onClick={resumeFromCrash} className="w-full py-5 bg-yellow-500 text-black rounded-full font-black text-xl border-b-4 border-yellow-700">CONTINUE</button>
              </div>
            </div>
          )}

          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
              <h2 className="text-5xl font-black mb-2 italic">MISSION FAILED</h2>
              <div className="bg-black/90 p-6 rounded-2xl border-2 border-red-500/50 mb-8 shadow-2xl">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Final Score</span>
                <div className="text-4xl font-black">{score}</div>
              </div>
              <button onClick={resetGame} className="px-10 py-4 bg-white text-black rounded-full font-black text-lg">RE-TRY</button>
            </div>
          )}
        </main>
      </div>

      <footer className="h-24 bg-slate-950 border-t border-white/10 p-2 flex gap-4 items-start pt-3 justify-center relative z-20">
        <div className="flex gap-2">
          <button onPointerDown={() => setInputState('left', true)} onPointerUp={() => setInputState('left', false)} onPointerLeave={() => setInputState('left', false)} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center active:bg-blue-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7"/></svg></button>
          <button onPointerDown={() => setInputState('right', true)} onPointerUp={() => setInputState('right', false)} onPointerLeave={() => setInputState('right', false)} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center active:bg-blue-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7"/></svg></button>
        </div>
        <button onPointerDown={(e) => { e.preventDefault(); if (gameState === GameState.CRASHED) resumeFromCrash(); else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING); else handleFire(); }} className={`w-16 h-16 rounded-full font-black text-xs shadow-2xl active:scale-90 transition-all border-4 ${gameState === GameState.PAUSED || gameState === GameState.CRASHED ? 'bg-yellow-600 border-yellow-700' : 'bg-red-600 border-red-700'}`}>
          {gameState === GameState.CRASHED || gameState === GameState.PAUSED ? 'RESUME' : 'FIRE'}
        </button>
        <button onPointerDown={(e) => { e.preventDefault(); cycleAmmo('next'); }} className="w-24 h-12 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-0.5 active:bg-blue-600">
          <span className="text-[8px] text-slate-400 font-bold uppercase">SWAP</span>
          <div className="w-8 h-3 rounded-full" style={{ backgroundColor: COLORS[currentAmmoIndex].hex }} />
        </button>
      </footer>
    </div>
  );
};

export default App;