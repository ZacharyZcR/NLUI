<template>
  <pre class="text-[11px] text-muted-foreground/80 font-mono bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">{{ formatted }}</pre>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  text: string;
}>();

const formatted = computed(() => {
  try {
    return JSON.stringify(JSON.parse(props.text), null, 2);
  } catch {
    return props.text;
  }
});
</script>
