import { useEffect, useId } from 'react';

const PREFIX = 'Error: ';
/** Forms currently showing an error. The title keeps its prefix while any do. */
const formsWithErrors = new Set<string>();

function updateTitle() {
  const base = document.title.startsWith(PREFIX)
    ? document.title.slice(PREFIX.length)
    : document.title;
  document.title = formsWithErrors.size > 0 ? `${PREFIX}${base}` : base;
}

/**
 * Prefixes the page title with "Error: " while a form shows errors (GOV.UK
 * pattern). Several forms can use it at once without undoing each other.
 */
export function useErrorTitle(hasError: boolean) {
  const id = useId();

  useEffect(() => {
    if (hasError) formsWithErrors.add(id);
    else formsWithErrors.delete(id);
    updateTitle();

    return () => {
      formsWithErrors.delete(id);
      updateTitle();
    };
  }, [hasError, id]);
}
