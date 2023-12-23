<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CaretAdapter } from '@editorjs/dom-adapters';
import { type EditorJSModel, TextRange } from '@editorjs/model';

const input = ref<HTMLElement | null>(null);
const index = ref<TextRange | null>(null);

const props = defineProps<{
  /**
   * Editor js Document model to attach input to
   */
  model: EditorJSModel;
}>();

onMounted(() => {
  const adapter = new CaretAdapter(props.model, 0);

  if (input.value !== null) {
    adapter.attachInput(input.value, 'text');

    adapter.addEventListener('change', (event) => {
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
      v-html="`Some words <b>inside</b> the input`"
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
