import type { InlineFragment, InlineTreeNodeSerialized, TextNodeSerialized } from '../entities/inline-fragments/InlineNode/index.js';

/**
 * Returns the fragments that fall after a given character offset,
 * with their ranges shifted so that `offset` becomes 0.
 * Fragments that end at or before the offset are dropped.
 * @param fragments - source inline fragments
 * @param offset - character offset to slice at
 */
export function sliceFragments(fragments: InlineFragment[], offset: number): InlineFragment[] {
  return fragments
    .map(fragment => ({
      ...fragment,
      range: [Math.max(fragment.range[0] - offset, 0), fragment.range[1] - offset] as [number, number],
    }))
    .filter(fragment => fragment.range[1] > 0);
}

/**
 * Concatenates an array of text node entries into a single InlineTreeNodeSerialized,
 * adjusting fragment ranges so they are relative to the merged value.
 * Each entry's value is appended followed by a newline.
 * @param entries - [key, TextNodeSerialized] pairs to merge
 * @param initial - accumulator seed (already contains the first value/fragments)
 * @param joiner - a substring to add between joined entries, \n by default
 */
export function mergeTextNodes(
  entries: [string, TextNodeSerialized][],
  initial: InlineTreeNodeSerialized,
  /* @todo do some realworld example test to understand which joiner should be here */
  joiner = '\n'
): InlineTreeNodeSerialized {
  return entries.reduce((acc, [, content]) => {
    const currentLength = acc.value.length;

    acc.value += joiner + content.value;
    acc.fragments.push(
      ...content.fragments.map((fragment): InlineFragment => ({
        ...fragment,
        range: [fragment.range[0] + currentLength, fragment.range[1] + currentLength],
      }))
    );

    return acc;
  }, initial);
}
