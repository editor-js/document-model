<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { BlockToolAdapter } from '@editorjs/dom-adapters';
import {
  createDataKey
} from '@editorjs/model';

const input = ref<HTMLElement | null>(null);
const props = defineProps<{
  /**
   * Block Tool Adapter instance to use for the input
   */
  blockToolAdapter: BlockToolAdapter;

  /**
   * Input type to use
   */
  type: 'contenteditable' | 'input' | 'textarea';

  /**
   * Input name
   * Used as data key for the Editor.js Model
   */
  name: string;

  /**
   * Optional input value
   */
  value?: string;
}>();

onMounted(() => {
  if (input.value !== null) {
    props.blockToolAdapter.attachInput(createDataKey(props.name), input.value);
  }
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
