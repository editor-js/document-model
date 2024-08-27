<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { BlockToolAdapter, CaretAdapter, InlineTool, InlineToolAdapter } from '@editorjs/dom-adapters';
import {
  CaretManagerCaretUpdatedEvent,
  createDataKey,
  createInlineToolName,
  type EditorJSModel,
  EventType,
  FormattingAction,
  InlineFragment,
  type TextIndex,
  type TextRange
} from '@editorjs/model';

const input = ref<HTMLElement | null>(null);
const index = ref<TextRange | null>(null);

const italicTool = {
  name: createInlineToolName('italic'),
  create() {
    return document.createElement('i');
  },
  getAction(range: TextRange, fragments: InlineFragment[]) {
    const action = fragments.length === 0 ? FormattingAction.Format : FormattingAction.Unformat;
    return {
      action,
      range,
    };
  },
} satisfies InlineTool;

const props = withDefaults(
  defineProps<{
    /**
     * Block Tool Adapter instance to use for the input
     */
    blockToolAdapter: BlockToolAdapter;

    /**
     * Type of the input to be displayed on the page
     */
    type?: 'contenteditable' | 'input' | 'textarea',

    /**
     * Input name
     * Used as data key for the Editor.js Model
     */
    name: string;

    /**
     * Editor js Document model to attach input to
     */
    model: EditorJSModel;

    /**
     * Optional input value
     */
    value?: string;
  }>(),
  {
    type: 'contenteditable',
  }
);

onMounted(() => {
  const blockToolAdapter = new BlockToolAdapter(props.model, 0);

  props.model.addBlock({
    name: 'paragraph',
    data: {
      text: {
        $t: 't',
        value: 'Some words inside the input'
      },
    },
  });

  if (input.value !== null) {
    blockToolAdapter.attachInput(createDataKey('text'), input.value);

    props.model.addEventListener(EventType.CaretManagerUpdated, (evt: CaretManagerCaretUpdatedEvent) => {
      index.value = (evt.detail.index as TextIndex)[0];
    });
  }
  
  const inlineToolAdapter = new InlineToolAdapter(props.model, 0, createDataKey('text'), input.value, caretAdapter);

  inlineToolAdapter.attachTool(italicTool);
});
</script>
<template>
  <!-- eslint-disable vue/no-v-text-v-html-on-component vue/no-v-html -->
  <component
    :is="type === 'contenteditable' ? 'div' : type"
    ref="input"
    :contenteditable="type === 'contenteditable' ? true : undefined"
    type="text"
    :class="$style.input"
    :value="type !== 'contenteditable' ? value : undefined"
    v-html="type === 'contenteditable' ? value : undefined"
  />
</template>


<style module>

.wrapper {
  position: relative;
}

.counter {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8px 14px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  font-size: 22px;
}

.input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 14px;
  margin-bottom: 8px;
  background-color: rgba(0, 0, 0, 0.2);
  border: 0;
  border-radius: 10px;
  font-size: 22px;
  outline: none;

  font-family: inherit;

  white-space: pre;
}
</style>
