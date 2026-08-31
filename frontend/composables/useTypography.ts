import type { Ref } from 'vue'

export type FontPresetId = 'ayuan' | 'rounded' | 'system-rounded' | 'noto' | 'wenkai'

export interface FontPresetOption {
  id: FontPresetId
  label: string
  short: string
}

export const fontPresetOptions: FontPresetOption[] = [
  { id: 'ayuan', label: '汉仪A圆', short: 'A' },
  { id: 'rounded', label: '小米圆润', short: '米' },
  { id: 'system-rounded', label: '系统圆体', short: '圆' },
  { id: 'noto', label: '思源黑体', short: '思' },
  { id: 'wenkai', label: '霞鹜文楷', short: '楷' },
]

const WENKAI_STYLESHEET_ID = 'font-wenkai-stylesheet'

export function useTypography() {
  const fontPreset: Ref<FontPresetId> = useState('font-preset', () => 'system-rounded')

  function isFontPreset(value: string | null): value is FontPresetId {
    return fontPresetOptions.some(option => option.id === value)
  }

  function applyFont(preset: FontPresetId) {
    document.documentElement.dataset.font = preset
    if (preset === 'wenkai' && !document.getElementById(WENKAI_STYLESHEET_ID)) {
      const link = document.createElement('link')
      link.id = WENKAI_STYLESHEET_ID
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=LXGW+WenKai:wght@300;400;700&display=swap'
      document.head.appendChild(link)
    }
  }

  function setFontPreset(preset: FontPresetId) {
    fontPreset.value = preset
    useClientState().set('site', 'fontPreset', preset)
    applyFont(preset)
  }

  function init() {
    const saved = String(useClientState().get('site', 'fontPreset', ''))
    fontPreset.value = isFontPreset(saved) ? saved : 'system-rounded'
    applyFont(fontPreset.value)
  }

  return {
    fontPreset,
    fontPresets: fontPresetOptions,
    setFontPreset,
    init,
  }
}
