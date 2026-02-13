<template>
  <div class="flex justify-end group/user">
    <div v-if="editing" class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md bg-primary/10 px-4 py-2.5 shadow-sm space-y-2">
      <Textarea
        v-model="editValue"
        class="min-h-[60px] text-sm"
        autofocus
      />
      <div class="flex gap-2 justify-end">
        <Button size="sm" variant="outline" @click="handleCancel">
          <X class="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button size="sm" @click="handleSave">
          <Check class="w-3 h-3 mr-1" />
          Save & Regenerate
        </Button>
      </div>
    </div>
    <div v-else class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm relative">
      <p class="whitespace-pre-wrap text-sm leading-relaxed">{{ content }}</p>
      <div class="absolute top-1.5 right-1.5 opacity-0 group-hover/user:opacity-100 transition-opacity flex gap-1">
        <button
          v-if="onEdit"
          @click="editing = true"
          class="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-background/30 backdrop-blur-sm"
          title="Edit"
        >
          <Edit2 class="w-3.5 h-3.5" />
        </button>
        <button
          v-if="onDelete"
          @click="onDelete"
          class="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-destructive/80 backdrop-blur-sm"
          title="Delete"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
        <button
          @click.stop="copyToClipboard"
          class="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-background/30 backdrop-blur-sm"
          title="Copy"
        >
          <Copy class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Copy, Edit2, Trash2, X, Check } from 'lucide-vue-next';
import Button from '../ui/Button.vue';
import Textarea from '../ui/Textarea.vue';

const props = defineProps<{
  content: string;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}>();

const editing = ref(false);
const editValue = ref(props.content);

const handleSave = () => {
  if (editValue.value.trim() && props.onEdit) {
    props.onEdit(editValue.value.trim());
    editing.value = false;
  }
};

const handleCancel = () => {
  editValue.value = props.content;
  editing.value = false;
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(props.content);
};
</script>
