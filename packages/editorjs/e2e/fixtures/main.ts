import EditorJS from '../../src/index.js';

const editor = new EditorJS({
  holder: document.getElementById('editorjs') as HTMLElement,
  data: {
    blocks: [
      {
        type: 'paragraph',
        data: {
          text: 'Hello world',
        },
      },
    ],
  },
});

editor.isReady
  .then(() => {
    document.body.dataset.editorReady = 'true';
  })
  .catch((error: unknown) => {
    console.error('Editor.js failed to initialize', error);
    document.body.dataset.editorError = String(error);
  });
