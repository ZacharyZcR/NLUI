<template>
  <UserMessage
    v-if="message.role === 'user'"
    :content="message.content"
    :onEdit="onEdit"
    :onDelete="onDelete"
  />
  <AssistantMessage
    v-else-if="message.role === 'assistant'"
    :content="message.content"
    :isLast="isLast"
    :onRetry="onRetry"
    :onDelete="onDelete"
  />
  <ToolCallMessage
    v-else-if="message.role === 'tool_call'"
    :name="message.toolName"
    :args="message.toolArgs"
  />
  <ToolResultMessage
    v-else-if="message.role === 'tool_result'"
    :name="message.toolName"
    :content="message.content"
  />
</template>

<script setup lang="ts">
import type { Message as MessageType } from '@/lib/types';
import UserMessage from './UserMessage.vue';
import AssistantMessage from './AssistantMessage.vue';
import ToolCallMessage from './ToolCallMessage.vue';
import ToolResultMessage from './ToolResultMessage.vue';

defineProps<{
  message: MessageType;
  isLast?: boolean;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onRetry?: () => void;
}>();
</script>
