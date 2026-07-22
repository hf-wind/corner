const state = reactive({
  visible: false,
  icon: '',
  resolve: null as ((icon: string) => void) | null,
})

export function useIconPicker() {
  function open(initialIcon = ''): Promise<string> {
    state.icon = initialIcon
    state.visible = true
    return new Promise((resolve) => {
      state.resolve = resolve
    })
  }

  function onConfirm(icon: string) {
    state.resolve?.(icon)
    state.resolve = null
    state.visible = false
  }

  function onCancel() {
    state.resolve?.('')
    state.resolve = null
    state.visible = false
  }

  return { state, open, onConfirm, onCancel }
}
