<template>
  <Teleport to="body">
    <Transition name="visitor-name">
      <div v-if="visible" class="visitor-name-overlay" role="presentation" @click.self="close">
        <section class="visitor-name-card" role="dialog" aria-modal="true" aria-label="给自己起一个名字">
          <div class="vn-art" aria-hidden="true">
            <span class="vn-orb" /><span class="vn-ring ring-a" /><span class="vn-ring ring-b" />
            <span class="vn-star star-a" /><span class="vn-star star-b" />
          </div>
          <h2>在这座角落留下名字</h2>
          <p>留言与漂流瓶需要署名。名字会随足迹出现在时光留言板与访客记录里。</p>
          <div class="vn-input-wrap">
            <input
              v-model="name"
              :maxlength="20"
              class="vn-input"
              placeholder="给自己起一个名字"
              :aria-label="'名字，' + name.length + ' / 20 字'"
              @keydown.enter="submit"
              @input="trimGuard"
            />
            <span class="vn-count">{{ name.length }}/20</span>
          </div>
          <div class="vn-email-wrap">
            <input
              v-model="mail"
              :maxlength="255"
              type="email"
              class="vn-input"
              placeholder="邮箱（可选）"
              aria-label="邮箱（可选）"
              @keydown.enter="submit"
            />
            <span class="vn-email-note">
              <Icon name="ph:envelope-simple-bold" />
              选填：会随你投出的漂流瓶一起漂向远方，捞到瓶子的旅人可用它联系你（交友、交流都行）。不会展示在留言板等公开位置，也不会被用于其他用途。
            </span>
          </div>
          <div v-if="error" class="vn-error">{{ error }}</div>
          <div class="vn-register-tip">
            <Icon name="ph:sparkle-bold" />
            <p>注册账号可获得 100% 沉浸漂流体验：瓶子被捞起、被回复时实时通知，还能拥有固定联系方式。</p>
            <button type="button" class="vn-register-btn" @click="goRegister">
              注册账号 <Icon name="ph:arrow-up-right-bold" />
            </button>
          </div>
          <div class="vn-actions">
            <button type="button" class="vn-skip" @click="close">稍后再说</button>
            <button type="button" class="vn-submit" :disabled="submitting" @click="submit">
              <Icon :name="submitting ? 'ph:circle-notch-bold' : 'ph:feather-bold'" :spin="submitting" />
              {{ submitting ? '起名中…' : '开始旅程' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    visible: boolean
    initial?: string
    initialEmail?: string
  }>(),
  { initial: '', initialEmail: '' },
)
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', name: string, email: string): void
}>()

const name = ref(props.initial)
const mail = ref('')
const submitting = ref(false)
const error = ref('')

watch(
  () => props.visible,
  (open) => {
    if (open) {
      name.value = props.initial
      mail.value = props.initialEmail
      error.value = ''
      nextTick(() => {
        document.querySelector<HTMLInputElement>('.vn-input')?.focus()
        document.querySelector<HTMLInputElement>('.vn-input')?.select()
      })
    }
  },
)

function trimGuard() {
  name.value = name.value.replace(/\s{2,}/g, ' ').slice(0, 20)
}

function close() {
  if (submitting.value) return
  emit('close')
}

function goRegister() {
  emit('close')
  navigateTo('/register')
}

