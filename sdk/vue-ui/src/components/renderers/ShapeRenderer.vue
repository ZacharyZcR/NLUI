<template>
  <component :is="component" v-bind="componentProps" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { detectShape } from '@/lib/detect-shape';
import type { RenderHint } from '@/lib/render-blocks';
import DataTable from './DataTable.vue';
import KVCard from './KVCard.vue';
import BadgeList from './BadgeList.vue';
import RawView from './RawView.vue';

const props = defineProps<{
  raw: string;
  shape: ReturnType<typeof detectShape>;
  forceType?: RenderHint;
}>();

const component = computed(() => {
  if (props.forceType) {
    const forced = detectShape(props.raw);
    if (props.forceType === 'table' && (forced.type === 'table' || forced.type === 'wrapped-table')) {
      return DataTable;
    }
    if (props.forceType === 'kv' && forced.type === 'kv') {
      return KVCard;
    }
    if (props.forceType === 'badges' && forced.type === 'list') {
      return BadgeList;
    }
  }

  switch (props.shape.type) {
    case 'table':
    case 'wrapped-table':
      return DataTable;
    case 'kv':
      return KVCard;
    case 'list':
      return BadgeList;
    default:
      return RawView;
  }
});

const componentProps = computed(() => {
  if (props.forceType) {
    const forced = detectShape(props.raw);
    if (props.forceType === 'table' && (forced.type === 'table' || forced.type === 'wrapped-table')) {
      return {
        columns: forced.columns,
        rows: forced.rows,
        meta: forced.type === 'wrapped-table' ? forced.meta : undefined,
      };
    }
    if (props.forceType === 'kv' && forced.type === 'kv') {
      return { entries: forced.entries };
    }
    if (props.forceType === 'badges' && forced.type === 'list') {
      return { items: forced.items };
    }
  }

  switch (props.shape.type) {
    case 'table':
      return { columns: props.shape.columns, rows: props.shape.rows };
    case 'wrapped-table':
      return { columns: props.shape.columns, rows: props.shape.rows, meta: props.shape.meta };
    case 'kv':
      return { entries: props.shape.entries };
    case 'list':
      return { items: props.shape.items };
    default:
      return { text: props.raw };
  }
});
</script>
