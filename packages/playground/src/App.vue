<script setup lang="ts">
import { Node, Input } from './components';
import { EditorDocument, EditorJSModel, EventType } from '@editorjs/model';
// import { data } from '@editorjs/model/dist/mocks/data.js';
import { ref } from 'vue';

const model = new EditorJSModel({
  blocks: [ {
    name: 'paragraph',
    data: {
      text1: {
        value: '',
        $t: 't',
      },
      text2: {
        value: '',
        $t: 't',
      },
    },
  } ],
});
const document = ref(new EditorDocument(model.serialized));

const serialized = ref(model.serialized);

model.addEventListener(EventType.Changed, () => {
  serialized.value = model.serialized;
  document.value = new EditorDocument(model.serialized);
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
      <div :class="$style.playground">
        <Input
          :model="model"
        />
        <pre>{{ serialized }}</pre>
      </div>
      <div :class="$style.output">
        <Node
          :node="document"
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
</style>
