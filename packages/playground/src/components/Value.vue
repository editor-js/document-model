<script setup lang="ts">
import { Node, Value } from '@/components';
import { isObject } from '@/utils/isObject';

defineProps<{
  value: object | null | number | string | boolean | Array<unknown>;
}>();
</script>

<template>
  <div :class="$style.value">
    <template v-if="value === null">
      null
    </template>
    <template v-else-if="Array.isArray(value)">
      <Value
        v-for="(item, i) in value"
        :key="i"
        :value="item"
      />
    </template>
    <template v-else-if="isObject(value)">
      <Node
        :node="value"
      />
    </template>
    <template v-else>
      <div :class="$style.value">
        {{ value }}
      </div>
    </template>
  </div>
</template>

<style module>
.name {
  display: inline-flex;
  flex-direction: column;
  color: rgb(20, 146, 250);
  font-size: 14px;
  border-radius: 6px;
  font-family: var(--rounded-family);
}

.value {
  font-family: var(--rounded-family);
  font-size: 14px;
  font-weight: 450;
  color: rgb(248, 177, 25);
}
</style>
