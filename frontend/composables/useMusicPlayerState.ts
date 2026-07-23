const playing = ref(false)

export function useMusicPlayerState() {
  return {
    playing: readonly(playing),
    setPlaying(v: boolean) {
      playing.value = !!v
    },
  }
}
