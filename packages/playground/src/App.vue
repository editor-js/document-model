<script setup lang="ts">
import { Node } from './components';
import { EditorDocument, EditorJSModel } from '@editorjs/model';
import { data } from '../../model/src/mocks/data.ts';
import { InlineToolAdapter } from '@editorjs/dom-adapters';
import { onMounted, ref } from 'vue';


const dataRef = ref({ blocks: [ data.blocks[1] ] });

const input = ref<HTMLElement | null>(null);
let adapterRef: InlineToolAdapter;
const documentRef = ref<EditorDocument | null>(new EditorDocument(dataRef.value));

const onFormat = (tool: string) => {
  adapterRef?.format(tool);
};
const onUnformat = (tool: string) => {
  adapterRef?.unformat(tool);
};

onMounted(() => {
  const model = new EditorJSModel(dataRef.value);

  model.addEventListener('changed', () => {
    dataRef.value = model.serialized;

    documentRef.value = new EditorDocument(dataRef.value);
    window.doc = documentRef.value;
  });

  const adapter = new InlineToolAdapter(model, 0, 'text', input.value);

  const tool1 = {
    name: 'bold',
    create() {
      return window.document.createElement('b');
    },
  };
  const tool2 = {
    name: 'italic',
    create() {
      return window.document.createElement('i');
    },
  };

  adapter.attachTool(tool1);
  adapter.attachTool(tool2);

  adapterRef = adapter;

  // adapter.format('bold', 10, 90);
  // adapter.format('italic', 20, 80);
  // adapter.unformat('bold', 30, 70);

  window.model = model;
  window.adapter = adapter;
  window.doc = documentRef.value;
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
    <div :class="$style.body">
      <div :class="$style.input">
        <div
          ref="input"
          contenteditable="true"
          style="font-size: 20px"
        >
          {{ data.blocks[1].data.text.value }}
        </div>
        <button @click="onFormat('bold')">
          Format Bold
        </button>
        <button @click="onFormat('italic')">
          Format Italic
        </button>
        <button @click="onUnformat('bold')">
          Unformat Bold
        </button>
        <button @click="onUnformat('italic')">
          Unformat Italic
        </button>
        <pre>{{ dataRef }}</pre>
      </div>
      <div :class="$style.output">
        <Node
          :node="documentRef"
        />
      </div>
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

.input {
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
</style>
