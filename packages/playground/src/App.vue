<script setup lang="ts">
// import CaretIndex from '@/components/CaretIndex.vue';
import { EditorDocument, EditorJSModel } from '@editorjs/model';
import Core from '@editorjs/core';
import { ref, onMounted } from 'vue';
import { Node } from './components';

/**
 * Editor document for visualizing
 */
const editorDocument = ref<EditorDocument | null>(null);

/**
 * Serialized document value
 */
const serialized = ref<EditorDocument['serialized'] | null>(null);


/**
 * @todo display caret index somewhere
 */

onMounted(() => {
  new Core({
    holder: document.getElementById('editorjs') as HTMLElement,
    data: {
      blocks: [ {
        type: 'paragraph',
        data: {
          text: 'Hello, <b>World</b>!',
        },
      } ],
    },
    onModelUpdate: (model: EditorJSModel) => {
      serialized.value = model.serialized;
      editorDocument.value = model.devModeGetDocument();
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

    <div :class="$style.body">
      <div>
        <h2 :class="$style.sectionHeading">
          Editor
        </h2>
        <div
          id="editorjs"
          :class="$style.editor"
        />
      </div>
      <div :class="$style.playground">
        <h2 :class="$style.sectionHeading">
          Model Serialized
        </h2>
        <!-- <CaretIndex :model="model" /> -->
        <pre v-if="serialized">{{ serialized }}</pre>
      </div>
      <div :class="$style.output">
        <h2 :class="$style.sectionHeading">
          Model
        </h2>
        <Node
          v-if="editorDocument"
          :node="editorDocument"
        />
      </div>
    </div>
  </div>
</template>

<style module>

.container {
}

.body {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 20px;
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
  padding: 12px 16px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  -webkit-backdrop-filter: blur(30px);
  backdrop-filter: blur(30px);
  z-index: 2;
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

.sectionHeading {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 20px;
  margin-top: 0;
  font-family: var(--rounded-family);
  color: var(--foreground-secondary);
  text-transform: uppercase;
}
</style>
