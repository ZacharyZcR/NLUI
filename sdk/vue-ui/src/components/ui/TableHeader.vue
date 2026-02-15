<template>
  <thead :class="cn('[&_tr]:border-b', $attrs.class as string)" v-bind="$attrs">
    <slot />
  </thead>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
