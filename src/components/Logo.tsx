/**
 * Parity's mark: an equals sign in a rounded square. Parity means equality,
 * and the product lines countries up so they can be compared on equal terms.
 * Decorative: the visible wordmark next to it carries the name.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#2340cc" />
      <rect x="8" y="10.5" width="16" height="3.5" rx="1.75" fill="#ffffff" />
      <rect x="8" y="18" width="16" height="3.5" rx="1.75" fill="#ffd37a" />
    </svg>
  );
}
