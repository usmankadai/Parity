import { useId, useRef, useState, type SubmitEvent } from 'react';
import { ASK_LIMITS } from '../../../api/types';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { selectApiMode } from '../../../app/selectors';
import { Button } from '../../../components/Button';
import { ErrorSummary } from '../../../components/ErrorSummary';
import { LiveRegion } from '../../../components/LiveRegion';
import { useErrorTitle } from '../../../components/useErrorTitle';
import { selectComparisonHasData, selectComparisonStatus } from '../../comparison/selectors';
import { selectCompanyViewActive, selectSelectedCompany } from '../../company/selectors';
import { selectAskState } from '../selectors';
import { askActions, type AskStatus } from '../slice';
import { AnswerPanel } from './AnswerPanel';
import styles from './AskPanel.module.css';

export const STARTER_QUESTIONS = [
  'Where is parental leave most generous?',
  'Which countries would a 25-day annual leave policy fall below the minimum in?',
  'How does sick pay compare?',
];

/** In the company view, lead with the questions a Reward Director asks about their own package. */
export const COMPANY_STARTER_QUESTIONS = [
  'Where is our package below the legal minimum?',
  "Which countries don't offer private health insurance?",
  'Where is parental leave most generous?',
  'How does sick pay compare?',
];

export const EMPTY_QUESTION_MESSAGE = 'Enter a question';

/** The section's id, so a "Jump to Ask" link can reach it on narrow screens. */
export const ASK_SECTION_ID = 'ask';

/** What to announce for each status. Never the text itself, token by token. */
const ANNOUNCEMENTS: Record<AskStatus, string> = {
  idle: '',
  waiting: 'Waiting for an answer',
  streaming: 'Answer started',
  done: 'Answer complete',
  stopped: 'Generation stopped',
  interrupted: 'Answer interrupted',
  error: 'The answer could not be loaded',
};

export function AskPanel() {
  const dispatch = useAppDispatch();
  const ask = useAppSelector(selectAskState);
  const comparisonReady = useAppSelector(selectComparisonStatus) === 'ready';
  const hasData = useAppSelector(selectComparisonHasData);
  const companyActive = useAppSelector(selectCompanyViewActive);
  const apiMode = useAppSelector(selectApiMode);
  const company = useAppSelector(selectSelectedCompany);
  const starters = companyActive ? COMPANY_STARTER_QUESTIONS : STARTER_QUESTIONS;

  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headingId = useId();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  useErrorTitle(error !== null);

  const busy = ask.status === 'waiting' || ask.status === 'streaming';

  function submit(text: string) {
    const trimmed = text.trim();
    if (trimmed === '') {
      setError(EMPTY_QUESTION_MESSAGE);
      return;
    }
    setError(null);
    dispatch(askActions.questionSubmitted(trimmed));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(question);
  }

  function stop() {
    dispatch(askActions.stopRequested());
    // The stop button disappears, so move focus somewhere useful.
    textareaRef.current?.focus();
  }

  return (
    <section id={ASK_SECTION_ID} className={styles.panel} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Ask about this comparison
      </h2>

      {!(comparisonReady && hasData) ? (
        <p className={styles.hint}>Compare at least 2 countries to ask questions about them.</p>
      ) : (
        <>
          <p className={styles.hint}>
            Answers use only the data in the table
            {companyActive && company ? `, including ${company.name}'s figures,` : ''} and list the
            rows they are based on.{' '}
            {apiMode === 'real'
              ? 'Answers are written by an AI model and can be wrong, so check the sources.'
              : 'In this demo, answers are scripted rather than written by an AI.'}
          </p>

          <LiveRegion message={ANNOUNCEMENTS[ask.status]} />

          <div className={styles.starters}>
            <p className={styles.startersLabel}>Try a question:</p>
            <ul className={styles.starterList}>
              {starters.map((starter) => (
                <li key={starter}>
                  <Button
                    variant="secondary"
                    className={styles.starter}
                    onClick={() => {
                      setQuestion(starter);
                      submit(starter);
                    }}
                  >
                    {starter}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {error && <ErrorSummary errors={[{ fieldId: inputId, message: error }]} />}

            <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
              <label htmlFor={inputId} className={styles.label}>
                Your question
              </label>
              <p id={hintId} className={styles.fieldHint}>
                Up to {ASK_LIMITS.maxQuestionLength} characters.
              </p>
              {error && (
                <p id={errorId} className={styles.error}>
                  <span className="visually-hidden">Error:</span> {error}
                </p>
              )}
              <textarea
                ref={textareaRef}
                id={inputId}
                className={styles.textarea}
                rows={3}
                maxLength={ASK_LIMITS.maxQuestionLength}
                value={question}
                aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                aria-invalid={error ? true : undefined}
                onChange={(event) => {
                  setQuestion(event.target.value);
                }}
              />
            </div>

            <div className={styles.actions}>
              <Button type="submit">Ask</Button>
              {busy && (
                <Button variant="secondary" onClick={stop}>
                  Stop generating
                </Button>
              )}
            </div>
          </form>

          <AnswerPanel
            onTryAgain={() => {
              submit(ask.question);
            }}
          />
        </>
      )}
    </section>
  );
}
