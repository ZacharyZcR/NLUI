<template>
  <div class="flex-1 min-h-0 overflow-y-auto px-4 py-6">
    <div class="max-w-3xl mx-auto space-y-4">
      <div v-if="messages.length === 0" class="flex items-center justify-center h-full text-muted-foreground text-sm">
        Start a conversation by typing a message below
      </div>
      <Message
        v-for="(msg, index) in messages"
        :key="msg.id"
        :message="msg"
        :isLast="index === messages.length - 1"
        :onEdit="getEditHandler(index)"
        :onDelete="getDeleteHandler(index)"
        :onRetry="getRetryHandler(index, msg)"
      />
      <div v-if="isLoading" class="flex justify-start">
        <div class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm">
          <div class="flex gap-1.5 items-center">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
      <div ref="scrollRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import Message from './Message.vue';
import type { Message as MessageType } from '@/lib/types';

const props = defineProps<{
  messages: MessageType[];
  isLoading?: boolean;
  onRetry?: () => void;
  onEdit?: (index: number, newContent: string) => void;
  onDelete?: (index: number) => void;
}>();

const scrollRef = ref<HTMLDivElement | null>(null);

const getEditHandler = (index: number) => {
  return props.onEdit ? (newContent: string) => props.onEdit!(index, newContent) : undefined;
};

const getDeleteHandler = (index: number) => {
  return props.onDelete ? () => props.onDelete!(index) : undefined;
};

const getRetryHandler = (index: number, msg: MessageType) => {
  return index === props.messages.length - 1 && msg.role === 'assistant' ? props.onRetry : undefined;
};

watch(() => props.messages, () => {
  nextTick(() => {
    setTimeout(() => {
      scrollRef.value?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  });
}, { deep: true });
</script>
