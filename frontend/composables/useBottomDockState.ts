const hidden = ref(false);
const contentReady = ref(true);
const paginationVisible = ref(false);

export function useBottomDockState() {
  return {
    hidden: readonly(hidden),
    contentReady: readonly(contentReady),
    paginationVisible: readonly(paginationVisible),
    setHidden(value: boolean) {
      hidden.value = Boolean(value);
    },
    setContentReady(value: boolean) {
      contentReady.value = Boolean(value);
    },
    setPaginationVisible(value: boolean) {
      paginationVisible.value = Boolean(value);
    },
  };
}
