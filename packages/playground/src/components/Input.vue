<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { BlockToolAdapter } from '@editorjs/dom-adapters';
import { CaretUpdatedEvent, createDataKey, type EditorJSModel, type TextIndex, type TextRange } from '@editorjs/model';

const input = ref<HTMLElement | null>(null);
const index = ref<TextRange | null>(null);

const props = defineProps<{
  /**
   * Editor js Document model to attach input to
   */
  model: EditorJSModel;
}>();

onMounted(() => {
  const blockToolAdapter = new BlockToolAdapter(props.model, 0);

  if (input.value !== null) {
    blockToolAdapter.attachInput(createDataKey('text'), input.value);

    props.model.addEventListener('caret-updated', (evt: CaretUpdatedEvent) => {
      index.value = (evt.detail.index as TextIndex)[0];
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
