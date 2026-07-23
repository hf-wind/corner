import type { Ref } from 'vue'

export type FontPresetId = 'rounded' | 'system-rounded' | 'noto' | 'wenkai'

export interface FontPresetOption {
  id: FontPresetId
  label: string
  short: string
}

export const fontPresetOptions: FontPresetOption[] = [
  { id: 'rounded', label: '小米圆润', short: '米' },
  { id: 'system-rounded', label: '系统圆体', short: '圆' },
  { id: 'noto', label: '思源黑体', short: '思' },
  { id: 'wenkai', label: '霞鹜文楷', short: '楷' },
]

const FONT_STORAGE_KEY = 'font-preset'

export function useTypography() {
  const fontPreset: Ref<FontPresetId> = useState('font-preset', () => 'rounded')

  function isFontPreset(value: string | null): value is FontPresetId {
    return fontPresetOptions.some(option => option.id === value)
  }

  function applyFont(preset: FontPresetId) {
    document.documentElement.dataset.font = preset
  }

  function setFontPreset(preset: FontPresetId) {
    fontPreset.value = preset
    localStorage.setItem(FONT_STORAGE_KEY, preset)
    applyFont(preset)
  }

  function init() {
    const saved = localStorage.getItem(FONT_STORAGE_KEY)
    fontPreset.value = isFontPreset(saved) ? saved : 'rounded'
    applyFont(fontPreset.value)
  }

  return {
    fontPreset,
    fontPresets: fontPresetOptions,
    setFontPreset,
    init,
  }
}
