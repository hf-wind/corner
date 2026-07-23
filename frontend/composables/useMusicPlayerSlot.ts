const slotEl = shallowRef<HTMLElement | null>(null)

export function useMusicPlayerSlot() {
  function registerSlot(el: HTMLElement | null) {
    if (el) slotEl.value = el
  }

  function unregisterSlot(el: HTMLElement | null) {
    if (el && slotEl.value === el) slotEl.value = null
  }

  return {
    slotEl: readonly(slotEl),
    registerSlot,
    unregisterSlot,
  }
}
