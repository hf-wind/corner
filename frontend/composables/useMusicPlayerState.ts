const playing = ref(false);
export type MusicPlayRequest = {
  name: string;
  artist?: string;
  url: string;
  pic?: string;
  playlist?: string;
  key?: string;
};
const playRequest = shallowRef<
  (MusicPlayRequest & { requestId: number }) | null
>(null);
let requestId = 0;

export function useMusicPlayerState() {
  return {
    playing: readonly(playing),
    setPlaying(v: boolean) {
      playing.value = !!v;
    },
    playRequest: readonly(playRequest),
    requestTrack(track: MusicPlayRequest) {
      playRequest.value = { ...track, requestId: ++requestId };
    },
  };
}
