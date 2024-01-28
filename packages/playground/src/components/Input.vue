<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { BlockToolAdapter, CaretAdapter } from '@editorjs/dom-adapters';
import {
  CaretManagerCaretUpdatedEvent,
  createDataKey,
  type EditorJSModel,
  EventType,
  type Index,
  type TextIndex,
} from '@editorjs/model';

const input1 = ref<HTMLElement | null>(null);
const input2 = ref<HTMLElement | null>(null);
const index = ref<Index | null>(null);

const props = defineProps<{
  /**
   * Editor js Document model to attach input to
   */
  model: EditorJSModel;
}>();

onMounted(() => {
  const caretAdapter = new CaretAdapter(document.body, props.model);
  const blockToolAdapter = new BlockToolAdapter(props.model, caretAdapter, 0);

  if (input1.value !== null) {
    blockToolAdapter.attachInput(createDataKey('text1'), input1.value);

    props.model.addEventListener(EventType.CaretManagerUpdated, (evt: CaretManagerCaretUpdatedEvent) => {
      index.value = evt.detail.index;
    });
  }

  if (input2.value !== null) {
    blockToolAdapter.attachInput(createDataKey('text2'), input2.value);
  }
});
</script>
<template>
  <div :class="$style.wrapper">
    <!-- eslint-disable vue/no-v-html -->
    <div
      ref="input1"
      contenteditable
      type="text"
      :class="$style.input"
    />
    <input
      ref="input2"
      type="text"
      value="Hello world"
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
