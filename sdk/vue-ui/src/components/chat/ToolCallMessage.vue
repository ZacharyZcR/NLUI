<template>
  <div class="pl-2">
    <div
      class="border-l-2 border-amber-400/60 dark:border-amber-500/40 pl-3 py-1 cursor-pointer group/tool"
      @click="open = !open"
    >
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ChevronDown v-if="open" class="w-3 h-3 text-amber-500 dark:text-amber-400" />
        <ChevronRight v-else class="w-3 h-3 text-amber-500 dark:text-amber-400" />
        <span class="font-mono font-medium text-foreground/70">{{ name }}</span>
        <span v-if="!open && args" class="text-muted-foreground/40 truncate flex-1 font-mono text-[11px]">
          {{ preview }}
        </span>
      </div>
      <pre v-if="open && args" class="mt-1.5 text-[11px] text-muted-foreground/80 font-mono bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">{{ formattedArgs }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
  name?: string;
  args?: string;
}>();

const open = ref(false);

const preview = computed(() => {
  if (!props.args) return '';
  try {
    const obj = JSON.parse(props.args);
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const parts = keys.slice(0, 3).map((k) => {
      const v = obj[k];
      const vs = typeof v === 'string' ? (v.length > 20 ? v.slice(0, 20) + '\u2026' : v) : JSON.stringify(v);
      return `${k}: ${vs}`;
    });
    return `{ ${parts.join(', ')}${keys.length > 3 ? ', \u2026' : ''} }`;
  } catch {
    const s = props.args;
    return s.length > 60 ? s.slice(0, 60) + '\u2026' : s;
  }
});

const formattedArgs = computed(() => {
  if (!props.args) return '';
  try {
    return JSON.stringify(JSON.parse(props.args), null, 2);
  } catch {
    return props.args;
  }
});
</script>
