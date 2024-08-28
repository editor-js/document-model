const APOSTROPHE_AND_CURLY_QUOTES = "['\u2018\u2019]";
const PUNCTUATION = '.,!?:;"\\(\\){}\\[\\]<>@*~\\/\\-#$&|^%+=';
const WHITESPACE = '\\s';

const WHITESPACE_AND_PUNCTUATION = `[${WHITESPACE}${PUNCTUATION}]`;

/**
 * Finds the nearest next word boundary from the passed position
 *
 * @param text - string to search in
 * @param position - search starting position
 */
export function findNextWordBoundary(text: string, position: number): number {
  const nextWordBoundary = new RegExp(
    /**
     * Match whitespace or punctuation
     * or an apostrophe or curly quotes followed by a whitespace character or punctuation
     */
    `(${WHITESPACE_AND_PUNCTUATION}|${APOSTROPHE_AND_CURLY_QUOTES}(?=${WHITESPACE_AND_PUNCTUATION}))`,
    'g'
  );

  /**
   * Start searching from the next character to allow word deletion with one non-word character before the word
   */
  nextWordBoundary.lastIndex = position + 1;

  const match = nextWordBoundary.exec(text);

  return match ? match.index : text.length;
}

/**
 * Finds the nearest previous word boundary before the passed position
 *
 * @param text - string to search in
 * @param position - search finish position
 */
export function findPreviousWordBoundary(text: string, position: number): number {
  const previousWordBoundary = new RegExp(
    /**
     * Match whitespace or punctuation,
     * or an apostrophe or curly quotes preceded by whitespace or punctuation
     */
    `(${WHITESPACE_AND_PUNCTUATION}|(?<=${WHITESPACE_AND_PUNCTUATION})${APOSTROPHE_AND_CURLY_QUOTES})`,
    'g'
  );

  let match = previousWordBoundary.exec(text);

  while (match) {
    const newMatch = previousWordBoundary.exec(text);

    if (!newMatch || newMatch.index >= position) {
      break;
    }

    match = newMatch;
  }

  return match && match.index < position ? match.index : 0;
}
