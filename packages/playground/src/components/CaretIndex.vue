<script setup lang="ts">
import { CaretManagerCaretUpdatedEvent, type EditorJSModel, EventType, Index } from '@editorjs/model';
import { onUpdated, ref } from 'vue';

const indexes = ref<Map<string | number, string>>(new Map());

const props = defineProps<{
  /**
   * Editor.js Document model to handle caret index updates on
   */
  model: EditorJSModel;

  userId: string;
}>();

onUpdated(() => {
  if (!props.model) {
    return;
  }

  props.model.addEventListener(EventType.CaretManagerUpdated, (evt: CaretManagerCaretUpdatedEvent) => {
    if (evt.detail.index !== null) {
      indexes.value.set(evt.detail.userId, Index.parse(evt.detail.index).serialize());
    }
  });
});
</script>

<template>
  <div
    v-for="id in indexes.keys()"
    :key="id"
    :class="$style.counter"
  >
    {{ id }} {{ indexes.get(id) }}
  </div>
</template>

<style module>
  .counter {
    position: absolute;
    top: 50px;
    right: 0;
    padding: 8px 14px;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    font-size: 22px;
  }
</style>
