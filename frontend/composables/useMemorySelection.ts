type MemorySelection = {
  id: string
  type?: string
  href?: string
  title?: string
  excerpt?: string | null
  placeName?: string
  occurredAt?: string | null
} | null

const selectedMemory = ref<MemorySelection>(null)
const memoryContext = ref("")

export function useMemorySelection() {
  function selectMemory(value: MemorySelection) { selectedMemory.value = value }
  function clearMemory() { selectedMemory.value = null }
  function setMemoryContext(value: string) { memoryContext.value = value }
  function clearMemoryContext() { memoryContext.value = "" }
  return {
    selectedMemory: readonly(selectedMemory),
    memoryContext: readonly(memoryContext),
    selectMemory,
    clearMemory,
    setMemoryContext,
    clearMemoryContext,
  }
}
