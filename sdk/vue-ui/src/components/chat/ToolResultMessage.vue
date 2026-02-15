<template>
  <div class="pl-2">
    <div
      class="border-l-2 border-emerald-400/60 dark:border-emerald-500/40 pl-3 py-1 cursor-pointer group/tool"
      @click="open = !open"
    >
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ChevronDown v-if="open" class="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
        <Check v-else class="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
        <span class="font-mono font-medium text-foreground/70">{{ name }}</span>
        <span class="text-muted-foreground/30 text-[10px]">{{ size }}</span>
        <span v-if="!open" class="text-muted-foreground/40 truncate flex-1 font-mono text-[11px]">
          {{ preview.replace(/\n/g, ' ') }}
        </span>
      </div>
      <div v-if="open" class="mt-1.5 relative group" @click.stop>
        <RichResult :raw="content" />
        <button
          @click="handleCopy"
          class="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-foreground"
          title="Copy"
        >
          <Check v-if="copied" class="w-3.5 h-3.5" />
          <Copy v-else class="w-3.5 h-3.5" />
        </button>
        <span v-if="lines > 5" class="absolute bottom-1.5 right-1.5 text-[9px] text-muted-foreground/30 font-mono">
          {{ lines }} lines
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronDown, Check, Copy } from 'lucide-vue-next';
import RichResult from '../renderers/RichResult.vue';

const props = defineProps<{
  name?: string;
  content: string;
}>();

const open = ref(false);
const copied = ref(false);

const preview = computed(() => {
  return props.content.length > 100 ? props.content.slice(0, 100) + '\u2026' : props.content;
});

const lines = computed(() => props.content.split('\n').length);

const size = computed(() => {
  return props.content.length > 1024
    ? `${(props.content.length / 1024).toFixed(1)}KB`
    : `${props.content.length}B`;
});

const handleCopy = (e: Event) => {
  e.stopPropagation();
  navigator.clipboard.writeText(props.content);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
};
</script>
