<template>
  <div class="space-y-1.5">
    <div v-if="meta && Object.keys(meta).length > 0" class="flex flex-wrap gap-1">
      <Badge
        v-for="[k, v] in Object.entries(meta)"
        :key="k"
        variant="outline"
        class="text-[10px] font-mono"
      >
        {{ k }}: {{ String(v) }}
      </Badge>
    </div>
    <div class="max-h-72 overflow-y-auto overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              v-for="col in columns"
              :key="col"
              class="font-mono text-[11px] whitespace-nowrap"
            >
              {{ col }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(row, i) in rows" :key="i">
            <TableCell v-for="col in columns" :key="col" class="text-[11px] font-mono">
              <CellValue :value="row[col]" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import Table from '../ui/Table.vue';
import TableHeader from '../ui/TableHeader.vue';
import TableBody from '../ui/TableBody.vue';
import TableRow from '../ui/TableRow.vue';
import TableHead from '../ui/TableHead.vue';
import TableCell from '../ui/TableCell.vue';
import Badge from '../ui/Badge.vue';
import CellValue from './CellValue.vue';

defineProps<{
  columns: string[];
  rows: Record<string, unknown>[];
  meta?: Record<string, unknown>;
}>();
</script>
