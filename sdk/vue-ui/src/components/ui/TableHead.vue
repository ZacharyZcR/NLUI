<template>
  <th :class="cn('h-8 px-2 text-left align-middle font-medium text-muted-foreground', $attrs.class as string)" v-bind="$attrs">
    <slot />
  </th>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
