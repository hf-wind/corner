<template>
  <button
    class="github-button"
    type="button"
    :disabled="loading || disabled"
    @click="handleClick"
  >
    <Icon v-if="!loading" name="ph:github-logo-bold" />
    <span v-if="loading" class="github-button__spinner"></span>
    <span>{{ loading ? '连接中...' : '通过 GitHub 登录' }}</span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  loading?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'login'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false
})

const emit = defineEmits<Emits>()

const handleClick = () => {
  if (!props.loading && !props.disabled) {
    emit('login')
  }
}
</script>

<style scoped>
.github-button {
  position: relative;
  display: flex;
  width: 100%;
  height: 45px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  overflow: hidden;
}

.github-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--ui-shadow-soft);
  border-color: var(--c-primary);
}

.github-button:active:not(:disabled) {
  transform: translateY(0);
}

.github-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.github-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top-color: var(--c-text);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .github-button {
    transition: none;
  }
  
  .github-button:hover:not(:disabled) {
    transform: none;
  }
  
  .github-button__spinner {
    animation: none;
  }
}
</style>
