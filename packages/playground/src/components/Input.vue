<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CaretAdapter, FormattingAction, InlineTool, InlineToolAdapter } from '@editorjs/dom-adapters';
import { createDataKey, createInlineToolName, type EditorJSModel, InlineFragment, TextRange } from '@editorjs/model';

const input = ref<HTMLElement | null>(null);
const index = ref<TextRange | null>(null);

const props = defineProps<{
  /**
   * Editor js Document model to attach input to
   */
  model: EditorJSModel;
}>();

const boldTool = {
  name: createInlineToolName('bold'),
  create() {
    return document.createElement('b');
  },
  getAction(range: TextRange, fragments: InlineFragment[]) {
    const action = fragments.length === 0 ? FormattingAction.Format : FormattingAction.Unformat;

    return {
      action,
      range,
    };
  },
} satisfies InlineTool;

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

onMounted(() => {
  console.log('mounted');
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
    caretAdapter.attachInput(input.value, 'text');

    const inlineToolAdapter = new InlineToolAdapter(props.model, 0, createDataKey('text'), input.value, caretAdapter);

    inlineToolAdapter.attachTool(boldTool);
    inlineToolAdapter.attachTool(italicTool);

    window.inlineToolAdapter = inlineToolAdapter;

    caretAdapter.addEventListener('change', (event) => {
      index.value = (event as CustomEvent<{ index: TextRange }>).detail.index;
    });
  }
});
</script>
<template>
  <div :class="$style.wrapper">
    <!-- eslint-disable vue/no-v-html -->
    <div
      ref="input"
      contenteditable
      type="text"
      :class="$style.input"
      v-html="`Some words inside the input`"
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
  padding: 8px 14px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  font-size: 22px;
  outline: none;
}
</style>
