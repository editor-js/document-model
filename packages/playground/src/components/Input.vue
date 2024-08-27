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
     * Type of the input to be displayed on the page
     */
    type?: 'contenteditable' | 'input' | 'textarea',

    /**
     * Editor js Document model to attach input to
     */
    model: EditorJSModel;
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

  const caretAdapter = new CaretAdapter(props.model, 0);

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
  <div :class="$style.wrapper">
    <div
      v-if="type === 'contenteditable'"
      ref="input"
      contenteditable
      type="text"
      :class="$style.input"
    />
    <input
      v-else-if="type === 'input'"
      ref="input"
      type="text"
      :class="$style.input"
    >
    <textarea
      v-else-if="type === 'textarea'"
      ref="input"
      :class="$style.input"
    />
    <div
      v-if="index !== null"
      :class="$style.counter"
    >
      {{ index }}
    </div>
  </div>
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
  border: 0px;
  padding: 8px 14px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  font-size: 22px;
  outline: none;

  white-space: pre;
}
</style>
