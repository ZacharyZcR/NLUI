<template>
  <div class="border-t bg-card/40 px-4 py-3 shrink-0">
    <div class="flex gap-2 items-end max-w-3xl mx-auto">
      <Textarea
        ref="textareaRef"
        v-model="value"
        @keydown="handleKeyDown"
        @input="handleInput"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="1"
        class="flex-1 min-h-[40px] max-h-[160px] resize-none rounded-xl px-3.5 py-2.5 leading-relaxed"
      />
      <Button
        @click="handleSend"
        :disabled="disabled || !value.trim()"
        size="sm"
        class="h-[40px] px-5 rounded-xl shrink-0"
      >
        <Send class="w-4 h-4 mr-1.5" />
        Send
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Send } from 'lucide-vue-next';
import Button from '../ui/Button.vue';
import Textarea from '../ui/Textarea.vue';

const props = withDefaults(
  defineProps<{
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    placeholder: 'Type a message...',
  }
);

const value = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const handleSend = () => {
  const trimmed = value.value.trim();
  if (!trimmed || props.disabled) return;
  props.onSend(trimmed);
  value.value = '';
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }
  nextTick(() => textareaRef.value?.focus());
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleInput = (e: Event) => {
  const el = e.target as HTMLTextAreaElement;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
};
</script>
