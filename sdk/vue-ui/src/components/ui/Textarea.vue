<template>
  <textarea
    :class="cn('border-input placeholder:text-muted-foreground focus-visible:border-ring flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none', $attrs.class as string)"
    v-bind="$attrs"
    :value="modelValue"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';

defineProps<{
  modelValue?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
