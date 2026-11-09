/**
 * A polite live region. Render it once and change `message` to announce
 * something to screen readers without moving focus.
 */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
