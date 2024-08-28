<script setup lang="ts">
import { InlineTool } from '@editorjs/dom-adapters';
import { Ref } from 'vue';
import { InlineToolbar } from '.';


defineProps<{
  /**
   * Toolbar show state
   */
  show: Ref<boolean>;

  /**
   * Tools to be rendered in toolbar
   */
  tools: InlineTool[];

  /**
   * Toolbar instance
   */
  toolbar: InlineToolbar;
}>();

</script>

<template>
  <div
    v-if="show.value === true"
    :class="$style['toolbar']"
  >
    <button
      v-for="(tool, index) in tools"
      :key="index"
      @click="toolbar.apply(tool)"
    >
      {{ tool.name }}
    </button>
  </div>
</template>

<style module>
.toolbar {
  display: flex;
  flex-grow: 1;
}
</style>
