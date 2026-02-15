<template>
  <div class="relative">
    <button
      v-if="hasRich"
      @click.stop="showRaw = !showRaw"
      class="absolute top-0 right-0 z-10 p-1 rounded text-muted-foreground hover:text-foreground bg-muted/70 hover:bg-muted transition-colors"
      :title="showRaw ? 'Rich view' : 'Raw JSON'"
    >
      <SquareDashedBottom v-if="showRaw" class="w-3 h-3" />
      <Braces v-else class="w-3 h-3" />
    </button>
    <RawView v-if="showRaw || (!hasRich && !forceType)" :text="raw" />
    <ShapeRenderer v-else :raw="raw" :shape="shape" :forceType="forceType" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Braces, SquareDashedBottom } from 'lucide-vue-next';
import { detectShape } from '@/lib/detect-shape';
import type { RenderHint } from '@/lib/render-blocks';
import ShapeRenderer from './ShapeRenderer.vue';
import RawView from './RawView.vue';

const props = defineProps<{
  raw: string;
  forceType?: RenderHint;
}>();

const showRaw = ref(false);
const shape = computed(() => detectShape(props.raw));
const hasRich = computed(() => shape.value.type !== 'raw');
</script>
