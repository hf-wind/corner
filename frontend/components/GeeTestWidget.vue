<!-- frontend/components/GeeTestWidget.vue -->
<!-- 极验 bind 模式无感控制器：低风险直接通过，高风险时由极验弹出勾选面板 -->

<template>
  <div class="geetest-slot" :class="`is-${geetest.status.value}`">
    <Transition name="geetest-status" mode="out-in">
      <span v-if="geetest.status.value === 'passed'" key="passed" class="geetest-line is-passed">
        <Icon name="ph:check-circle-bold" />
        验证通过
      </span>
      <span
        v-else-if="geetest.status.value === 'error'"
        key="error"
        class="geetest-line is-error"
      >
        <Icon name="ph:warning-circle-bold" />
        {{ geetest.error.value || "验证失败" }}
        <button type="button" class="geetest-retry" :disabled="running" @click="emitRetry">
          重试
        </button>
      </span>
      <span v-else key="busy" class="geetest-line is-busy">
        <Icon name="ph:circle-notch-bold" spin />
        {{ busyText }}
      </span>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGeeTest } from '@/composables/useGeeTest'

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const geetest = useGeeTest()
const running = ref(false)

const busyText = computed(() => {
  switch (geetest.status.value) {
    case 'loading':
      return '正在加载安全组件…'
    case 'validating':
      return '正在校验环境，请稍候…'
    case 'ready':
    default:
      return '准备校验环境…'
  }
})

function emitRetry() {
  geetest.reset()
  emit('retry')
}

defineExpose({
  /** 运行一次人机验证，成功返回 token（低风险无感通过） */
  run: async (): Promise<string> => {
    running.value = true
    try {
      return await geetest.validate()
    } finally {
      running.value = false
    }
  },
  reset: () => geetest.reset(),
})
</script>

<style scoped>
.geetest-slot {
  display: grid;
  min-height: 56px;
  place-items: center;
  width: 100%;
}

.geetest-line {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--c-text-2);
  font-size: 0.74rem;
  letter-spacing: 0.03em;
}

.geetest-line.is-passed {
  color: var(--c-primary);
  font-weight: 650;
}

.geetest-line.is-error {
  color: #d46a6a;
}

.geetest-retry {
  margin-left: 4px;
  padding: 3px 12px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 99px;
  background: color-mix(in srgb, var(--c-bg-2) 70%, transparent);
  color: var(--c-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 0.66rem;
  transition: color 0.16s ease, border-color 0.16s ease;
}

.geetest-retry:hover:not(:disabled) {
  color: var(--c-primary);
  border-color: color-mix(in srgb, var(--c-primary) 50%, transparent);
}

.geetest-status-enter-active,
.geetest-status-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.geetest-status-enter-from,
.geetest-status-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
