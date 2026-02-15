<template>
  <div :class="cn('flex flex-col space-y-1.5 pb-4', $attrs.class as string)" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
