<template>
  <div class="profile-page admin-page-shell">
    <header class="admin-page-head">
      <div><span>ACCOUNT</span><h1>我的信息</h1><p>维护个人资料、头像与登录密码。</p></div>
    </header>
    <a-spin :spinning="loading">
      <a-card :bordered="false" class="section-card" size="small" title="我的信息">
        <div class="profile-head">
          <div class="avatar-box">
            <img v-if="form.avatar" :src="mediaUrl(form.avatar)" alt="" class="avatar-preview">
            <div v-else class="avatar-fallback">
              <Icon name="ph:user-bold" />
            </div>
            <label class="avatar-upload" :class="{ busy: avatarUploading }">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                hidden
                :disabled="avatarUploading"
                @change="onAvatarPick"
              >
              <Icon :name="avatarUploading ? 'ph:spinner-gap-bold' : 'ph:camera-bold'" />
            </label>
          </div>
          <div class="head-meta">
            <div class="head-name">{{ form.username || '用户' }}</div>
            <div v-if="isAdmin" class="head-role admin">管理员</div>
            <div class="avatar-hint">JPG、PNG 或 WebP，最大 8MB；上传后自动压缩并归入头像文件夹。</div>
            <div class="head-email">{{ form.email }}</div>
            <div class="head-hint">支持 JPG / PNG，上传后自动压缩为 WebP</div>
          </div>
        </div>

        <a-form layout="vertical" class="profile-form" :model="form" @finish="save">
          <a-form-item label="用户名" name="username" :rules="[{ required: true, message: '请输入用户名' }]">
            <a-input v-model:value="form.username" :maxlength="50" placeholder="显示名称" />
          </a-form-item>
          <a-form-item label="邮箱">
            <a-input :value="form.email" disabled />
          </a-form-item>
          <a-form-item label="个人简介">
            <a-textarea v-model:value="form.bio" :rows="4" :maxlength="500" show-count placeholder="介绍一下自己" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="saving"><Icon name="ph:floppy-disk-bold" /> 保存修改</a-button>
          </a-form-item>
        </a-form>
      </a-card>

      <a-card :bordered="false" class="section-card" size="small" title="修改密码" style="margin-top: 16px;">
        <a-form layout="vertical" class="profile-form" :model="pwdForm" @finish="changePassword">
          <a-form-item label="新密码" name="newPassword" :rules="[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]">
            <a-input-password v-model:value="pwdForm.newPassword" placeholder="请输入新密码" />
          </a-form-item>
          <a-form-item label="确认密码" name="confirmPassword" :rules="[{ required: true, message: '请确认密码' }, { validator: validateConfirm }]">
            <a-input-password v-model:value="pwdForm.confirmPassword" placeholder="请再次输入新密码" />
          </a-form-item>
          <a-form-item label="验证码" name="code" :rules="[{ required: true, message: '请输入验证码' }]">
            <div class="code-row">
              <a-input v-model:value="pwdForm.code" placeholder="请输入验证码" :maxlength="6" />
              <a-button :disabled="codeCooldown > 0" @click="sendChangePasswordCode">
                <Icon name="ph:paper-plane-tilt-bold" />
                {{ codeCooldown > 0 ? `${codeCooldown}s` : '发送验证码' }}
              </a-button>
            </div>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="pwdSaving"><Icon name="ph:key-bold" /> 修改密码</a-button>
          </a-form-item>
        </a-form>
      </a-card>
      <AdminPersonalAiTools v-if="isAdmin" />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
const toast = useToast()
const { mediaUrl } = useMediaUrl()
const { user, isAdmin, setSession, token, readStorage, refreshProfile } = useAuth()

const loading = ref(true)
const saving = ref(false)
const avatarUploading = ref(false)
const form = reactive({
  username: '',
  email: '',
  avatar: '',
  bio: '',
})

const pwdSaving = ref(false)
const codeCooldown = ref(0)
const pwdForm = reactive({
  newPassword: '',
  confirmPassword: '',
  code: '',
})

function validateConfirm(_rule: any, value: string) {
  if (value !== pwdForm.newPassword) {
    return Promise.reject(new Error('两次密码输入不一致'))
  }
  return Promise.resolve()
}

let cooldownTimer: ReturnType<typeof setInterval> | null = null

