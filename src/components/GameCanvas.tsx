import { useRef, useEffect, useCallback, useState } from 'react';

import { GameLoop } from '../engine/GameLoop';
import { InputManager } from '../engine/InputManager';
import { ForestScene } from '../scenes/ForestScene';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { MathSystem } from '../systems/MathSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { rectsOverlap, centerDistX } from '../systems/CollisionSystem';
import type { MathQuestion, GamePhase } from '../types';

import { HUD } from './HUD';
import { QuestionPanel } from './QuestionPanel';
import { GameOver } from './GameOver';
import { MobileControls } from './MobileControls';

// ─── Constants ────────────────────────────────────────────────────────────────
const GAME_W = 960;
const GAME_H = 540;
const GROUND_Y = GAME_H * 0.74;       // y where the ground surface starts
const INTERACT_DIST = 145;             // px to trigger question prompt

// ─── Component ────────────────────────────────────────────────────────────────
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ── React UI state (triggers re-render only when changed) ──
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);

  // ── Mutable game refs (used inside the RAF loop — never cause re-renders) ──
  const phaseRef = useRef<GamePhase>('playing');
  const inputRef = useRef<InputManager | null>(null);
  const forestRef = useRef<ForestScene | null>(null);
  const playerRef = useRef<Player | null>(null);
  const monstersRef = useRef<Monster[]>([]);
  const mathRef = useRef<MathSystem | null>(null);
  const scoreRef = useRef<ScoreSystem | null>(null);
  const activeMonsterRef = useRef<Monster | null>(null);
  const questionRef = useRef<MathQuestion | null>(null);
  const answerLockedRef = useRef(false);
  const spawnTimerRef = useRef(0);
  const monsterIdRef = useRef(0);
  const gameTimeRef = useRef(0); // seconds elapsed while playing

  // ── Sync helper: write to both ref and state ──
  const syncPhase = useCallback((p: GamePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ─── Answer handling ────────────────────────────────────────────────────────
  const handleAnswer = useCallback(
    (answer: number) => {
      if (answerLockedRef.current) return;
      const q = questionRef.current;
      const math = mathRef.current;
      const sys = scoreRef.current;
      if (!q || !math || !sys) return;

      answerLockedRef.current = true;
      const correct = answer === q.answer;
      setSelectedAnswer(answer);
      setAnswerResult(correct ? 'correct' : 'wrong');

      setTimeout(() => {
        if (correct) {
          activeMonsterRef.current?.hit();
          activeMonsterRef.current = null;
          const pts = math.getPointsForCorrect(sys.level);
          sys.addScore(pts);
          setScore(sys.score);
          setLevel(sys.level);
          math.setMaxFactor(2 + sys.level);
        } else {
          sys.loseLife();
          setLives(sys.lives);
          playerRef.current?.hurt();

          if (sys.isGameOver()) {
            setHighScore(sys.getHighScore());
            questionRef.current = null;
            answerLockedRef.current = false;
            setCurrentQuestion(null);
            setSelectedAnswer(null);
            setAnswerResult(null);
            syncPhase('gameover');
            return;
          }
        }

        questionRef.current = null;
        answerLockedRef.current = false;
        setCurrentQuestion(null);
        setSelectedAnswer(null);
        setAnswerResult(null);
        syncPhase('playing');
      }, 900);
    },
    [syncPhase],
  );

  // ─── Restart ────────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    const player = playerRef.current;
    const sys = scoreRef.current;
    if (!player || !sys) return;

    sys.reset();
    setScore(0);
    setLives(3);
    setLevel(1);

    player.position = { x: 120, y: GROUND_Y - player.size.height };
    player.velocity = { x: 0, y: 0 };
    player.state = 'idle';

    monstersRef.current = [];
    activeMonsterRef.current = null;
    spawnTimerRef.current = 0;
    gameTimeRef.current = 0;
    questionRef.current = null;
    answerLockedRef.current = false;
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setAnswerResult(null);
    syncPhase('playing');
  }, [syncPhase]);

  // ─── Main game loop effect ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    canvas.width = GAME_W;
    canvas.height = GAME_H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Responsive scale: fill viewport while keeping 16:9
    const onResize = () => {
      const sw = wrap.clientWidth / GAME_W;
      const sh = wrap.clientHeight / GAME_H;
      const s = Math.min(sw, sh);
      canvas.style.width = `${GAME_W * s}px`;
      canvas.style.height = `${GAME_H * s}px`;
    };
    onResize();
    window.addEventListener('resize', onResize);

    // ── Initialise systems ──
    const input = new InputManager();
    const forest = new ForestScene();
    const player = new Player(120, GROUND_Y - 48);
    const math = new MathSystem();
    const sys = new ScoreSystem();

    inputRef.current = input;
    forestRef.current = forest;
    playerRef.current = player;
    mathRef.current = math;
    scoreRef.current = sys;
    monstersRef.current = [];
    setHighScore(sys.getHighScore());

    // ── Game loop ──
    const loop = new GameLoop();
    loop.start((delta) => {
      const ph = phaseRef.current;

      // ══ INPUT (only when playing) ══════════════════════════════════════════
      if (ph === 'playing') {
        if (input.isDown('ArrowRight')) {
          player.velocity.x = player.MOVE_SPEED;
          player.facingRight = true;
          if (player.isOnGround && player.state !== 'attacking') player.state = 'running';
        } else if (input.isDown('ArrowLeft')) {
          player.velocity.x = -player.MOVE_SPEED;
          player.facingRight = false;
          if (player.isOnGround && player.state !== 'attacking') player.state = 'running';
        } else {
          player.velocity.x = 0;
          if (player.isOnGround && player.state === 'running') player.state = 'idle';
        }

        if (input.wasPressed('ArrowUp')) {
          player.jump();
        }

        if (input.wasPressed('Space')) {
          const nearby = monstersRef.current.find(
            (m) => !m.isDead() && !m.isDying() && centerDistX(player.getBounds(), m.getBounds()) < INTERACT_DIST,
          );
          if (nearby) {
            player.velocity.x = 0;
            if (player.state === 'running') player.state = 'idle';
            activeMonsterRef.current = nearby;
            const q = math.generateQuestion();
            questionRef.current = q;
            setCurrentQuestion(q);
            syncPhase('question');
          } else {
            player.attack();
          }
        }
      }

      // ══ UPDATE ═════════════════════════════════════════════════════════════
      // Only update world when actively playing — freezes everything during
      // question panel and on game over screen.
      if (ph === 'playing') {
        forest.update(delta);
        player.update(delta, GROUND_Y);

        // Dynamic spawn: starts slow (~5.5 s), ramps to ~1.8 s over ~2 min
        spawnTimerRef.current += delta;
        const spawnInterval = Math.max(1800, 5500 - gameTimeRef.current * 25);
        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          const m = new Monster(GAME_W + 80, GROUND_Y - 34, monsterIdRef.current++);
          monstersRef.current.push(m);
        }
        gameTimeRef.current += delta / 1000;

        // Update & cull dead / off-screen monsters
        monstersRef.current = monstersRef.current.filter((m) => {
          m.update(delta, GROUND_Y);
          return m.position.x > -120 && !m.isDead();
        });

        // Collision damage
        if (!player.isInvincible()) {
          for (const m of monstersRef.current) {
            if (!m.isDying() && rectsOverlap(player.getBounds(), m.getBounds())) {
              sys.loseLife();
              setLives(sys.lives);
              player.hurt();
              if (sys.isGameOver()) {
                setHighScore(sys.getHighScore());
                syncPhase('gameover');
              }
              break;
            }
          }
        }
      }

      // ══ RENDER ═════════════════════════════════════════════════════════════
      ctx.clearRect(0, 0, GAME_W, GAME_H);
      forest.draw(ctx, GAME_W, GAME_H);

      for (const m of monstersRef.current) {
        m.draw(ctx);

        // Distance indicator ring when player is near
        if (ph === 'playing' && !m.isDying() && centerDistX(player.getBounds(), m.getBounds()) < INTERACT_DIST) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,220,50,0.7)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(
            m.position.x + m.size.width / 2,
            m.position.y + m.size.height / 2,
            m.size.width * 0.9,
            0, Math.PI * 2,
          );
          ctx.stroke();
          ctx.restore();
        }
      }

      player.draw(ctx);

      // SPACE prompt when near a monster
      if (ph === 'playing') {
        const near = monstersRef.current.some(
          (m) => !m.isDead() && !m.isDying() && centerDistX(player.getBounds(), m.getBounds()) < INTERACT_DIST,
        );
        if (near) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          const bw = 268;
          const bx = GAME_W / 2 - bw / 2;
          const by = GROUND_Y - 34;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, 26, 6);
          ctx.fill();
          ctx.fillStyle = '#ffe87c';
          ctx.font = 'bold 12px "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('[ ESPAÇO ] → Responder pergunta!', GAME_W / 2, by + 13);
          ctx.restore();
        }
      }

      input.flush();
    });

    return () => {
      loop.stop();
      input.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [syncPhase]);

  // ─── Keyboard shortcut for question answers (1-4) ──────────────────────────
  useEffect(() => {
    if (phase !== 'question' || !currentQuestion) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
      const idx = map[e.code];
      if (idx !== undefined && idx < currentQuestion.options.length) {
        handleAnswer(currentQuestion.options[idx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, currentQuestion, handleAnswer]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} className="game-wrap">
      <canvas ref={canvasRef} className="game-canvas" />

      <HUD lives={lives} score={score} level={level} highScore={highScore} />

      {phase === 'question' && currentQuestion && (
        <QuestionPanel
          question={currentQuestion}
          onAnswer={handleAnswer}
          selectedAnswer={selectedAnswer}
          answerResult={answerResult}
        />
      )}

      {phase === 'gameover' && (
        <GameOver score={score} highScore={highScore} onRestart={handleRestart} />
      )}

      <MobileControls inputManager={inputRef.current} />
    </div>
  );
}
