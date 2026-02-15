<template>
  <div class="flex flex-col h-full w-56 shrink-0 border-r bg-card/80">
    <div class="p-3 pb-2">
      <Button
        @click="handleNew"
        class="w-full justify-center"
        variant="outline"
        size="sm"
      >
        <Plus class="w-3.5 h-3.5 mr-1" />
        New Chat
      </Button>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="px-2 pb-2 space-y-0.5">
        <p v-if="conversations.length === 0" class="text-xs text-muted-foreground text-center py-10 opacity-50">
          No conversations yet
        </p>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          :class="[
            'group relative flex items-center rounded-lg px-3 py-2 text-[13px] cursor-pointer transition-colors',
            activeId === conv.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          ]"
          @click="handleSelect(conv.id)"
        >
          <span class="flex-1 truncate">
            {{ conv.title || 'Untitled' }}
          </span>
          <span class="text-[10px] opacity-40 ml-2 shrink-0 group-hover:hidden">
            {{ relativeTime(conv.updatedAt) }}
          </span>
          <Button
            variant="ghost"
            size="sm"
            @click.stop="onDelete(conv.id)"
            class="hidden group-hover:flex w-5 h-5 shrink-0 ml-1 p-0 hover:text-destructive hover:bg-destructive/10"
          >
            <X class="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X, Plus } from 'lucide-vue-next';
import Button from '../ui/Button.vue';
import type { Conversation } from '@/lib/types';

const props = defineProps<{
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}>();

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const handleSelect = (id: string) => {
  props.onSelect(id);
  props.onClose?.();
};

const handleNew = () => {
  props.onNew();
  props.onClose?.();
};
</script>
