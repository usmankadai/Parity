import { useAppSelector } from '../../../app/hooks';
import { Button } from '../../../components/Button';
import { retryMessage } from '../../../components/retryMessage';
import { selectAskState, selectSourceChips } from '../selectors';
import styles from './AskPanel.module.css';

/** The streamed answer, its status, and the rows it was based on. */
export function AnswerPanel({ onTryAgain }: { onTryAgain: () => void }) {
  const ask = useAppSelector(selectAskState);
  const chips = useAppSelector(selectSourceChips);

  if (ask.status === 'idle') return null;

  const busy = ask.status === 'waiting' || ask.status === 'streaming';
  const paragraphs = ask.answer.split(/\n{2,}/).filter((p) => p.trim() !== '');

  return (
    // aria-busy: assistive technology waits for the answer to settle. Progress
    // is announced by the live region in AskPanel, not token by token.
    <div className={styles.answer} aria-busy={busy}>
      <h3 className={styles.answerHeading}>Answer</h3>
      <p className={styles.asked}>
        <span className={styles.askedLabel}>You asked:</span> {ask.question}
      </p>

      {ask.status === 'waiting' && (
        <p className={styles.status}>
          {ask.retry ? retryMessage(ask.retry) : 'Waiting for an answer…'}
        </p>
      )}

      {paragraphs.map((paragraph, index) => (
        // Plain text only: the answer is never rendered as HTML. Index keys are
        // fine here because paragraphs only ever grow at the end.
        <p key={index} className={styles.paragraph}>
          {paragraph}
        </p>
      ))}

      {ask.status === 'done' && paragraphs.length === 0 && (
        <p className={styles.status}>No answer was returned. Try asking in a different way.</p>
      )}

      {ask.status === 'stopped' && <p className={styles.status}>You stopped this answer.</p>}

      {ask.status === 'interrupted' && (
        <div className={styles.problem}>
          <p>
            <strong>Answer interrupted.</strong> {ask.error} The text above may be incomplete.
          </p>
          <Button variant="secondary" onClick={onTryAgain}>
            Try again
          </Button>
        </div>
      )}

      {ask.status === 'error' && (
        <div className={styles.problem}>
          <p>Sorry, the answer could not be loaded. {ask.error}</p>
          <Button variant="secondary" onClick={onTryAgain}>
            Try again
          </Button>
        </div>
      )}

      {chips.length > 0 && (
        <div className={styles.sources}>
          <p className={styles.sourcesLabel}>Based on:</p>
          <ul className={styles.chips}>
            {chips.map((chip) => (
              <li key={chip.id} className={styles.chip}>
                {chip.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ask.sourcesReceived && chips.length === 0 && paragraphs.length > 0 && (
        <p className={styles.status}>No sources cited.</p>
      )}
    </div>
  );
}
