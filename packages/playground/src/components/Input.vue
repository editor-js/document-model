<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { BlockToolAdapter } from '@editorjs/dom-adapters';
import {
  CaretManagerCaretUpdatedEvent,
  createDataKey,
  type EditorJSModel,
  EventType,
  type TextIndex,
  type TextRange
} from '@editorjs/model';

const input = ref<HTMLElement | null>(null);
const index = ref<TextRange | null>(null);

const props = defineProps<{
  /**
   * Editor js Document model to attach input to
   */
  model: EditorJSModel;
  type: 'input' | 'textarea' | 'contenteditable';
}>();

onMounted(() => {
  const blockToolAdapter = new BlockToolAdapter(props.model, 0);

  if (input.value !== null) {
    blockToolAdapter.attachInput(createDataKey('text'), input.value);

    props.model.addEventListener(EventType.CaretManagerUpdated, (evt: CaretManagerCaretUpdatedEvent) => {
      index.value = (evt.detail.index as TextIndex)[0];
    });
  }
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
  padding: 8px 14px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  font-size: 22px;
  outline: none;

  white-space: pre;
}
</style>
