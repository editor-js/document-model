<script setup lang="ts">
import CaretIndex from '@/components/CaretIndex.vue';
import { BlockToolAdapter, CaretAdapter } from '@editorjs/dom-adapters';
import { EditorDocument, EditorJSModel, EventType } from '@editorjs/model';
import Core from '@editorjs/core';
import { ref, onMounted } from 'vue';
import { Input } from './components';

/**
 * Every instance here will be created by Editor.js core
 */
const model = new EditorJSModel();

model.initializeDocument({
  blocks: [
    {
      name: 'paragraph',
      data: {
        text1: {
          value: 'This is contenteditable',
          $t: 't',
        },
        text2: {
          value: 'This is input element',
          $t: 't',
        },
      },
    },
    {
      name: 'paragraph',
      data: {
        text2: {
          value: 'This is textarea element',
          $t: 't',
        },
      },
    },
  ],
});
const editorDocument = ref(new EditorDocument());

editorDocument.value.initialize(model.serialized.blocks);

const caretAdapter = new CaretAdapter(window.document.body, model);
/**
 * Block Tool Adapter instance will be passed to a Tool constructor by Editor.js core
 */
const blockToolAdapter = new BlockToolAdapter(model, caretAdapter, 0);
const anotherBlockToolAdapter = new BlockToolAdapter(model, caretAdapter, 1);

const serialized = ref(model.serialized);

model.addEventListener(EventType.Changed, () => {
  serialized.value = model.serialized;
  editorDocument.value = new EditorDocument();
  editorDocument.value.initialize(model.serialized.blocks);
});

onMounted(() => {
  new Core({
    holder: document.getElementById('editorjs') as HTMLElement,
    data: {
      blocks: [ {
        type: 'paragraph',
        data: {
          text: 'Hello, World!',
        },
      } ],
    },
  });
});

</script>

<template>
  <div
    :class="$style.container"
  >
    <div :class="$style.header">
      <img
        src="./assets/editorjs.svg"
        alt="Editor.js logo"
      >
      Editor.js Document Playground
    </div>
  </div>
  <div :class="$style.body">
    <div :class="$style.playground">
      <CaretIndex :model="model" />
      <Input
        :block-tool-adapter="blockToolAdapter"
        type="contenteditable"
        name="text1"
        value="This is contenteditable"
      />
      <Input
        :block-tool-adapter="blockToolAdapter"
        type="input"
        name="text2"
        value="This is input element"
      />
      <Input
        :block-tool-adapter="anotherBlockToolAdapter"
        type="textarea"
        name="text2"
        value="This is textarea element"
      />
      <pre>{{ serialized }}</pre>
    </div>
    <div :class="$style.output">
      <Node
        :node="editorDocument"
      />
      <div
        id="editorjs"
        :class="$style.editor"
      />
    </div>
  </div>
</template>

<style module>

.container {
  height: 100%;
}

.body {
  padding: 16px;
  display: grid;
  grid-template-columns: 50% 50%;
  grid-gap: 16px;
}

.playground {
  max-width: 100%;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  font-family: var(--rounded-family);
}

.output {

}

.header {
  font-weight: 500;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  background: var(--background);
}

.header img {
  height: 20px;
  margin-right: 0.6em;
}

.property {
  font-family: var(--rounded-family);
  font-size: 14px;
  font-weight: 450;
}

.editor {
  background-color: #111;
  border-radius: 8px;
  padding: 10px;
}
</style>
