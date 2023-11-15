<script setup lang="ts">
import { Indent, Value } from '@/components';
import { isObject } from '@/utils/isObject';
import { computed } from 'vue';

const props = defineProps<{
  /**
   * The node to display
   */
  node: object;
}>();

/**
 * The prototype of the node
 */
const prototype = computed(() => {
  return props.node.constructor.prototype;
});

/**
 * Array of properties of an object
 */
type PropsList<Obj> = Array<keyof Obj>

/**
 * Returns the properties of a class instance
 *
 * @param object - The object to get the properties of
 */
function getClassProperties<T extends object>(object: T): PropsList<T> {
  const descriptors = Object.getOwnPropertyDescriptors(object);

  return Object.entries(descriptors)
    .filter(([, descriptor]) => {
      return descriptor.get !== undefined;
    })
    .map(([ name ]) => {
      return name as keyof typeof props.node;
    });
}

/**
 * Returns the properties of an object
 *
 * @param object - The object to get the properties of
 */
const properties = computed<PropsList<typeof props.node>>(() => {
  /**
   * For regular objects we can just return the keys
   */
  if (prototype.value.constructor.name === 'Object') {
    return Object.keys(props.node) as PropsList<typeof props.node>;
  }

  /**
   * For some class instances we need to get the properties from the prototype
   */
  const object = prototype.value;
  const ownProperties = getClassProperties(object);
  const prototypeProperties = object.__proto__.constructor.name !== 'Object' ? getClassProperties(object.__proto__) : [];

  return [
    ...ownProperties,
    ...prototypeProperties,
  ] as PropsList<typeof props.node>;
});

/**
 * Returns the name of the parent object
 *
 * @param object - The object to get the parent name of
 */
function getParentObjectName(object: object): string {
  // @ts-expect-error TS does not support __proto__
  return object.constructor.name || object.__proto__.constructor.name;
}
</script>

<template>
  <div :class="$style.node">
    <div :class="$style.name">
      {{ node.constructor.name }}
    </div>

    <template v-if="isObject(prototype)">
      <Indent
        v-for="property in properties"
        :key="property"
      >
        <div :class="$style.property">
          {{ property }}
        </div>
        <Indent>
          <Value
            v-if="property !== 'parent'"
            :value="node[property]"
          />
          <template v-else>
            ꩜ {{ getParentObjectName(node[property]) }}
          </template>
        </Indent>
      </Indent>
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

.property {
  font-family: var(--rounded-family);
  font-size: 14px;
  font-weight: 450;
  color: rgb(167, 170, 173);
}
</style>
