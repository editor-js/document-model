<script setup lang="ts">
import { CaretManagerCaretUpdatedEvent, type EditorJSModel, EventType, Index } from '@editorjs/model';
import { onMounted, ref } from 'vue';

const index = ref<Index | null>(null);

const props = defineProps<{
  /**
   * Editor.js Document model to handle caret index updates on
   */
  model: EditorJSModel;
}>();

onMounted(() => {
  props.model.addEventListener(EventType.CaretManagerUpdated, (evt: CaretManagerCaretUpdatedEvent) => {
    index.value = evt.detail.index;
  });
});
</script>

<template>
  <div
    v-if="index !== null"
    :class="$style.counter"
  >
    {{ index }}
  </div>
</template>

<style module>
  .counter {
    position: absolute;
    top: 0;
    right: 0;
    padding: 8px 14px;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    font-size: 22px;
  }
</style>
