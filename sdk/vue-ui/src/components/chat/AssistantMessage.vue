<template>
  <div class="flex justify-start group/assistant">
    <div class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm overflow-hidden relative" :class="{ 'space-y-2': hasRenderBlocks }">
      <template v-if="hasRenderBlocks">
        <template v-for="(block, i) in blocks" :key="i">
          <MdPreview
            v-if="block.type === 'markdown'"
            :modelValue="block.content"
            :theme="theme"
            previewTheme="github"
            codeTheme="github"
            language="en-US"
            class="nlui-md"
          />
          <RichResult v-else :raw="block.data" :forceType="block.hint" />
        </template>
      </template>
      <MdPreview
        v-else
        :modelValue="content"
        :theme="theme"
        previewTheme="github"
        codeTheme="github"
        language="en-US"
        class="nlui-md"
      />
      <div class="absolute top-1.5 right-1.5 opacity-0 group-hover/assistant:opacity-100 transition-opacity flex gap-1">
        <button
          v-if="isLast && onRetry"
          @click="onRetry"
          class="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground hover:text-foreground"
          title="Retry"
        >
          <RotateCw class="w-3.5 h-3.5" />
        </button>
        <button
          v-if="onDelete"
          @click="onDelete"
          class="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-destructive/80 text-muted-foreground hover:text-foreground"
          title="Delete"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
        <button
          @click.stop="copyToClipboard"
          class="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground hover:text-foreground"
          title="Copy"
        >
          <Copy class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { Copy, Trash2, RotateCw } from 'lucide-vue-next';
import { MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/preview.css';
import { splitRenderBlocks } from '@/lib/render-blocks';
import RichResult from '../renderers/RichResult.vue';

const props = defineProps<{
  content: string;
  isLast?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
}>();

const theme = inject<'light' | 'dark'>('theme', 'light');
const blocks = computed(() => splitRenderBlocks(props.content));
const hasRenderBlocks = computed(() => blocks.value.length > 1 || blocks.value[0]?.type === 'render');

const copyToClipboard = () => {
  navigator.clipboard.writeText(props.content);
};
</script>
