<template>
  <div class="flex flex-wrap gap-1">
    <Badge
      v-for="(item, i) in visible"
      :key="i"
      variant="secondary"
      class="text-[11px] font-mono"
    >
      {{ String(item) }}
    </Badge>
    <Badge v-if="overflow > 0" variant="outline" class="text-[10px] text-muted-foreground">
      +{{ overflow }} more
    </Badge>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Badge from '../ui/Badge.vue';

const MAX_ITEMS = 50;

const props = defineProps<{
  items: (string | number | boolean)[];
}>();

const visible = computed(() => props.items.slice(0, MAX_ITEMS));
const overflow = computed(() => props.items.length - MAX_ITEMS);
</script>
