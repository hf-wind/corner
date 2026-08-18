const recordsIntersecting = ref(false);
const contentReady = ref(true);
const paginationVisible = ref(false);
const autoCollapsed = ref(false);
const activeBottomDock = ref<"music" | "pagination" | null>(null);

export function useBottomDockState() {
  return {
    recordsIntersecting: readonly(recordsIntersecting),
    contentReady: readonly(contentReady),
    paginationVisible: readonly(paginationVisible),
    autoCollapsed: readonly(autoCollapsed),
    activeBottomDock: readonly(activeBottomDock),
    setHidden(value: boolean) {
      recordsIntersecting.value = Boolean(value);
    },
    setRecordsIntersecting(value: boolean) {
      recordsIntersecting.value = Boolean(value);
    },
    setAutoCollapsed(value: boolean) {
      autoCollapsed.value = Boolean(value);
    },
    clearAutoCollapse() {
      autoCollapsed.value = false;
    },
    setActiveBottomDock(value: "music" | "pagination" | null) {
      activeBottomDock.value = value;
    },
    setContentReady(value: boolean) {
      contentReady.value = Boolean(value);
    },
    setPaginationVisible(value: boolean) {
      paginationVisible.value = Boolean(value);
    },
  };
}
