import type { MathQuestion } from '../types';

interface Props {
  question: MathQuestion;
  onAnswer: (answer: number) => void;
  selectedAnswer: number | null;
  answerResult: 'correct' | 'wrong' | null;
}

export function QuestionPanel({ question, onAnswer, selectedAnswer, answerResult }: Props) {
  return (
    <div className="question-overlay">
      <div className="question-panel">
        <p className="question-text">{question.question}</p>

        <div className="question-options">
          {question.options.map((opt, i) => {
            let cls = 'option-btn';
            if (selectedAnswer !== null) {
              if (opt === question.answer) cls += ' reveal';
              if (opt === selectedAnswer && answerResult === 'correct') cls += ' correct';
              if (opt === selectedAnswer && answerResult === 'wrong') cls += ' wrong';
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => selectedAnswer === null && onAnswer(opt)}
                disabled={selectedAnswer !== null}
              >
                <span className="option-key">{i + 1}</span>
                {opt}
              </button>
            );
          })}
        </div>

        {answerResult && (
          <div className={`answer-feedback ${answerResult}`}>
            {answerResult === 'correct' ? '✓ Correto! +Pontos' : '✗ Errado! −1 vida'}
          </div>
        )}

        <p className="question-hint">Clique ou pressione 1 – 4</p>
      </div>
    </div>
  );
}