function sendChangePasswordCode() {
  if (!form.email) {
    toast.warning('请先加载个人信息')
    return
  }
  api.post('/auth/send-code', { email: form.email, type: 'change_password' })
    .then((res: any) => {
      if (res.success) {
        toast.success('验证码已发送')
        codeCooldown.value = 60
        cooldownTimer = setInterval(() => {
          codeCooldown.value--
          if (codeCooldown.value <= 0 && cooldownTimer) {
            clearInterval(cooldownTimer)
            cooldownTimer = null
          }
        }, 1000)
      } else {
        toast.warning(res.message || '发送失败')
      }
    })
    .catch((e: any) => {
      toast.error(e?.message || '发送验证码失败')
    })
}

async function changePassword() {
  pwdSaving.value = true
  try {
    await api.post('/auth/change-password', {
      newPassword: pwdForm.newPassword,
      code: pwdForm.code,
    })
    toast.success('密码修改成功')
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    pwdForm.code = ''
  } catch (e: any) {
    toast.error(e?.message || '修改失败')
  }
  pwdSaving.value = false
}

onMounted(async () => {
  readStorage()
  await refreshProfile()
  try {
    const profile = await api.get<any>('/auth/profile')
    form.username = profile?.username || ''
    form.email = profile?.email || ''
    form.avatar = profile?.avatar || ''
    form.bio = profile?.bio || ''
    if (profile && token.value) {
      setSession(token.value, {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        avatar: profile.avatar,
        bio: profile.bio,
        role: profile.role || user.value?.role || 'user',
      })
    }
  } catch {
    toast.error('加载个人信息失败')
  }
  loading.value = false
})

async function onAvatarPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const okType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
  if (!okType) {
    toast.warning('仅支持 JPG / PNG 图片')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    toast.warning('图片请小于 8MB')
    return
  }

  avatarUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'avatar')
    const res = await api.upload<any>('/media/upload', fd)
    const path = res?.path || ''
    if (!path) throw new Error('empty path')
    form.avatar = path
    await api.put('/users/profile', {
      username: form.username.trim() || user.value?.username,
      avatar: path,
      bio: form.bio?.trim() || null,
    })
    if (token.value) {
      setSession(token.value, {
        ...(user.value || { id: '', username: form.username }),
        username: form.username || user.value?.username || '',
        avatar: path,
        bio: form.bio,
        role: user.value?.role || 'user',
      })
    }
    toast.success('头像已更新')
  } catch (err: any) {
    toast.error(err?.message || '头像上传失败')
  }
  avatarUploading.value = false
}

async function save() {
  saving.value = true
  try {
    const res = await api.put<any>('/users/profile', {
      username: form.username.trim(),
      avatar: form.avatar || null,
      bio: form.bio?.trim() || null,
    })
    form.username = res.username || form.username
    form.avatar = res.avatar || ''
    form.bio = res.bio || ''
    if (token.value) {
      setSession(token.value, {
        id: res.id || user.value?.id || '',
        username: res.username,
        email: res.email || form.email,
        avatar: res.avatar,
        bio: res.bio,
        role: res.role || user.value?.role || 'user',
      })
    }
    toast.success('已保存')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  }
  saving.value = false
}
</script>

<style scoped>
.profile-page { width:100%; }
.section-card { border-radius: 10px; }
.profile-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.avatar-box {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid color-mix(in srgb, var(--c-primary) 35%, var(--border));
  background: var(--c-bg-2);
}
.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--c-primary);
  font-size: 1.8rem;
}
.avatar-upload {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 0%);
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.15s;
}
.avatar-box:hover .avatar-upload,
.avatar-upload.busy {
  background: rgb(0 0 0 / 42%);
}
.avatar-hint { margin-top:7px; color:var(--c-text-3); font-size:.7rem; line-height:1.55; }
.avatar-upload.busy {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.head-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--c-text);
}
.head-role {
  display: inline-block;
  margin-top: 4px;
  font-size: 0.72rem;
  padding: 1px 8px;
  border-radius: 999px;
}
.head-role.admin {
  color: var(--c-primary);
  background: var(--c-primary-soft);
  font-weight: 600;
}
.head-email {
  margin-top: 6px;
  font-size: 0.78rem;
  color: var(--c-text-3);
}
.head-hint {
  margin-top: 4px;
  font-size: 0.68rem;
  color: var(--c-text-3);
}
.profile-form { width:min(760px,100%); }
.code-row {
  display: flex;
  gap: 8px;
}
.code-row :deep(.ant-input) {
  flex: 1;
}
</style>
