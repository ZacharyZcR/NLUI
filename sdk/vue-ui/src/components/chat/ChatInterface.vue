<template>
  <div :class="['flex h-full', theme]">
    <ConversationSidebar
      v-if="showSidebar && conversations"
      :conversations="conversationsList"
      :activeId="conversationId || null"
      :onSelect="handleSelectConversation"
      :onNew="handleNewConversation"
      :onDelete="handleDeleteConversation"
    />
    <div class="flex flex-col flex-1 min-w-0 bg-background text-foreground">
      <div
        v-if="error"
        class="bg-destructive/10 text-destructive px-4 py-2 text-sm border-b border-destructive/20"
      >
        Error: {{ error.message }}
      </div>
      <MessageList
        :messages="messages"
        :isLoading="isLoading"
        :onRetry="handleRetry"
      />
      <InputBox :onSend="handleSend" :disabled="isLoading" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, provide } from 'vue';
import MessageList from './MessageList.vue';
import InputBox from './InputBox.vue';
import ConversationSidebar from './ConversationSidebar.vue';
import type { Message } from '@/lib/types';
import type NLUIClient from '@nlui/client';

interface ConversationsReturn {
  conversations: Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
  }>;
  deleteConv: (id: string) => Promise<void>;
}

const props = withDefaults(
  defineProps<{
    client: NLUIClient;
    conversationId?: string | null;
    conversations?: ConversationsReturn;
    showSidebar?: boolean;
    theme?: 'light' | 'dark';
    onConversationChange?: (id: string) => void;
  }>(),
  {
    showSidebar: false,
    theme: 'light',
  }
);

provide('theme', props.theme);

const messages = ref<Message[]>([]);
const isLoading = ref(false);
const error = ref<Error | null>(null);
let msgCounter = 0;

const nextId = () => `msg-${++msgCounter}-${Date.now()}`;

const conversationsList = computed(() => {
  if (!props.conversations) return [];
  return props.conversations.conversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  }));
});

watch(
  () => props.conversationId,
  async (newId) => {
    if (newId) {
      const conv = await props.client.getConversation(newId);
      messages.value = (conv.messages || []).map((m: any, idx: number) => ({
        id: `${newId}-${idx}`,
        role: m.role,
        content: m.content || '',
        toolName: m.tool_name,
        toolArgs: m.tool_arguments,
        timestamp: new Date(),
      }));
    } else {
      messages.value = [];
    }
  },
  { immediate: true }
);

const handleSend = async (text: string) => {
  if (isLoading.value) return;

  messages.value.push({
    id: nextId(),
    role: 'user',
    content: text,
    timestamp: new Date(),
  });
  isLoading.value = true;
  error.value = null;

  let streamId = '';
  let assistantContent = '';

  try {
    await props.client.chat(text, {
      conversationId: props.conversationId || undefined,
      onEvent: (event: any) => {
        if (event.type === 'content_delta') {
          const delta = event.data.delta;
          if (!streamId) {
            streamId = nextId();
            assistantContent = delta;
            messages.value.push({
              id: streamId,
              role: 'assistant',
              content: assistantContent,
              timestamp: new Date(),
            });
          } else {
            assistantContent += delta;
            const last = messages.value[messages.value.length - 1];
            if (last && last.id === streamId) {
              last.content = assistantContent;
            }
          }
        } else if (event.type === 'tool_call') {
          streamId = '';
          const { name, arguments: args } = event.data;
          messages.value.push({
            id: nextId(),
            role: 'tool_call',
            content: '',
            toolName: name,
            toolArgs: args,
            timestamp: new Date(),
          });
        } else if (event.type === 'tool_result') {
          const { name, result } = event.data;
          messages.value.push({
            id: nextId(),
            role: 'tool_result',
            content: result,
            toolName: name,
            timestamp: new Date(),
          });
        } else if (event.type === 'content') {
          streamId = '';
        }
      },
      onDone: (convId: string) => {
        if (!props.conversationId && convId) {
          props.onConversationChange?.(convId);
        }
        isLoading.value = false;
      },
      onError: (err: Error) => {
        error.value = err;
        isLoading.value = false;
      },
    });
  } catch (err) {
    error.value = err as Error;
    isLoading.value = false;
  }
};

const handleRetry = async () => {
  const lastUserMsg = messages.value.findLast((m) => m.role === 'user');
  if (lastUserMsg) {
    await handleSend(lastUserMsg.content);
  }
};

const handleSelectConversation = (id: string) => {
  props.onConversationChange?.(id);
};

const handleNewConversation = () => {
  props.onConversationChange?.('');
};

const handleDeleteConversation = async (id: string) => {
  await props.conversations?.deleteConv(id);
};
</script>
