import { useRef, useEffect, useCallback, useState } from 'react';

import { GameLoop } from '../engine/GameLoop';
import { InputManager } from '../engine/InputManager';
import { ForestScene } from '../scenes/ForestScene';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { BossMonster } from '../entities/BossMonster';
import { Gift } from '../entities/Gift';
import { LearningArtifact } from '../entities/LearningArtifact';
import { MathSystem } from '../systems/MathSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { LearningSystem } from '../systems/LearningSystem';
import { ComboSystem } from '../systems/ComboSystem';
import { DifficultyManager } from '../systems/DifficultyManager';
import { CoinSystem } from '../systems/CoinSystem';
import { MathMemory } from '../systems/MathMemory';
import { rectsOverlap, centerDistX } from '../systems/CollisionSystem';
import { FloatingText } from '../effects/FloatingText';
import { ParticleSystem } from '../effects/ParticleSystem';
import { VisualEffects } from '../effects/VisualEffects';
import type { MathQuestion, GamePhase } from '../types';

import { HUD } from './HUD';
import { QuestionPanel } from './QuestionPanel';
import { GameOver } from './GameOver';
import { MobileControls } from './MobileControls';

// ─── Constants ────────────────────────────────────────────────────────────────
const GAME_W = 960;
const GAME_H = 540;
const GROUND_Y = GAME_H * 0.74;
const INTERACT_DIST = 145;

