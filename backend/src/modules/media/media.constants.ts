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
  { key: 'general', label: '通用', preset: true },
]

export const PRESET_FOLDER_KEYS = PRESET_FOLDERS.map((f) => f.key)

export function sanitizeFolder(input?: string | null): string {
  const raw = (input || 'general').trim().toLowerCase()
  const cleaned = raw
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9_\-\u4e00-\u9fa5]/gi, '')
    .slice(0, 80)
  return cleaned || 'general'
}
