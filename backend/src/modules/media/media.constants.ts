import { BadRequestException } from '@nestjs/common'

export type MediaFolderDef = {
  key: string
  label: string
  preset: boolean
}

/** System preset folders used by different upload scenarios */
export const PRESET_FOLDERS: MediaFolderDef[] = [
  { key: 'avatar', label: '头像', preset: true },
  { key: 'cover', label: '封面', preset: true },
  { key: 'article', label: '文章', preset: true },
  { key: 'emoji', label: '表情', preset: true },
  { key: 'moment', label: '瞬间', preset: true },
  { key: 'album', label: '相册', preset: true },
  { key: 'audio', label: '音频', preset: true },
  { key: 'video', label: '视频', preset: true },
  { key: 'document', label: '文档', preset: true },
  { key: 'story', label: '航线故事', preset: true },
  { key: 'place', label: '地点', preset: true },
  { key: 'general', label: '通用', preset: true },
]

export const PRESET_FOLDER_KEYS = PRESET_FOLDERS.map((f) => f.key)

export function sanitizeFolder(input?: string | null): string {
  const raw = (input || 'general').trim().toLowerCase().replace(/\\/g, '/')
  if (raw.startsWith('/') || raw.endsWith('/') || raw.includes('..')) {
    throw new BadRequestException('媒体文件夹路径无效')
  }
  const segments = raw.split('/')
  if (segments.some(segment => !segment || !/^[a-z0-9_\-\u4e00-\u9fa5]+$/i.test(segment))) {
    throw new BadRequestException('媒体文件夹名称只能包含中英文、数字、下划线和连字符')
  }
  if (segments.length > 1) {
    const [namespace, id, ...rest] = segments
    if (namespace !== 'article' || rest.length || !/^[0-9a-f-]{36}$/.test(id || '')) {
      throw new BadRequestException('仅文章媒体支持二级文件夹')
    }
  }
  const cleaned = segments.join('/').slice(0, 100)
  return cleaned || 'general'
}
