<template>
  <Card class="py-3 gap-0">
    <div class="px-3">
      <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <template v-for="[key, value] in entries" :key="key">
          <span class="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{{ key }}</span>
          <span class="text-[11px] font-mono break-all">
            <FormattedValue :value="value" />
          </span>
        </template>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import Card from '../ui/Card.vue';
import FormattedValue from './FormattedValue.vue';

defineProps<{
  entries: [string, unknown][];
}>();
</script>
