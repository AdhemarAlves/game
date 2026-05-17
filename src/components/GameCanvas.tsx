import { useRef, useEffect, useCallback, useState } from 'react';

import { GameLoop } from '../engine/GameLoop';
import { InputManager } from '../engine/InputManager';
import { ForestScene } from '../scenes/ForestScene';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { EagleMonster } from '../entities/EagleMonster';
import { OgreMonster } from '../entities/OgreMonster';
import { SnakeMonster } from '../entities/SnakeMonster';
import { MagicBird } from '../entities/MagicBird';
import { BirdLessonSystem } from '../systems/BirdLessonSystem';
import { DialogueBubble } from '../ui/DialogueBubble';
import { BirdKidnappedScene } from '../scenes/BirdKidnappedScene';
import { AnswerProjectile } from '../entities/AnswerProjectile';
import { MathSystem } from '../systems/MathSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { ComboSystem } from '../systems/ComboSystem';
import { DifficultyManager } from '../systems/DifficultyManager';
import { CoinSystem } from '../systems/CoinSystem';
import { MathMemory } from '../systems/MathMemory';
import { TableProgressionSystem } from '../systems/TableProgressionSystem';
import { HammerPowerSystem } from '../systems/HammerPowerSystem';
import { SoundManager } from '../systems/SoundManager';
import { rectsOverlap } from '../systems/CollisionSystem';
import { FloatingText } from '../effects/FloatingText';
import { ParticleSystem } from '../effects/ParticleSystem';
import { VisualEffects } from '../effects/VisualEffects';
import type { GamePhase, HammerState, VisualAssistLevel } from '../types';
import { QuizModeSystem } from '../systems/QuizModeSystem';
import type { QuizOptionPosition } from '../systems/QuizModeSystem';
import { QuizOverlay } from '../ui/QuizOverlay';

import { HUD } from './HUD';
import { GameOver } from './GameOver';
import { MobileControls } from './MobileControls';

// ─── Constants ────────────────────────────────────────────────────────────────
const GAME_W = 960;
const GAME_H = 540;
const GROUND_Y = GAME_H * 0.74;
const WORLD_SCROLL = 90;   // px/s background scrolls when player moves right
const ATTACK_REACH = 105;  // px – forward reach of player attack hitbox

