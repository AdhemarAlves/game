import type { MathSystem } from './MathSystem';

export type QuizOptionPosition = 'left' | 'right' | 'up';

export interface QuizOption {
  value: number;
  isCorrect: boolean;
  position: QuizOptionPosition;
}

export interface ActiveQuiz {
  monsterId: number;
  equation: { a: number; b: number; answer: number };
  options: QuizOption[];
  timeLeft: number;
  maxTime: number;
  answered: boolean;
  resultPhase: 'none' | 'correct' | 'wrong' | 'timeout';
  /** ms remaining in the result-display window */
  resultTimer: number;
}

/** ms the result screen is shown before quiz closes */
const RESULT_DISPLAY_MS = 1200;

export class QuizModeSystem {
  private quiz: ActiveQuiz | null = null;
  private readonly triggeredMonsters = new Set<number>();

  /** Horizontal distance (monster left edge → player centre) that triggers a quiz */
  readonly QUIZ_ZONE = 230;

  isActive(): boolean {
    return this.quiz !== null;
  }

  isAnswering(): boolean {
    return this.quiz !== null && !this.quiz.answered;
  }

  getQuiz(): ActiveQuiz | null {
    return this.quiz;
  }

  hasTriggered(monsterId: number): boolean {
    return this.triggeredMonsters.has(monsterId);
  }

  /**
   * Begin a quiz for the given monster / equation.
   * Ignored if a quiz is already running.
   */
  startQuiz(
    monsterId: number,
    a: number,
    b: number,
    math: MathSystem,
    level: number,
  ): void {
    if (this.quiz) return;

    const answer = a * b;

    // 3 shuffled values, correct answer guaranteed to be among them
    const allOptions = math.buildProjectileOptions(answer, a, b, 3);

    // Assign a random position to each option
    const positions: QuizOptionPosition[] = ['left', 'right', 'up'];
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    const options: QuizOption[] = allOptions.map((val, i) => ({
      value: val,
      isCorrect: val === answer,
      position: positions[i],
    }));

    // Difficulty-scaled timer
    const maxTime = level <= 3 ? 6000 : level <= 7 ? 4000 : 3000;

    this.quiz = {
      monsterId,
      equation: { a, b, answer },
      options,
      timeLeft: maxTime,
      maxTime,
      answered: false,
      resultPhase: 'none',
      resultTimer: 0,
    };

    this.triggeredMonsters.add(monsterId);
  }

  /**
   * Advance timers.
   * Returns `'exited'` the frame the result window closes so the caller can
   * resume normal play; otherwise returns `null`.
   */
  update(deltaMs: number): 'exited' | null {
    if (!this.quiz) return null;

    // Result phase: count down display window, then clear
    if (this.quiz.resultPhase !== 'none') {
      this.quiz.resultTimer -= deltaMs;
      if (this.quiz.resultTimer <= 0) {
        this.quiz = null;
        return 'exited';
      }
      return null;
    }

    // Answering phase: count down the allowed time
    if (!this.quiz.answered) {
      this.quiz.timeLeft -= deltaMs;
      if (this.quiz.timeLeft <= 0) {
        this.quiz.timeLeft = 0;
        this.quiz.answered = true;
        this.quiz.resultPhase = 'timeout';
        this.quiz.resultTimer = RESULT_DISPLAY_MS;
      }
    }

    return null;
  }

  /**
   * Player selects an answer by direction.
   * Returns `'correct'`, `'wrong'`, or `null` if the quiz cannot be answered now.
   */
  selectAnswer(position: QuizOptionPosition): 'correct' | 'wrong' | null {
    if (!this.quiz || this.quiz.answered) return null;

    const option = this.quiz.options.find(o => o.position === position);
    if (!option) return null;

    this.quiz.answered = true;
    this.quiz.resultPhase = option.isCorrect ? 'correct' : 'wrong';
    this.quiz.resultTimer = RESULT_DISPLAY_MS;

    return this.quiz.resultPhase as 'correct' | 'wrong';
  }

  /** Call when a monster dies so its quiz (if running) is cleaned up. */
  onMonsterDead(monsterId: number): void {
    if (this.quiz?.monsterId === monsterId) this.quiz = null;
    this.triggeredMonsters.delete(monsterId);
  }

  /**
   * Re-enable a monster ID so it can trigger a new quiz.
   * Used by the boss battle to recycle the same boss ID across patrol cycles.
   */
  clearTrigger(monsterId: number): void {
    this.triggeredMonsters.delete(monsterId);
  }

  reset(): void {
    this.quiz = null;
    this.triggeredMonsters.clear();
  }
}
