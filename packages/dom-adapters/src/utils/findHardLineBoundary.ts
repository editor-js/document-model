/**
 * Finds nearest next carriage return symbol from passed position
 *
 * @param text - string to search in
 * @param position - search starting position
 */
export function findNextHardLineBoundary(text: string, position: number): number {
  const nextLineBoundary = /\n/g;

  nextLineBoundary.lastIndex = position;

  const match = nextLineBoundary.exec(text);

  return match ? match.index : text.length;
}

/**
 * Finds nearest previous caret symbol before passed position
 *
 * @param text - sting to search in
 * @param position - search finish position
 */
export function findPreviousHardLineBoundary(text: string, position: number): number {
  const previousLineBoundary = /\n/g;

  let match = previousLineBoundary.exec(text);

  while (match) {
    const newMatch = previousLineBoundary.exec(text);

    if (!newMatch || newMatch.index >= position) {
      break;
    }

    match = newMatch;
  }

  return match && match.index < position ? match.index : 0;
}