// ─── Component ────────────────────────────────────────────────────────────────
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  // ── React UI state ──
  const [phase, setPhase]               = useState<GamePhase>('playing');
  const [lives, setLives]               = useState(3);
  const [score, setScore]               = useState(0);
  const [level, setLevel]               = useState(1);
  const [highScore, setHighScore]       = useState(0);
  const [combo, setCombo]               = useState(0);
  const [currentTable, setCurrentTable] = useState(1);
  const [hammerState, setHammerState]   = useState<HammerState>('normal');
  const [hammerEnergy, setHammerEnergy] = useState(0);
  const [currentEquation, setCurrentEquation] = useState<string | undefined>(undefined);
  const [soundMuted, setSoundMuted]     = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Mutable game refs (bypasses React re-render cycle) ──
  const phaseRef             = useRef<GamePhase>('playing');
  const inputRef             = useRef<InputManager | null>(null);
  const forestRef            = useRef<ForestScene | null>(null);
  const playerRef            = useRef<Player | null>(null);
  const monstersRef          = useRef<Monster[]>([]);
  const birdRef              = useRef<MagicBird | null>(null);
  const birdLessonRef        = useRef<BirdLessonSystem | null>(null);
  const birdKidnapRef        = useRef<BirdKidnappedScene | null>(null);
  const gameModeRef          = useRef<'playing' | 'bird_intro' | 'bird_lesson' | 'bird_kidnapped'>('playing');
  const projectilesRef       = useRef<AnswerProjectile[]>([]);
  const mathRef              = useRef<MathSystem | null>(null);
  const scoreRef             = useRef<ScoreSystem | null>(null);
  const comboRef             = useRef<ComboSystem | null>(null);
  const difficultyRef        = useRef<DifficultyManager | null>(null);
  const coinsRef             = useRef<CoinSystem | null>(null);
  const mathMemoryRef        = useRef<MathMemory | null>(null);
  const tableProgressionRef  = useRef<TableProgressionSystem | null>(null);
  const hammerRef            = useRef<HammerPowerSystem | null>(null);
  const soundRef             = useRef<SoundManager | null>(null);
  const floatingTextsRef     = useRef<FloatingText[]>([]);
  const particlesRef         = useRef<ParticleSystem | null>(null);
  const visualEffectsRef     = useRef<VisualEffects | null>(null);
  const spawnTimerRef        = useRef(0);
  const monsterIdRef         = useRef(0);
  const gameTimeRef          = useRef(0);
  const prevHammerStateRef   = useRef<HammerState>('normal');
  const quizRef              = useRef<QuizModeSystem | null>(null);

  const syncPhase = useCallback((p: GamePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ─── Restart ────────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    const player     = playerRef.current;
    const sys        = scoreRef.current;
    const combSys    = comboRef.current;
    const difficulty = difficultyRef.current;
    const hammer     = hammerRef.current;
    if (!player || !sys || !combSys || !difficulty || !hammer) return;

    sys.reset();
    combSys.reset();
    difficulty.reset();
    hammer.reset();

    setScore(0);
    setLives(3);
    setLevel(1);
    setCombo(0);
    setHammerState('normal');
    setHammerEnergy(0);
    setCurrentEquation(undefined);

    player.position = { x: 120, y: GROUND_Y - player.size.height };
    player.velocity = { x: 0, y: 0 };
    player.state    = 'idle';

    monstersRef.current    = [];
    projectilesRef.current = [];
    floatingTextsRef.current = [];
    particlesRef.current?.clear();
    birdRef.current       = null;
    birdLessonRef.current?.reset();
    gameModeRef.current   = 'playing';
    spawnTimerRef.current = 0;
    gameTimeRef.current   = 0;
    quizRef.current?.reset();

    if (tableProgressionRef.current?.hasCheckpoint()) {
      tableProgressionRef.current.restoreCheckpoint();
      const tbl = tableProgressionRef.current.getCurrentTable();
      setCurrentTable(tbl === 0 ? 10 : tbl);
    } else {
      tableProgressionRef.current?.reset();
      setCurrentTable(1);
    }

    syncPhase('playing');
  }, [syncPhase]);

  // ─── Main game loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    canvas.width  = GAME_W;
    canvas.height = GAME_H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const onResize = () => {
      const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
      canvas.style.width  = `${GAME_W * s}px`;
      canvas.style.height = `${GAME_H * s}px`;
    };
    onResize();
    window.addEventListener('resize', onResize);

    // ── Systems ──
    const input      = new InputManager();
    const forest     = new ForestScene();
    const player     = new Player(120, GROUND_Y - 48);
    const math       = new MathSystem();
    const sys        = new ScoreSystem();
    const combSys    = new ComboSystem();
    const difficulty = new DifficultyManager();
    const coinSys    = new CoinSystem();
    const memory     = new MathMemory();
    const tableProg  = new TableProgressionSystem();
    const hammer     = new HammerPowerSystem();
    const sound      = new SoundManager();
    const particles  = new ParticleSystem();
    const vfx        = new VisualEffects();
    const quiz        = new QuizModeSystem();
    const quizOverlay = new QuizOverlay();
    const birdLesson    = new BirdLessonSystem();
    const birdKidnap    = new BirdKidnappedScene();
    const dialogueBubble = new DialogueBubble();

    quizRef.current       = quiz;
    birdLessonRef.current = birdLesson;
    birdKidnapRef.current = birdKidnap;

    inputRef.current            = input;
    forestRef.current           = forest;
    playerRef.current           = player;
    mathRef.current             = math;
    scoreRef.current            = sys;
    comboRef.current            = combSys;
    difficultyRef.current       = difficulty;
    coinsRef.current            = coinSys;
    mathMemoryRef.current       = memory;
    tableProgressionRef.current = tableProg;
    hammerRef.current           = hammer;
    soundRef.current            = sound;
    particlesRef.current        = particles;
    visualEffectsRef.current    = vfx;

    setSoundMuted(sound.isMuted());
    setHighScore(sys.getHighScore());
    syncPhase('playing');

    const loop = new GameLoop();
    loop.start((delta) => {
      if (phaseRef.current === 'gameover') return;

      // ══════════════════════════════════════════════════════════════════════
      // INPUT
      // ══════════════════════════════════════════════════════════════════════

      const quizInProgress = quiz.isActive();

      // ── Quiz answer input (overrides all normal controls) ─────────────────
      if (quizInProgress && !quiz.getQuiz()?.answered) {
        player.velocity.x = 0;
        if (player.isOnGround && player.state === 'running') player.state = 'idle';

        const quizDir: QuizOptionPosition | null =
          input.wasPressed('ArrowLeft')  ? 'left'  :
          input.wasPressed('ArrowRight') ? 'right' :
          input.wasPressed('ArrowUp')    ? 'up'    : null;

        if (quizDir) {
          const result = quiz.selectAnswer(quizDir);
          const pCXq   = player.position.x + player.size.width  / 2;
          const pCYq   = player.position.y + player.size.height * 0.5;

          if (result === 'correct') {
            combSys.hit();
            const c = combSys.getCombo();
            setCombo(c);
            hammer.charge(c);
            setHammerState(hammer.state);
            setHammerEnergy(hammer.getEnergyFraction());
            difficulty.onCorrect();
            const eq  = quiz.getQuiz()!.equation;
            memory.recordOperation(eq.a, eq.b, eq.answer);
            const pts = math.getPointsForCorrect(sys.level) * combSys.getMultiplier();
            sys.addScore(pts);
            setScore(sys.score);
            setLevel(sys.level);
            math.setMaxFactor(2 + sys.level);
            sound.play('correct_answer');
            if (hammer.state === 'supercharged') sound.play('hammer_supercharge');
            else                                 sound.play('hammer_charge');
            particles.burst(pCXq, pCYq - 20, 'energy', 14);
            particles.burst(pCXq, pCYq - 20, 'spark',  8);
            floatingTextsRef.current.push(
              new FloatingText(pCXq, pCYq - 92,  `+${pts}`,      'score',   1000),
              new FloatingText(pCXq, pCYq - 124, '✓ Correto!',  'correct', 1200),
            );
            if (c > 1) {
              sound.play('combo');
              vfx.shake(6, 250);
              floatingTextsRef.current.push(
                new FloatingText(GAME_W / 2, 115, `COMBO x${c}!`, 'combo', 900),
              );
            }

          } else if (result === 'wrong') {
            combSys.miss();
            setCombo(0);
            difficulty.onWrong();
            const eq = quiz.getQuiz()!.equation;
            memory.recordWrong(eq.a, eq.b);
            sys.loseLife();
            setLives(sys.lives);
            player.hurt();
            vfx.shake(7, 320);
            sound.play('wrong_answer');
            sound.play('player_damage');
            particles.burst(pCXq, pCYq, 'explosion', 12);
            floatingTextsRef.current.push(
              new FloatingText(pCXq, pCYq - 60, '✗', 'wrong', 800),
            );
            if (sys.isGameOver()) {
              sound.play('game_over');
              setHighScore(sys.getHighScore());
              tableProgressionRef.current?.saveCheckpoint();
              syncPhase('gameover');
              return;
            }
          }
        }
      }

      // ── Normal controls (blocked during quiz or bird mode) ─────────────────────────────
      if (!quizInProgress && gameModeRef.current === 'playing') {
        if (input.isDown('ArrowRight')) {
          player.velocity.x = player.MOVE_SPEED;
          player.facingRight = true;
          if (player.isOnGround && player.state !== 'attacking') player.state = 'running';
        } else if (input.isDown('ArrowLeft')) {
          player.velocity.x = -player.MOVE_SPEED * 0.6;
          player.facingRight = false;
          if (player.isOnGround && player.state !== 'attacking') player.state = 'running';
        } else {
          player.velocity.x = 0;
          if (player.isOnGround && player.state === 'running') player.state = 'idle';
        }
        if (input.wasPressed('ArrowUp')) player.jump();
      }

      if (!quizInProgress && input.wasPressed('Space') && gameModeRef.current === 'playing') {
        player.attack();

        const pCX = player.position.x + player.size.width  / 2;
        const pCY = player.position.y + player.size.height * 0.5;
        const dir = player.facingRight ? 1 : -1;
        const aCX = pCX + dir * ATTACK_REACH * 0.5;

        // ── Find nearest projectile within reach ──
        let nearestIdx  = -1;
        let nearestDist = ATTACK_REACH * 1.15;

        for (let i = 0; i < projectilesRef.current.length; i++) {
          const p = projectilesRef.current[i];
          if (!p.active) continue;
          const d = Math.hypot(p.x - aCX, p.y - pCY);
          if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }

        if (nearestIdx >= 0) {
          const proj = projectilesRef.current[nearestIdx];
          proj.active = false;

          if (proj.isCorrect) {
            combSys.hit();
            const c = combSys.getCombo();
            setCombo(c);

            hammer.charge(c);
            setHammerState(hammer.state);
            setHammerEnergy(hammer.getEnergyFraction());

            difficulty.onCorrect();

            const [aP, bP] = proj.equationId.split('x').map(Number);
            if (!isNaN(aP) && !isNaN(bP)) memory.recordOperation(aP, bP, aP * bP);

            const pts = math.getPointsForCorrect(sys.level) * combSys.getMultiplier();
            sys.addScore(pts);
            setScore(sys.score);
            setLevel(sys.level);
            math.setMaxFactor(2 + sys.level);

            sound.play('correct_answer');
            if (hammer.state === 'supercharged') sound.play('hammer_supercharge');
            else                                 sound.play('hammer_charge');

            particles.burst(proj.x, proj.y, 'spark',  18);
            particles.burst(proj.x, proj.y, 'energy', 10);

            floatingTextsRef.current.push(
              new FloatingText(proj.x, proj.y - 32, `+${pts}`, 'score',   900),
              new FloatingText(proj.x, proj.y - 60, `${proj.value} ✓`, 'correct', 1100),
            );

            if (c > 1) {
              sound.play('combo');
              vfx.shake(6, 250);
              floatingTextsRef.current.push(
                new FloatingText(GAME_W / 2, 115, `COMBO x${c}!`, 'combo', 900),
              );
            }

            for (const p of projectilesRef.current) {
              if (p.active && p.equationId === proj.equationId) p.active = false;
            }

            for (const m of monstersRef.current) {
              if (m.operation && `${m.operation.a}x${m.operation.b}` === proj.equationId) {
                m.resetAttackWindow();
                m.attackCooldown = 3000 + Math.random() * 2000;
              }
            }

          } else {
            combSys.miss();
            setCombo(0);
            difficulty.onWrong();

            const [aP, bP] = proj.equationId.split('x').map(Number);
            if (!isNaN(aP) && !isNaN(bP)) memory.recordWrong(aP, bP);

            sys.loseLife();
            setLives(sys.lives);
            player.hurt();
            vfx.shake(7, 320);

            sound.play('wrong_answer');
            sound.play('player_damage');

            particles.burst(proj.x, proj.y, 'explosion', 12);
            floatingTextsRef.current.push(
              new FloatingText(proj.x, proj.y - 30, '✗', 'wrong', 800),
            );

            const correctProj = projectilesRef.current.find(
              (p) => p.equationId === proj.equationId && p.isCorrect,
            );
            if (correctProj) {
              floatingTextsRef.current.push(
                new FloatingText(pCX, pCY - 75, `Correto: ${correctProj.value}`, 'message', 2200),
              );
            }

            for (const p of projectilesRef.current) {
              if (p.active && p.equationId === proj.equationId) p.active = false;
            }

            if (sys.isGameOver()) {
              sound.play('game_over');
              setHighScore(sys.getHighScore());
              tableProgressionRef.current?.saveCheckpoint();
              syncPhase('gameover');
              return;
            }
          }

        } else {
          // ── No projectile cut ──
          const nearMon = monstersRef.current.find(
            (m) =>
              !m.isDead() && !m.isDying() &&
              Math.abs(m.position.x + m.size.width / 2 - pCX) < 120,
          );
          if (nearMon) {
            if (hammer.isCharged()) {
              nearMon.hit();
              hammer.consume();
              setHammerState(hammer.state);
              setHammerEnergy(hammer.getEnergyFraction());

              const mCX = nearMon.position.x + nearMon.size.width / 2;
              sound.play('monster_hit');
              vfx.shake(5, 200);
              particles.burst(mCX, nearMon.position.y, 'explosion', 14);
              particles.burst(mCX, nearMon.position.y, 'star', 8);

              if (nearMon.isDying()) {
                const pts = (nearMon.isBoss ? 150 : 50) * sys.level;
                sys.addScore(pts);
                setScore(sys.score);
                setLevel(sys.level);
                math.setMaxFactor(2 + sys.level);
                coinSys.spawnCoins(mCX, nearMon.position.y, nearMon.isBoss ? 6 : 3);
                sound.play('monster_defeated');
                floatingTextsRef.current.push(
                  new FloatingText(mCX, nearMon.position.y - 40, `+${pts}`, 'score', 1400),
                );
                particles.burst(mCX, nearMon.position.y, 'explosion', 22);
              }
            } else {
              player.hurt();
              sys.loseLife();
              setLives(sys.lives);
              vfx.shake(5, 200);
              sound.play('player_damage');
              floatingTextsRef.current.push(
                new FloatingText(pCX, pCY - 60, 'Carregue o martelo!', 'message', 1800),
              );
              if (sys.isGameOver()) {
                sound.play('game_over');
                setHighScore(sys.getHighScore());
                tableProgressionRef.current?.saveCheckpoint();
                syncPhase('gameover');
                return;
              }
            }
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // UPDATE
      // ══════════════════════════════════════════════════════════════════════

      const worldScroll = player.velocity.x !== 0
        ? (player.velocity.x / player.MOVE_SPEED) * WORLD_SCROLL * difficulty.getSpeedMultiplier()
        : 0;
      forest.update(delta, worldScroll);

      vfx.update(delta);
      particles.update(delta);
      combSys.update(delta);
      hammer.update(delta);
      player.update(delta, GROUND_Y);

      if (hammer.state !== prevHammerStateRef.current) {
        prevHammerStateRef.current = hammer.state;
        setHammerState(hammer.state);
      }
      setHammerEnergy(hammer.getEnergyFraction());

      // ── Quiz zone trigger ─────────────────────────────────────────────────
      if (!quiz.isActive() && gameModeRef.current === 'playing') {
        const pCXquiz = player.position.x + player.size.width / 2;
        for (const m of monstersRef.current) {
          if (m.isDead() || m.isDying() || !m.operation) continue;
          if (quiz.hasTriggered(m.id)) continue;
          const dist = m.position.x - pCXquiz;
          if (dist > 0 && dist < quiz.QUIZ_ZONE) {
            quiz.startQuiz(m.id, m.operation.a, m.operation.b, math, sys.level);
            // Clear all in-flight projectiles for a clean quiz slate
            projectilesRef.current = [];
            break;
          }
        }
      }
      quiz.update(delta);

      // ── Spawn (only during normal play) ───────────────────────────────────
      if (gameModeRef.current === 'playing') {
        gameTimeRef.current   += delta / 1000;
        spawnTimerRef.current += delta;
        const spawnInterval = Math.max(1800, 7000 - gameTimeRef.current * 20);

        if (spawnTimerRef.current >= spawnInterval && !quiz.isActive()) {
          spawnTimerRef.current = 0;

          if (tableProg.isArtifactSubPhase()) {
            // ── Bird lesson: clear the field and spawn the magic tutor ──
            monstersRef.current    = [];
            projectilesRef.current = [];
            quiz.reset();

            const table = tableProg.getCurrentTable();
            const bird  = new MagicBird(GAME_W + 80, GROUND_Y - 240);
            birdRef.current = bird;
            bird.setTarget(player.position.x + 155, player.position.y - 95);
            birdLesson.startLesson(table === 0 ? 10 : table);
            gameModeRef.current = 'bird_intro';
            sound.play('magic_bird_appear');
            particles.burst(GAME_W / 2, GROUND_Y - 80, 'spark', 16);

          } else {
            const rnd = Math.random();
            const op  = tableProg.randomMonsterOp();
            const t   = gameTimeRef.current;

            if (t > 90 && rnd < 0.15) {
              const ogre = new OgreMonster(GAME_W + 80, GROUND_Y - 60, monsterIdRef.current++, { a: op.a, b: op.b, op: 'x' }, 2);
              ogre.velocity.x = difficulty.getMonsterSpeed(-44);
              monstersRef.current.push(ogre);
            } else if (t > 60 && rnd < 0.30) {
              const eagle = new EagleMonster(GAME_W + 80, GROUND_Y - 145, monsterIdRef.current++, { a: op.a, b: op.b, op: 'x' });
              eagle.velocity.x = difficulty.getMonsterSpeed(-100);
              monstersRef.current.push(eagle);
            } else if (rnd < 0.60) {
              const snake = new SnakeMonster(GAME_W + 80, GROUND_Y - 24, monsterIdRef.current++, { a: op.a, b: op.b, op: 'x' });
              snake.velocity.x = difficulty.getMonsterSpeed(snake.velocity.x);
              monstersRef.current.push(snake);
            } else {
              const m = new Monster(GAME_W + 80, GROUND_Y - 34, monsterIdRef.current++, { a: op.a, b: op.b, op: 'x' });
              m.velocity.x = difficulty.getMonsterSpeed(m.velocity.x);
              monstersRef.current.push(m);
            }

            tableProg.onMonsterSpawned();
            const tbl = tableProg.getCurrentTable();
            setCurrentTable(tbl === 0 ? 10 : tbl);
          }
        }
      }

      // ── Bird mode updates ──────────────────────────────────────────────────
      if (gameModeRef.current === 'bird_intro') {
        const bird = birdRef.current;
        if (bird) {
          bird.facingLeft = bird.position.x > player.position.x;
          bird.setTarget(player.position.x + 155, player.position.y - 95);
          const reached = bird.update(delta);
          if (reached) {
            bird.state = 'teaching';
            gameModeRef.current = 'bird_lesson';
            sound.play('bird_teach');
            particles.burst(bird.position.x + bird.size.width / 2, bird.position.y, 'energy', 18);
          }
        }
      }

      if (gameModeRef.current === 'bird_lesson') {
        const bird = birdRef.current;
        if (bird) {
          bird.facingLeft = bird.position.x > player.position.x;
          bird.update(delta);
          const advanced = birdLesson.update(delta);
          if (advanced && !birdLesson.isComplete()) {
            sound.play('bird_teach');
          }
          if (birdLesson.isReadyForKidnap()) {
            birdLesson.saveTaughtOps(memory);
            tableProg.completeLessonPhase();
            const tbl = tableProg.getCurrentTable();
            setCurrentTable(tbl === 0 ? 10 : tbl);
            // Bird stands still — captured state is set later when the boss actually grabs it
            bird.state = 'idle';
            gameModeRef.current = 'bird_kidnapped';
            birdKidnap.start(GAME_W, GROUND_Y);
            sound.play('lesson_complete');
          }
        }
      }

      if (gameModeRef.current === 'bird_kidnapped') {
        const bird       = birdRef.current;
        const prevStage  = birdKidnap.getStage();
        birdKidnap.update(delta);
        const newStage   = birdKidnap.getStage();

        // Fire sounds on stage transitions
        if (prevStage !== newStage) {
          if (newStage === 'boss_enters') sound.play('boss_appear');
          if (newStage === 'capture') {
            sound.play('bird_kidnapped');
            // Now the boss physically grabs the bird — switch to scared face
            if (bird) bird.state = 'captured';
          }
          if (newStage === 'message')     sound.play('mission_start');
        }

        if (bird) {
          const bossPos   = birdKidnap.getBossPosition();
          bird.capturedByX = bossPos.x;
          bird.capturedByY = bossPos.y;
          bird.update(delta);
        }

        if (birdKidnap.isDone()) {
          gameModeRef.current   = 'playing';
          birdRef.current       = null;
          spawnTimerRef.current = 0;
          floatingTextsRef.current.push(
            new FloatingText(GAME_W / 2, GAME_H * 0.35, '🐦 Recupere o pássaro!', 'message', 3500),
          );
        }
      }

      // ── Monsters ──
      const pCXupd       = player.position.x + player.size.width / 2;
      const isQuizActive  = quiz.isActive();
      const isBirdMode    = gameModeRef.current !== 'playing';

      monstersRef.current = monstersRef.current.filter((m) => {
        // Freeze all monsters while quiz or bird mode is running
        if (!isQuizActive && !isBirdMode) m.update(delta, GROUND_Y);

        if (m.isDead()) {
          quiz.onMonsterDead(m.id);
          return false;
        }

        if (!isQuizActive && m.position.x <= -160) {
          if (m instanceof EagleMonster) {
            sys.loseLife();
            setLives(sys.lives);
            player.hurt();
            vfx.shake(5, 200);
            sound.play('player_damage');
            floatingTextsRef.current.push(
              new FloatingText(120, GROUND_Y - 100, 'Monstro fugiu! -❤️', 'damage', 1500),
            );
            if (sys.isGameOver()) {
              sound.play('game_over');
              setHighScore(sys.getHighScore());
              tableProgressionRef.current?.saveCheckpoint();
              syncPhase('gameover');
            }
          }
          return false;
        }

        return true;
      });

      // Separate overlapping monsters
      for (let i = 0; i < monstersRef.current.length; i++) {
        for (let j = i + 1; j < monstersRef.current.length; j++) {
          const a = monstersRef.current[i];
          const b = monstersRef.current[j];
          const minD = (a.size.width + b.size.width) * 0.5 + 4;
          const dx   = b.position.x - a.position.x;
          if (Math.abs(dx) < minD) {
            const push = (minD - Math.abs(dx)) * 0.5;
            const dir  = dx >= 0 ? 1 : -1;
            a.position.x -= push * dir;
            b.position.x += push * dir;
          }
        }
      }

      // ── Projectiles ──
      projectilesRef.current = projectilesRef.current.filter((p) => p.active);
      projectilesRef.current.forEach((p) => p.update(delta, GROUND_Y));

      // ── Coins ──
      coinSys.update(delta);
      const coins   = coinSys.getCoins();
      const pCXcoin = player.position.x + player.size.width / 2;
      const pCYcoin = player.position.y + player.size.height * 0.5;
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        if (Math.hypot(c.getBounds().x - pCXcoin, c.getBounds().y - pCYcoin) < 34) {
          floatingTextsRef.current.push(
            new FloatingText(c.getBounds().x, c.getBounds().y - 20, '+10', 'score', 700),
          );
          coinSys.collectCoin(i);
          sys.addScore(10);
          setScore(sys.score);
          sound.play('coin_collect');
          particles.burst(c.getBounds().x, c.getBounds().y, 'spark', 5);
        }
      }

      // ── Passive monster collision ──
      if (!quiz.isActive() && !player.isInvincible() && gameModeRef.current === 'playing') {
        for (const m of monstersRef.current) {
          if (!m.isDying() && rectsOverlap(player.getBounds(), m.getBounds())) {
            if (hammer.isCharged()) {
              m.hit();
              hammer.consume();
              setHammerState(hammer.state);
              setHammerEnergy(hammer.getEnergyFraction());
              const mCX = m.position.x + m.size.width / 2;
              sound.play('monster_hit');
              particles.burst(mCX, m.position.y, 'explosion', 10);
              if (m.isDying()) {
                const pts = (m.isBoss ? 150 : 50) * sys.level;
                sys.addScore(pts);
                setScore(sys.score);
                coinSys.spawnCoins(mCX, m.position.y, 3);
                sound.play('monster_defeated');
              }
            } else {
              sys.loseLife();
              setLives(sys.lives);
              player.hurt();
              vfx.shake(6, 260);
              sound.play('player_damage');
              if (sys.isGameOver()) {
                sound.play('game_over');
                setHighScore(sys.getHighScore());
                tableProgressionRef.current?.saveCheckpoint();
                syncPhase('gameover');
              }
            }
            break;
          }
        }
      }

      // ── Floating texts ──
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
        ft.update(delta);
        return ft.isAlive();
      });

      // Nearest monster equation for HUD (or current lesson equation)
      if (gameModeRef.current === 'bird_lesson' || gameModeRef.current === 'bird_intro') {
        const eq = birdLesson.getCurrentEquation();
        setCurrentEquation(eq ? `${eq.a} × ${eq.b} = ${eq.result}` : undefined);
      } else {
        const sortedMonsters = monstersRef.current
          .filter((m) => !m.isDying() && !m.isDead() && m.operation)
          .sort((a, b) => a.position.x - b.position.x);
        const approaching = sortedMonsters.length > 0
          ? sortedMonsters[sortedMonsters.length - 1]
          : undefined;
        setCurrentEquation(
          approaching?.operation ? `${approaching.operation.a} × ${approaching.operation.b}` : undefined,
        );
      }

      // ══════════════════════════════════════════════════════════════════════
      // RENDER
      // ══════════════════════════════════════════════════════════════════════
      const shake = vfx.getShakeOffset();
      ctx.clearRect(0, 0, GAME_W, GAME_H);
      ctx.save();
      ctx.translate(shake.x, shake.y);

      forest.draw(ctx, GAME_W, GAME_H);
      coinSys.draw(ctx);

      for (const p of projectilesRef.current) {
        p.draw(ctx);
      }

      for (const m of monstersRef.current) {
        m.draw(ctx);

        if (m.operation && !m.isDying()) {
          const opText = `${m.operation.a} × ${m.operation.b}`;
          const mx = m.position.x + m.size.width / 2;
          const my = m.position.y;
          ctx.save();
          ctx.font = 'bold 26px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillText(opText, mx + 2, my - 3 + 2);
          ctx.shadowBlur  = 12;
          ctx.shadowColor = 'rgba(255,220,0,0.8)';
          ctx.fillStyle   = '#ffe844';
          ctx.fillText(opText, mx, my - 3);
          ctx.strokeStyle = '#ff8800';
          ctx.lineWidth   = 1.5;
          ctx.shadowBlur  = 0;
          ctx.strokeText(opText, mx, my - 3);
          ctx.restore();
        }
      }

      player.draw(ctx);

      // Hammer glow
      if (hammer.isCharged()) {
        const hx = player.position.x + player.size.width  / 2;
        const hy = player.position.y + player.size.height * 0.35;
        const r  = hammer.state === 'supercharged' ? 56 : 40;
        const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
        glow.addColorStop(0, hammer.state === 'supercharged' ? 'rgba(255,110,0,0.65)' : 'rgba(255,220,0,0.55)');
        glow.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(hx, hy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const ft of floatingTextsRef.current) {
        ft.draw(ctx);
      }

      particles.draw(ctx);

      // ── Kidnap scene overlay (darkness + boss + message) ─────────────────────
      if (gameModeRef.current === 'bird_kidnapped') {
        birdKidnap.draw(ctx, GAME_W, GAME_H);
      }

      // ── Magic bird (drawn on top so it’s visible over darkness) ─────────────
      const currentBird = birdRef.current;
      if (currentBird) {
        currentBird.draw(ctx);
      }

      // ── Dialogue bubble during lesson ───────────────────────────────────
      if (
        (gameModeRef.current === 'bird_intro' || gameModeRef.current === 'bird_lesson') &&
        currentBird
      ) {
        dialogueBubble.draw(ctx, currentBird, birdLesson, GAME_W, GAME_H);
      }

      // ── Quiz overlay (drawn on top of everything) ────────────────────────
      if (quiz.isActive()) {
        const activeQuiz = quiz.getQuiz();
        if (activeQuiz) quizOverlay.draw(ctx, activeQuiz, player, GAME_W, GAME_H);
      }

      ctx.restore();
      input.flush();
    });

    return () => {
      loop.stop();
      input.destroy();
      sound.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [syncPhase]);

  // ─── Fullscreen ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('fullscreenchange', h);
    return () => window.removeEventListener('fullscreenchange', h);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await wrapRef.current?.requestFullscreen();
      else                             await document.exitFullscreen();
    } catch { /* ignore */ }
  };

  const handleToggleSound = useCallback(() => {
    soundRef.current?.toggle();
    setSoundMuted(soundRef.current?.isMuted() ?? false);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} className="game-wrap" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="game-canvas" />

      <HUD
        lives={lives}
        score={score}
        level={level}
        highScore={highScore}
        combo={combo}
        currentTable={currentTable}
        hammerState={hammerState}
        hammerEnergy={hammerEnergy}
        currentEquation={currentEquation}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
      />

      {phase === 'gameover' && (
        <GameOver score={score} highScore={highScore} onRestart={handleRestart} />
      )}

      <MobileControls
        inputManager={inputRef.current}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
      />

      <button
        className="fullscreen-btn"
        onClick={toggleFullscreen}
        aria-pressed={isFullscreen}
      >
        {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
      </button>
    </div>
  );
}
