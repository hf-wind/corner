type MemorySelection = { id: string; type?: string; href?: string } | null

const selectedMemory = ref<MemorySelection>(null)

export function useMemorySelection() {
  function selectMemory(value: MemorySelection) { selectedMemory.value = value }
  function clearMemory() { selectedMemory.value = null }
  return { selectedMemory: readonly(selectedMemory), selectMemory, clearMemory }
}
