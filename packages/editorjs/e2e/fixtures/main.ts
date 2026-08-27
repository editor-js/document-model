import EditorJS from '../../src/index.js';
import { DEFAULT_BLOCK_TEXT, DEFAULT_PLACEHOLDER } from './constants.js';

/**
 * Block texts to mount. `?text=Alpha&text=Beta` gives a multi-block document; with no
 * `text` param at all the fixture keeps its original single "Hello world" block, so
 * every existing test sees exactly what it did before. An empty value (`?text=`) mounts
 * an empty block, which is how the placeholder tests get one.
 */
const params = new URLSearchParams(window.location.search);
const texts = params.getAll('text');

/**
 * Reaches the paragraph tool as `config.placeholder` (it is the default block tool),
 * which the tool exposes to assistive tech as `aria-placeholder`.
 *
 * `?placeholder=` (empty) mounts the editor with no `placeholder` option at all — the only way
 * to get a block that must *not* carry the attribute, which is what the tool spec requires when
 * nothing is configured. Omitting the param keeps the default every other test is written against.
 */
const placeholder = params.get('placeholder') ?? DEFAULT_PLACEHOLDER;

/**
 * `?editors=2` mounts a second editor on the same page, the way a host with two fields would.
 * Anything the editor puts a document-wide `id` on has to stay unique across instances, so this
 * is what makes that testable — the default stays a single editor.
 *
 * Anything that isn't a positive whole number is rejected rather than coerced: `Number('abc')`
 * is `NaN`, which every comparison below is false against, so a typo would silently mount one
 * editor and let a two-editor test pass without ever having had two
 */
const requestedEditors = Number(params.get('editors') ?? 1);

if (!Number.isInteger(requestedEditors) || requestedEditors < 1) {
  /**
   * Recorded on the body as well as thrown: nothing else reads a module-level throw, and a
   * spec would otherwise just time out waiting for `data-editor-ready` with no clue why
   */
  document.body.dataset.editorError = `"editors" must be a positive whole number, got "${params.get('editors')}"`;

  throw new Error(document.body.dataset.editorError);
}

const holders = [document.getElementById('editorjs') as HTMLElement];

for (let index = 1; index < requestedEditors; index++) {
  const extraHolder = document.createElement('div');

  extraHolder.id = `editorjs-${index + 1}`;
  document.body.appendChild(extraHolder);
  holders.push(extraHolder);
}

const editors = holders.map(holder => new EditorJS({
  holder,
  ...(placeholder !== '' ? { placeholder } : {}),
  data: {
    blocks: (texts.length > 0 ? texts : [DEFAULT_BLOCK_TEXT]).map(text => ({
      type: 'paragraph',
      data: { text },
    })),
  },
}));

Promise.all(editors.map(editor => editor.isReady))
  .then(() => {
    document.body.dataset.editorReady = 'true';
  })
  .catch((error: unknown) => {
    console.error('Editor.js failed to initialize', error);
    document.body.dataset.editorError = String(error);
  });
