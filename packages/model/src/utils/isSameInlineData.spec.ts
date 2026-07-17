/* eslint-disable @typescript-eslint/no-magic-numbers */
import { createInlineToolData } from '@editorjs/model-types';
import { isSameInlineData } from './isSameInlineData.js';

describe('isSameInlineData', () => {
  it('should treat both-undefined as equal', () => {
    expect(isSameInlineData(undefined, undefined)).toBe(true);
  });

  it('should treat undefined and an empty object as equal', () => {
    expect(isSameInlineData(undefined, createInlineToolData({}))).toBe(true);
  });

  it('should return true for deeply equal data', () => {
    expect(isSameInlineData(
      createInlineToolData({ href: 'https://a.com',
        meta: { rel: 'nofollow' } }),
      createInlineToolData({ href: 'https://a.com',
        meta: { rel: 'nofollow' } })
    )).toBe(true);
  });

  it('should return false when a primitive value differs', () => {
    expect(isSameInlineData(
      createInlineToolData({ href: 'https://a.com' }),
      createInlineToolData({ href: 'https://b.com' })
    )).toBe(false);
  });

  it('should return false when a nested value differs', () => {
    expect(isSameInlineData(
      createInlineToolData({ href: 'https://a.com',
        meta: { rel: 'nofollow' } }),
      createInlineToolData({ href: 'https://a.com',
        meta: { rel: 'noopener' } })
    )).toBe(false);
  });

  it('should return false when the set of keys differs', () => {
    expect(isSameInlineData(
      createInlineToolData({ href: 'https://a.com' }),
      createInlineToolData({ href: 'https://a.com',
        title: 'Example' })
    )).toBe(false);
  });

  it('should compare array values by order and content', () => {
    expect(isSameInlineData(
      createInlineToolData({ items: [1, 2, 3] }),
      createInlineToolData({ items: [1, 2, 3] })
    )).toBe(true);

    expect(isSameInlineData(
      createInlineToolData({ items: [1, 2, 3] }),
      createInlineToolData({ items: [3, 2, 1] })
    )).toBe(false);
  });
});
