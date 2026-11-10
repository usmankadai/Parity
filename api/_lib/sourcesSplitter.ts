const OPEN = '<sources>';
const CLOSE = '</sources>';

/**
 * Splits a streamed answer into the text to show and the cited row IDs.
 *
 * The model is asked to end with `<sources>id-one,id-two</sources>`. Text is
 * forwarded as it arrives, but everything from `<sources>` onwards is held
 * back. A tag can be split across two pieces of text ("<sou" + "rces>"), so
 * the splitter keeps back any ending that could be the start of the tag until
 * the next piece shows whether it is.
 */
export function createSourcesSplitter() {
  let pending = '';
  let tail = '';
  let inSources = false;

  return {
    /** Takes the next piece of model text and returns what is safe to show now. */
    push(text: string): string {
      if (inSources) {
        tail += text;
        return '';
      }

      pending += text;
      const start = pending.indexOf(OPEN);
      if (start !== -1) {
        inSources = true;
        tail = pending.slice(start + OPEN.length);
        const visible = pending.slice(0, start);
        pending = '';
        return visible;
      }

      // Hold back the longest ending that is a prefix of "<sources>".
      for (let keep = Math.min(OPEN.length - 1, pending.length); keep > 0; keep--) {
        if (OPEN.startsWith(pending.slice(-keep))) {
          const visible = pending.slice(0, -keep);
          pending = pending.slice(-keep);
          return visible;
        }
      }
      const visible = pending;
      pending = '';
      return visible;
    },

    /** Called when the model finishes: any held-back text, and the cited IDs. */
    end(): { text: string; rowIds: string[] } {
      if (!inSources) return { text: pending, rowIds: [] };
      const close = tail.indexOf(CLOSE);
      const list = close === -1 ? tail : tail.slice(0, close);
      const rowIds = list
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean);
      return { text: '', rowIds: [...new Set(rowIds)] };
    },
  };
}
