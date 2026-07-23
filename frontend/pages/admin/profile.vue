<template>
  <div class="profile-page">
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
            <div class="head-email">{{ form.email }}</div>
            <div class="head-hint">支持 JPG / PNG，上传后自动压缩为 WebP</div>
          </div>
        </div>

        <a-form layout="vertical" class="profile-form" :model="form" @finish="save">
          <a-form-item label="用户名" name="username" :rules="[{ required: true, message: '请输入用户名' }]">
            <a-input v-model:value="form.username" maxlength="50" placeholder="显示名称" />
          </a-form-item>
          <a-form-item label="邮箱">
            <a-input :value="form.email" disabled />
          </a-form-item>
          <a-form-item label="个人简介">
            <a-textarea v-model:value="form.bio" :rows="4" maxlength="500" show-count placeholder="介绍一下自己" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="saving">保存修改</a-button>
          </a-form-item>
        </a-form>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'

definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

const api = useApi()
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
    message.error('加载个人信息失败')
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
    message.warning('仅支持 JPG / PNG 图片')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    message.warning('图片请小于 8MB')
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
    message.success('头像已更新')
  } catch (err: any) {
    message.error(err?.message || '头像上传失败')
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
    message.success('已保存')
  } catch (e: any) {
    message.error(e?.message || '保存失败')
  }
  saving.value = false
}
</script>

<style scoped>
.profile-page { max-width: 560px; }
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
.profile-form { max-width: 420px; }
</style>
