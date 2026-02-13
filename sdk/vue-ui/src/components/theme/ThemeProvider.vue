<template>
  <div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, watch, onMounted } from 'vue';

type Theme = 'light' | 'dark';

const props = withDefaults(
  defineProps<{
    defaultTheme?: Theme;
  }>(),
  {
    defaultTheme: 'light',
  }
);

const theme = ref<Theme>(props.defaultTheme);

const setTheme = (newTheme: Theme) => {
  theme.value = newTheme;
};

provide('theme', theme);
provide('setTheme', setTheme);

watch(
  theme,
  (newTheme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
  },
  { immediate: true }
);

onMounted(() => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme.value);
});
</script>