async function submit() {
  const clean = name.value.trim()
  if (!clean) {
    error.value = '名字不能为空，哪怕是代号也好。'
    return
  }
  const cleanMail = mail.value.trim()
  if (cleanMail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanMail)) {
    error.value = '邮箱格式好像不太对，检查一下？'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await emit('confirm', clean, cleanMail)
    emit('close')
  } catch (err: any) {
    error.value = err?.message || '起名失败，请稍后再试。'
  } finally {
    submitting.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.visitor-name-overlay {
  position: fixed;
  z-index: 13100;
  inset: 0;
  display: grid;
  padding: 18px;
  background: rgb(8 15 24 / 34%);
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
  place-items: center;
}
.visitor-name-card {
  position: relative;
  width: min(390px, calc(100vw - 36px));
  padding: 34px 30px 24px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 22px;
  background: linear-gradient(160deg, var(--ld-bg-card), color-mix(in srgb, var(--ld-bg-card) 92%, var(--c-primary-soft)));
  box-shadow: 0 26px 74px color-mix(in srgb, var(--ld-shadow) 74%, transparent);
  text-align: center;
  animation: vn-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.vn-art {
  position: relative;
  width: 88px;
  height: 88px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, var(--c-primary-soft), color-mix(in srgb, var(--c-primary) 24%, transparent));
  box-shadow: inset 0 0 22px color-mix(in srgb, var(--c-primary) 10%, transparent), 0 12px 30px color-mix(in srgb, var(--c-primary) 16%, transparent);
}
.vn-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, var(--c-primary), color-mix(in srgb, var(--c-primary) 55%, transparent));
  box-shadow: 0 0 20px color-mix(in srgb, var(--c-primary) 42%, transparent);
  transform: translate(-50%, -50%);
}
.vn-ring {
  position: absolute;
  inset: 8px;
  border: 1px dashed color-mix(in srgb, var(--c-primary) 34%, transparent);
  border-radius: 50%;
  animation: vn-spin 14s linear infinite;
}
.vn-ring.ring-b {
  inset: 18px;
  border-style: solid;
  border-color: color-mix(in srgb, var(--c-primary) 20%, transparent);
  animation-direction: reverse;
  animation-duration: 9s;
}
.vn-star {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c-primary) 60%, transparent);
  animation: vn-pulse 3.4s ease-in-out infinite;
}
.vn-star.star-a { top: 10px; right: 14px; }
.vn-star.star-b { bottom: 16px; left: 12px; width: 5px; height: 5px; animation-delay: -1.4s; }
.visitor-name-card h2 {
  margin: 0 0 8px;
  color: var(--c-text);
  font-family: var(--font-heading);
  font-size: 1.08rem;
  letter-spacing: 0.02em;
}
.visitor-name-card > p {
  margin: 0 auto 20px;
  max-width: 290px;
  color: var(--c-text-2);
  font-size: 0.68rem;
  line-height: 1.7;
}
.vn-input-wrap {
  position: relative;
}
.vn-email-wrap {
  margin-top: 10px;
  text-align: left;
}
.vn-email-note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 7px;
  color: var(--c-text-3);
  font-size: 0.56rem;
  line-height: 1.65;
}
.vn-email-note > svg {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--c-primary);
  font-size: 0.72rem;
  opacity: 0.85;
}
.vn-input {
  width: 100%;
  height: 44px;
  padding: 0 46px 0 15px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 32%, var(--border));
  border-radius: 13px;
  background: var(--c-bg-1);
  color: var(--c-text);
  font: inherit;
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.vn-input::placeholder { color: var(--c-text-3); }
.vn-input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-primary) 12%, transparent);
}
.vn-count {
  position: absolute;
  top: 50%;
  right: 13px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  transform: translateY(-50%);
}
.vn-error {
  margin-top: 8px;
  color: #d65463;
  font-size: 0.62rem;
}
.vn-register-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px dashed color-mix(in srgb, var(--c-primary) 38%, var(--border));
  border-radius: 13px;
  background: color-mix(in srgb, var(--c-primary-soft) 40%, var(--ld-bg-card));
  text-align: center;
}
.vn-register-tip > svg { color: var(--c-primary); font-size: 0.95rem; }
.vn-register-tip p { margin: 0; color: var(--c-text-2); font-size: 0.6rem; line-height: 1.65; }
.vn-register-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  padding: 6px 14px;
  border: 1px solid var(--c-primary);
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.vn-register-btn:hover { box-shadow: 0 6px 16px color-mix(in srgb, var(--c-primary) 30%, transparent); transform: translateY(-1px); }
.vn-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 18px;
}
.vn-actions button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 15px;
  border-radius: 11px;
  font: inherit;
  font-size: 0.68rem;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}
.vn-actions button:hover:not(:disabled) { transform: translateY(-1px); }
.vn-skip {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--c-text-3);
}
.vn-submit {
  border: 1px solid var(--c-primary);
  background: var(--c-primary);
  box-shadow: 0 7px 18px color-mix(in srgb, var(--c-primary) 26%, transparent);
  color: #fff;
  font-weight: 700;
}
.vn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
.vn-name-enter-active { transition: opacity 0.24s ease; }
.vn-name-leave-active { transition: opacity 0.18s ease; }
.vn-name-enter-from, .vn-name-leave-to { opacity: 0; }
@keyframes vn-card-in { from { opacity: 0; transform: translateY(14px) scale(0.97); } }
@keyframes vn-spin { to { transform: rotate(360deg); } }
@keyframes vn-pulse { 50% { opacity: 0.35; transform: scale(0.8); } }
@media (prefers-reduced-motion: reduce) {
  .vn-ring, .vn-star { animation: none; }
  .visitor-name-card { animation: none; }
  .vn-name-enter-active, .vn-name-leave-active { transition: none; }
}
</style>
