<template>
  <span v-if="value === null || value === undefined" class="text-muted-foreground/40 italic">null</span>
  <Badge v-else-if="typeof value === 'boolean'" :variant="value ? 'default' : 'secondary'" class="text-[10px]">
    {{ String(value) }}
  </Badge>
  <span v-else-if="typeof value === 'object'" class="text-muted-foreground/60" :title="jsonStr">
    {{ jsonStr.length > 40 ? jsonStr.slice(0, 40) + '\u2026' : jsonStr }}
  </span>
  <template v-else>{{ String(value) }}</template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Badge from '../ui/Badge.vue';

const props = defineProps<{
  value: unknown;
}>();

const jsonStr = computed(() => {
  if (typeof props.value === 'object' && props.value !== null) {
    return JSON.stringify(props.value);
  }
  return '';
});
</script>
