<script setup lang="ts">
import CaretIndex from '@/components/CaretIndex.vue';
import { BlockToolAdapter, CaretAdapter, InlineTool, InlineToolAdapter } from '@editorjs/dom-adapters';
import { createInlineToolName, EditorDocument, EditorJSModel, EventType, InlineFragment, TextRange } from '@editorjs/model';
import { ref } from 'vue';
import { make } from '@editorjs/dom';
import { FormattingAction, IntersectType } from '@editorjs/model/src/entities';
import { Input, Toolbar } from './components';
import { InlineToolbar } from './components/Toolbar';

/**
 * Inline tool mock for playground
 */
const italicTool = {
  name: createInlineToolName('italic'),
  create() {
    return make('i');
  },
  intersectType: IntersectType.Extend,
  getAction(range: TextRange, fragments: InlineFragment[]) {
    const action = fragments.length === 0 ? FormattingAction.Format : FormattingAction.Unformat;

    return {
      action,
      range,
    };
  },
} satisfies InlineTool;

/**
 * Bold tool mock for playground
 */
const boldTool = {
  name: createInlineToolName('bold'),
  create() {
    return make('b');
  },
  intersectType: IntersectType.Extend,
  getAction(range: TextRange, fragments: InlineFragment[]) {
    const action = fragments.length === 0 ? FormattingAction.Format : FormattingAction.Unformat;

    return {
      action,
      range,
    };
  },
} satisfies InlineTool;

const tools: InlineTool[] = [italicTool, boldTool];

/**
 * Every instance here will be created by Editor.js core
 */
const model = new EditorJSModel({
  blocks: [ {
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
  } ],
});
const document = ref(new EditorDocument(model.serialized));
const caretAdapter = new CaretAdapter(window.document.body, model);
/**
 * Block Tool Adapter instance will be passed to a Tool constructor by Editor.js core
 */
const blockToolAdapter = new BlockToolAdapter(model, caretAdapter, 0);
const anotherBlockToolAdapter = new BlockToolAdapter(model, caretAdapter, 1);
const inlineToolAdapter = new InlineToolAdapter(model, caretAdapter);

const serialized = ref(model.serialized);

model.addEventListener(EventType.Changed, () => {
  serialized.value = model.serialized;
  document.value = new EditorDocument(model.serialized);
});

const inlineToolbar = new InlineToolbar(model, inlineToolAdapter, tools);
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
      <Toolbar
        :show="inlineToolbar.show"
        :tools="tools"
        :toolbar="inlineToolbar"
      />
      <pre>{{ serialized }}</pre>
    </div>
    <div :class="$style.output">
      <Node
        :node="document"
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
</style>