// ─── Component ────────────────────────────────────────────────────────────────
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ── React UI state ──
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Mutable game refs ──
  const phaseRef = useRef<GamePhase>('playing');
  const inputRef = useRef<InputManager | null>(null);
  const forestRef = useRef<ForestScene | null>(null);
  const playerRef = useRef<Player | null>(null);
  const monstersRef = useRef<Monster[]>([]);
  const bossRef = useRef<BossMonster | null>(null);
  const artifactsRef = useRef<LearningArtifact[]>([]);
  const mathRef = useRef<MathSystem | null>(null);
  const scoreRef = useRef<ScoreSystem | null>(null);
  const comboRef = useRef<ComboSystem | null>(null);
  const difficultyRef = useRef<DifficultyManager | null>(null);
  const coinsRef = useRef<CoinSystem | null>(null);
  const mathMemoryRef = useRef<MathMemory | null>(null);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const visualEffectsRef = useRef<VisualEffects | null>(null);
  const activeMonsterRef = useRef<Monster | BossMonster | null>(null);
  const questionRef = useRef<MathQuestion | null>(null);
  const answerLockedRef = useRef(false);
  const spawnTimerRef = useRef(0);
  const artifactSpawnTimerRef = useRef(0);
  const monsterIdRef = useRef(0);
  const gameTimeRef = useRef(0);
  const giftsRef = useRef<Gift[]>([]);
  const learningSystemRef = useRef<LearningSystem | null>(null);

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
      const combo = comboRef.current;
      const difficulty = difficultyRef.current;
      const memory = mathMemoryRef.current;
      const particles = particlesRef.current;
      const visual = visualEffectsRef.current;

      if (!q || !math || !sys || !combo || !difficulty) return;

      answerLockedRef.current = true;
      const correct = answer === q.answer;
      setSelectedAnswer(answer);
      setAnswerResult(correct ? 'correct' : 'wrong');

      if (correct) {
        // Correct answer!
        combo.hit();
        difficulty.onCorrect();
        memory?.recordOperation(q.a, q.b, q.answer);
        setCombo(combo.getCombo());

        // Create floating text for result
        if (activeMonsterRef.current) {
          const centerX = activeMonsterRef.current.position.x + activeMonsterRef.current.size.width / 2;
          const centerY = activeMonsterRef.current.position.y;
          floatingTextsRef.current.push(
            new FloatingText(centerX, centerY, `${q.answer}`, 'result', 1500)
          );
        }

        // Combo feedback
        if (combo.getCombo() > 1) {
          const comboText = `Combo x${combo.getCombo()}`;
          floatingTextsRef.current.push(
            new FloatingText(GAME_W / 2, 100, comboText, 'combo', 1000)
          );
          visual?.shake(8, 300);
          particles?.burst(GAME_W / 2, 100, 'spark', 15);
        }

        // Hit monster
        activeMonsterRef.current?.hit();

        // If monster dies, spawn coins and award points
        if (activeMonsterRef.current?.isDead?.()) {
          const monsterX = activeMonsterRef.current.position.x + activeMonsterRef.current.size.width / 2;
          const monsterY = activeMonsterRef.current.position.y;
          coinsRef.current?.spawnCoins(monsterX, monsterY, 3);
          particles?.burst(monsterX, monsterY, 'explosion', 12);
          
          const basePts = math.getPointsForCorrect(sys.level) * combo.getMultiplier();
          const comboPts = basePts + (combo.getCombo() > 1 ? combo.getCombo() * 5 : 0);
          sys.addScore(comboPts);
          setScore(sys.score);
          setLevel(sys.level);
          math.setMaxFactor(2 + sys.level);

          floatingTextsRef.current.push(
            new FloatingText(monsterX, monsterY - 40, `+${comboPts}`, 'score', 1200)
          );
        }

        activeMonsterRef.current = null;
      } else {
        // Wrong answer
        combo.miss();
        difficulty.onWrong();
        setCombo(0);
        sys.loseLife();
        setLives(sys.lives);
        playerRef.current?.hurt();

        // Create floating text for wrong answer
        if (activeMonsterRef.current) {
          const centerX = activeMonsterRef.current.position.x + activeMonsterRef.current.size.width / 2;
          const centerY = activeMonsterRef.current.position.y - 20;
          floatingTextsRef.current.push(
            new FloatingText(centerX, centerY, `Resposta: ${q.answer}`, 'damage', 1500)
          );
        }

        visual?.shake(4, 200);
        particles?.burst(GAME_W / 2, GAME_H / 2, 'smoke', 8);

        if (sys.isGameOver()) {
          setHighScore(sys.getHighScore());
          questionRef.current = null;
          answerLockedRef.current = false;
          setCurrentQuestion(null);
          setSelectedAnswer(null);
          setAnswerResult(null);
          syncPhase('gameover');
          setTimeout(() => {}, 900);
          return;
        }
      }

      setTimeout(() => {
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
    const combo = comboRef.current;
    const difficulty = difficultyRef.current;

    if (!player || !sys || !combo || !difficulty) return;

    sys.reset();
    combo.reset();
    difficulty.reset();
    setScore(0);
    setLives(3);
    setLevel(1);
    setCombo(0);

    player.position = { x: 120, y: GROUND_Y - player.size.height };
    player.velocity = { x: 0, y: 0 };
    player.state = 'idle';

    monstersRef.current = [];
    bossRef.current = null;
    artifactsRef.current = [];
    activeMonsterRef.current = null;
    spawnTimerRef.current = 0;
    artifactSpawnTimerRef.current = 0;
    gameTimeRef.current = 0;
    giftsRef.current = [];
    floatingTextsRef.current = [];
    particlesRef.current?.clear();
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
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / GAME_W, vh / GAME_H);
      canvas.style.width  = `${GAME_W * s}px`;
      canvas.style.height = `${GAME_H * s}px`;
    };
    onResize();
    window.addEventListener('resize', onResize);

    // ── Initialize systems ──
    const input = new InputManager();
    const forest = new ForestScene();
    const player = new Player(120, GROUND_Y - 48);
    const math = new MathSystem();
    const sys = new ScoreSystem();
    const learning = new LearningSystem();
    const comboSys = new ComboSystem();
    const difficultySys = new DifficultyManager();
    const coinSys = new CoinSystem();
    const mathMemory = new MathMemory();
    const particles = new ParticleSystem();
    const visualEffects = new VisualEffects();

    inputRef.current = input;
    forestRef.current = forest;
    playerRef.current = player;
    mathRef.current = math;
    scoreRef.current = sys;
    comboRef.current = comboSys;
    difficultyRef.current = difficultySys;
    coinsRef.current = coinSys;
    mathMemoryRef.current = mathMemory;
    particlesRef.current = particles;
    visualEffectsRef.current = visualEffects;
    learningSystemRef.current = learning;
    monstersRef.current = [];
    setHighScore(sys.getHighScore());

    // ── Initialize learning phase: spawn 5 gift tutorial boxes scrolling ──
    const learnedOps = learning.generateLearningOps();
    const giftSpacing = 180;
    giftsRef.current = learnedOps.map((op, i) => {
      const g = new Gift(GAME_W + 40 + i * giftSpacing, GROUND_Y - 50, i, op);
      g.velocity = { x: -72, y: 0 }; // Scrolls left like monsters
      return g;
    });
    math.setOperationPool(learnedOps);
    syncPhase('learning');

    // ── Game loop ──
    const loop = new GameLoop();
    loop.start((delta) => {
      const ph = phaseRef.current;

      // ══ INPUT ══════════════════════════════════════════════════════════════
      if (ph === 'learning' || ph === 'playing') {
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
          if (ph === 'learning') {
            const nearbyGift = giftsRef.current.find(
              (g) => !g.isOpen() && rectsOverlap(player.getBounds(), g.getBounds()),
            );
            if (nearbyGift) {
              nearbyGift.hit();
              // Smoke burst + sparks when gift is opened
              const gx = nearbyGift.position.x + nearbyGift.size.width / 2;
              const gy = nearbyGift.position.y;
              particles?.burst(gx, gy, 'smoke', 12);
              particles?.burst(gx, gy, 'spark', 10);
              mathMemory.recordOperation(
                nearbyGift.operation.a,
                nearbyGift.operation.b,
                nearbyGift.operation.result,
              );
            } else {
              player.attack();
            }
          } else if (ph === 'playing') {
            // Check for artifacts first
            const nearbyArtifact = artifactsRef.current.find(
              (a) => a.state === 'active' && rectsOverlap(player.getBounds(), a.getBounds()),
            );
            if (nearbyArtifact) {
              nearbyArtifact.collect();
              mathMemory.recordOperation(nearbyArtifact.a, nearbyArtifact.b, nearbyArtifact.result);
              particles?.burst(nearbyArtifact.position.x, nearbyArtifact.position.y, 'spark', 20);
              floatingTextsRef.current.push(
                new FloatingText(
                  nearbyArtifact.position.x,
                  nearbyArtifact.position.y - 40,
                  `${nearbyArtifact.result}`,
                  'result',
                  1800
                )
              );
              visualEffects?.setBloom(0.5, 300);
              coinsRef.current?.spawnCoins(
                nearbyArtifact.position.x,
                nearbyArtifact.position.y,
                2
              );
            } else {
              // Monster interaction
              const nearby = monstersRef.current.find(
                (m) =>
                  !m.isDead() &&
                  !m.isDying() &&
                  centerDistX(player.getBounds(), m.getBounds()) < INTERACT_DIST,
              );
              if (nearby) {
                player.velocity.x = 0;
                if (player.state === 'running') player.state = 'idle';
                activeMonsterRef.current = nearby;
                // Use the monster's own operation so label and question match
                const q = nearby.operation
                  ? math.generateQuestionForOperation(nearby.operation.a, nearby.operation.b)
                  : math.generateQuestion();
                questionRef.current = q;
                setCurrentQuestion(q);
                syncPhase('question');
              } else {
                player.attack();
              }
            }
          }
        }
      }

      // ══ UPDATE ═════════════════════════════════════════════════════════════
      visualEffects?.update(delta);
      particles?.update(delta);
      comboSys.update(delta);

      if (ph === 'learning' || ph === 'playing') {
        forest.update(delta);
        player.update(delta, GROUND_Y);
      }

      if (ph === 'learning') {
        giftsRef.current.forEach((g) => g.update(delta, GROUND_Y));
        giftsRef.current.forEach((g) => {
          if (g.isOpen()) g.startDisappearing();
        });
        giftsRef.current = giftsRef.current.filter((g) => g.position.x > -50 && g.state !== 'gone');

        const allGone = giftsRef.current.length === 0;
        if (allGone && learning.getLearnedOps().length > 0) {
          syncPhase('playing');
        }
      } else if (ph === 'playing') {
        // Spawn regular monsters
        spawnTimerRef.current += delta;
        const spawnInterval = difficultySys.getSpawnIntervalMs();
        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;

          // 90% chance: regular monster, 10% chance: learning artifact
          if (Math.random() < 0.9) {
            // Prefer recently learned operations 70% of the time
            let opA, opB;
            if (Math.random() < 0.7) {
              const recentOp = mathMemory.getRandomRecentOp();
              if (recentOp) {
                opA = recentOp.a;
                opB = recentOp.b;
              } else {
                opA = 2 + Math.floor(Math.random() * 8);
                opB = 2 + Math.floor(Math.random() * 8);
              }
            } else {
              opA = 2 + Math.floor(Math.random() * 8);
              opB = 2 + Math.floor(Math.random() * 8);
            }

            const m = new Monster(GAME_W + 80, GROUND_Y - 34, monsterIdRef.current++, {
              a: opA,
              b: opB,
              op: '×',
            });
            // Apply difficulty speed modifier
            m.velocity.x = difficultySys.getMonsterSpeed(m.velocity.x);
            monstersRef.current.push(m);
          } else {
            // Spawn learning artifact
            const a = 2 + Math.floor(Math.random() * 8);
            const b = 2 + Math.floor(Math.random() * 8);
            const artifact = new LearningArtifact(GAME_W + 50, GROUND_Y - 60, a, b, monsterIdRef.current++);
            artifactsRef.current.push(artifact);
          }
        }
        gameTimeRef.current += delta / 1000;

        // Update and cull monsters
        monstersRef.current = monstersRef.current.filter((m) => {
          m.update(delta, GROUND_Y);
          return m.position.x > -120 && !m.isDead();
        });

        // Update and cull artifacts
        artifactsRef.current = artifactsRef.current.filter((a) => a.isAlive());
        artifactsRef.current.forEach((a) => a.update(delta));

        // Update coins
        coinsRef.current?.update(delta);

        // Collision with coins
        const coins = coinsRef.current?.getCoins() || [];
        for (let i = coins.length - 1; i >= 0; i--) {
          const coin = coins[i];
          const dist = Math.hypot(
            coin.getBounds().x - (player.position.x + player.size.width / 2),
            coin.getBounds().y - (player.position.y + player.size.height / 2)
          );
          if (dist < 30) {
            floatingTextsRef.current.push(
              new FloatingText(coin.getBounds().x, coin.getBounds().y - 20, '+10', 'score', 800)
            );
            coinsRef.current?.collectCoin(i);
            sys.addScore(10);
            setScore(sys.score);
            particles?.burst(coin.getBounds().x, coin.getBounds().y, 'spark', 5);
          }
        }

        // Collision damage with monsters
        if (!player.isInvincible()) {
          for (const m of monstersRef.current) {
            if (!m.isDying() && rectsOverlap(player.getBounds(), m.getBounds())) {
              sys.loseLife();
              setLives(sys.lives);
              player.hurt();
              visualEffects?.shake(6, 250);
              if (sys.isGameOver()) {
                setHighScore(sys.getHighScore());
                syncPhase('gameover');
              }
              break;
            }
          }
        }
      }

      // Update floating texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.update(delta);
        if (!ft.isAlive()) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      // ══ RENDER ═════════════════════════════════════════════════════════════
      const shake = visualEffects?.getShakeOffset() || { x: 0, y: 0 };
      ctx.clearRect(0, 0, GAME_W, GAME_H);

      ctx.save();
      ctx.translate(shake.x, shake.y);
      forest.draw(ctx, GAME_W, GAME_H);

      if (ph === 'learning') {
        for (const g of giftsRef.current) {
          g.draw(ctx);
        }
        // Render particles in learning phase too (smoke bursts)
        particles?.draw(ctx);
      }

      if (ph === 'playing') {
        // Draw coins
        coinsRef.current?.draw(ctx);

        // Draw artifacts
        for (const artifact of artifactsRef.current) {
          artifact.draw(ctx);
          artifact.drawLabel(ctx);
        }

        // Draw monsters
        for (const m of monstersRef.current) {
          m.draw(ctx);
          if (m.operation) {
            const opText = `${m.operation.a} × ${m.operation.b}`;
            ctx.save();
            
            // Shadow text
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(opText, m.position.x + m.size.width / 2 + 2, m.position.y - 5 + 2);

            // Main text with glow
            ctx.fillStyle = '#ffff44';
            ctx.shadowColor = 'rgba(255, 220, 0, 0.8)';
            ctx.shadowBlur = 15;
            ctx.font = 'bold 32px Arial';
            ctx.fillText(opText, m.position.x + m.size.width / 2, m.position.y - 5);

            // Outline
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 2;
            ctx.strokeText(opText, m.position.x + m.size.width / 2, m.position.y - 5);

            ctx.restore();
          }

          // Distance indicator
          if (!m.isDying() && centerDistX(player.getBounds(), m.getBounds()) < INTERACT_DIST) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,220,50,0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(
              m.position.x + m.size.width / 2,
              m.position.y + m.size.height / 2,
              m.size.width * 0.9,
              0,
              Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      player.draw(ctx);

      // Floating texts
      for (const ft of floatingTextsRef.current) {
        ft.draw(ctx);
      }

      ctx.restore();

      // Learning instruction
      if (ph === 'learning') {
        ctx.save();
        ctx.fillStyle = '#ffe87c';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Memorize os presentes!', GAME_W / 2, 30);
        ctx.font = '11px "Courier New", monospace';
        ctx.fillText('Bata neles e veja o resultado', GAME_W / 2, 50);
        ctx.restore();
      }

      // Combo display
      if (combo > 1) {
        ctx.save();
        ctx.fillStyle = '#ffaa00';
        ctx.font = `bold ${20 + combo * 2}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`COMBO x${combo}`, GAME_W - 20, 20);
        ctx.restore();
      }

      // SPACE prompt
      if (ph === 'playing') {
        const nearMonster = monstersRef.current.some(
          (m) =>
            !m.isDead() &&
            !m.isDying() &&
            centerDistX(player.getBounds(), m.getBounds()) < INTERACT_DIST,
        );
        const nearArtifact = artifactsRef.current.some(
          (a) => a.state === 'active' && rectsOverlap(player.getBounds(), a.getBounds())
        );

        if (nearMonster || nearArtifact) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          const bw = 280;
          const bx = GAME_W / 2 - bw / 2;
          const by = GROUND_Y - 34;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, 26, 6);
          ctx.fill();
          ctx.fillStyle = '#ffe87c';
          ctx.font = 'bold 12px "Courier New", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const promptText = nearArtifact ? '[ ESPAÇO ] → Coletar!' : '[ ESPAÇO ] → Responder!';
          ctx.fillText(promptText, GAME_W / 2, by + 13);
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

  // ─── Fullscreen handling ──────────────────────────────────────────────────
  useEffect(() => {
    const onFull = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // If entering fullscreen, attempt to lock orientation to landscape
      if (document.fullscreenElement) {
        try {
          (screen as any)?.orientation?.lock('landscape').catch?.(() => {});
        } catch (e) {
          // ignore
        }
      } else {
        try { (screen as any)?.orientation?.unlock?.(); } catch (e) {}
      }
    };
    window.addEventListener('fullscreenchange', onFull);
    return () => window.removeEventListener('fullscreenchange', onFull);
  }, []);

  const toggleFullscreen = async () => {
    const wrap = wrapRef.current;
    try {
      if (!document.fullscreenElement) {
        if (wrap && wrap.requestFullscreen) {
          await wrap.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      // ignore fullscreen errors
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} className="game-wrap">
      <canvas ref={canvasRef} className="game-canvas" />

      <HUD lives={lives} score={score} level={level} highScore={highScore} combo={combo} />

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

      <button className="fullscreen-btn" onClick={toggleFullscreen} aria-pressed={isFullscreen}>
        {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
      </button>

      {/* Portrait-mode hint — shown via CSS only on portrait screens */}
      <div className="portrait-overlay">
        <div className="portrait-overlay__icon">📱</div>
        <p>Gire o celular</p>
        <p>para jogar</p>
      </div>
    </div>
  );
}
