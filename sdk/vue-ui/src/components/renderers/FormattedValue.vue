<template>
  <span v-if="value === null || value === undefined" class="text-muted-foreground/40 italic">null</span>
  <span v-else-if="typeof value === 'boolean'" :class="value ? 'text-emerald-500' : 'text-red-400'">
    {{ String(value) }}
  </span>
  <span v-else-if="typeof value === 'number'" class="text-blue-500 dark:text-blue-400">
    {{ value }}
  </span>
  <pre v-else-if="typeof value === 'object'" class="whitespace-pre-wrap text-muted-foreground/70 bg-muted/50 rounded px-1.5 py-0.5 text-[10px]">{{ jsonStr }}</pre>
  <template v-else>{{ String(value) }}</template>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: unknown;
}>();

const jsonStr = computed(() => {
  if (typeof props.value === 'object' && props.value !== null) {
    const s = JSON.stringify(props.value, null, 2);
    return s.length > 200 ? s.slice(0, 200) + '\u2026' : s;
  }
  return '';
});
</script>
