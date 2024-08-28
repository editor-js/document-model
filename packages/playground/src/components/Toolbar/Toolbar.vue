<script setup lang="ts">
import { InlineTool } from '@editorjs/dom-adapters';
import { Ref } from 'vue';
import { InlineToolbar } from '.';


defineProps<{
  show: Ref<boolean>;

  tools: InlineTool[];

  toolbar: InlineToolbar;
}>();

</script>

<template>
  <div
    v-if="show.value === true"
    :class="$style['toolbar']"
  >
    <button
      v-for="(tool) in tools"
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
