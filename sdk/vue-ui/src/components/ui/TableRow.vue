<template>
  <tr :class="cn('border-b transition-colors hover:bg-muted/50', $attrs.class as string)" v-bind="$attrs">
    <slot />
  </tr>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
