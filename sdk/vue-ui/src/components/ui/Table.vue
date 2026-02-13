<template>
  <table :class="cn('w-full caption-bottom text-sm', $attrs.class as string)" v-bind="$attrs">
    <slot />
  </table>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
