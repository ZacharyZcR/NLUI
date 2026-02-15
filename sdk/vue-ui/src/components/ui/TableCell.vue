<template>
  <td :class="cn('px-2 py-1.5 align-middle', $attrs.class as string)" v-bind="$attrs">
    <slot />
  </td>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>
