<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  /**
   * True to hide the content.
   */
  collapsed?: boolean
}>();

const isHidden = ref(props.collapsed ?? true);
</script>

<template>
  <div
    :class="$style.indent"
  >
    <template v-if="!isHidden">
      <slot />
    </template>
    <div
      v-else
      :class="$style.collapsed"
      @click="isHidden = false"
    >
      ⇧ Show
    </div>
  </div>
</template>

<style module>
.indent {
  padding: 4px 0 0 20px;
}

.collapsed {
  color: #555;
  cursor: pointer;
}
</style>
