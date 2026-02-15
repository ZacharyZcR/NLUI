<template>
  <input
    :type="type"
    :class="cn('placeholder:text-muted-foreground border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50', $attrs.class as string)"
    v-bind="$attrs"
    :value="modelValue"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';

withDefaults(
  defineProps<{
    type?: string;
    modelValue?: string;
  }>(),
  {
    type: 'text',
  }
);

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
