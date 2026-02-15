<template>
  <div :class="cn('bg-card text-card-foreground rounded-lg border shadow-sm p-6', $attrs.class as string)" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
