import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState } from './types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [feverMode, setFeverMode] = useState(false);
  const [perfectStreak, setPerfectStreak] = useState(0);

  // Initialize Game Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(
      canvasRef.current, 
      (newScore) => setScore(newScore),
      (state) => setGameState(state),
      (isFever) => setFeverMode(isFever),
      (streak) => setPerfectStreak(streak)
    );
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize();
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize
    engine.resize();

    // Start loop
    engine.startLoop();

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.cleanup();
    };
  }, []);

  // Update high score when game ends
  useEffect(() => {
    if (gameState === 'gameover') {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('neon_jelly_highscore', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('neon_jelly_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handleRestart = useCallback(() => {
    // We must use startGame to ensure the state machine transitions back to 'playing'
    engineRef.current?.startGame();
  }, []);

  // Global input handler for UI overlay clicks passing through to canvas if needed,
  // but mostly we want UI buttons to intercept.
  
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#1a0b2e] select-none font-sans text-white">
      {/* Game Canvas */}
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
      />

      {/* Score Overlay */}
      {gameState === 'playing' && (
        <div className={`absolute top-[15%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ${feverMode ? 'scale-125 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.8)]' : 'text-white/80'}`}>
          <div className="text-8xl font-black tracking-tighter" style={{ textShadow: '0 0 20px rgba(0,243,255,0.5)' }}>
            {score}
          </div>
          {feverMode && (
            <div className="text-center text-xl font-bold text-yellow-300 animate-pulse tracking-widest mt-2">
              FEVER MODE!
            </div>
          )}
        </div>
      )}

      {/* Perfect Streak Counter */}
      {gameState === 'playing' && perfectStreak > 1 && (
        <div className="absolute top-[28%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
          <div className="flex flex-col items-center animate-bounce">
             <div className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300" 
                  style={{ textShadow: '0 0 20px rgba(0,243,255,0.8)', fontFamily: 'Impact, sans-serif' }}>
                PERFECT x{perfectStreak}
             </div>
             <div className="text-cyan-200 text-sm tracking-widest font-bold uppercase drop-shadow-md">
                Combo
             </div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-8 tracking-tighter drop-shadow-[0_0_15px_rgba(0,243,255,0.5)] text-center px-4">
            NEON JELLY<br/>JUMP
          </h1>
          <p className="text-gray-300 mb-8 text-lg">Tap, Click, or Spacebar to Jump</p>
          <button 
            onClick={handleStart}
            className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-2xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:scale-110 hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] transition-all duration-300 animate-pulse active:scale-95"
          >
            PLAY NOW
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-10 animate-fade-in">
          <h2 className="text-6xl font-black text-red-500 mb-2 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] -rotate-6">
            SHATTERED!
          </h2>
          
          <div className="bg-white/10 p-8 rounded-2xl border border-white/20 backdrop-blur-xl mb-8 flex flex-col items-center min-w-[300px]">
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-1">Final Score</div>
            <div className="text-6xl font-bold text-white mb-6">{score}</div>
            
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Best Score</div>
            <div className="text-2xl font-bold text-cyan-400">{highScore}</div>
          </div>

          <button 
            onClick={handleRestart}
            className="px-12 py-4 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full text-2xl font-bold shadow-[0_0_20px_rgba(219,39,119,0.6)] hover:scale-105 hover:shadow-[0_0_40px_rgba(219,39,119,0.8)] transition-all duration-300 active:scale-95"
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Footer Instructions */}
      <div className="absolute bottom-4 w-full text-center text-white/20 text-xs pointer-events-none">
        Double Jump Enabled • Hit Center for Perfect
      </div>
    </div>
  );
}