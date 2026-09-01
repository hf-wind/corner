export {}

declare global {
  const computed: typeof import('vue').computed
  const nextTick: typeof import('vue').nextTick
  const onBeforeUnmount: typeof import('vue').onBeforeUnmount
  const onMounted: typeof import('vue').onMounted
  const onUnmounted: typeof import('vue').onUnmounted
  const reactive: typeof import('vue').reactive
  const readonly: typeof import('vue').readonly
  const ref: typeof import('vue').ref
  const shallowRef: typeof import('vue').shallowRef
  const useId: typeof import('vue').useId
  const watch: typeof import('vue').watch
  const useRoute: typeof import('vue-router').useRoute
  const useRouter: typeof import('vue-router').useRouter
  const useHead: typeof import('@unhead/vue').useHead
  const routerNavigate: typeof import('./runtime/spaRuntime').routerNavigate
  const useAppConfig: typeof import('./runtime/spaRuntime').useAppConfig
  const useSharedState: typeof import('./runtime/spaRuntime').useSharedState
  const useApi: typeof import('./composables/useApi').useApi
  const useAuth: typeof import('./composables/useAuth').useAuth
  const useIconPicker: typeof import('./composables/useIconPicker').useIconPicker
  const useMediaLibrary: typeof import('./composables/useMediaLibrary').useMediaLibrary
  const useMediaUrl: typeof import('./composables/useMediaUrl').useMediaUrl
  const useMusicPlayerState: typeof import('./composables/useMusicPlayerState').useMusicPlayerState
  const useTheme: typeof import('./composables/useTheme').useTheme
  const useToast: typeof import('./composables/useToast').useToast
  const useTypography: typeof import('./composables/useTypography').useTypography
  const buildMomentTitle: typeof import('./utils/moment').buildMomentTitle
  const buildSlug: typeof import('./utils/postMeta').buildSlug
  const ensureSlug: typeof import('./utils/postMeta').ensureSlug
  const extractMomentImages: typeof import('./utils/moment').extractMomentImages
  const fontPresetOptions: typeof import('./composables/useTypography').fontPresetOptions
  const getDisplayImageUrl: typeof import('./utils/imagePerformance').getDisplayImageUrl
  const localExcerpt: typeof import('./utils/postMeta').localExcerpt
  const momentPlainText: typeof import('./utils/moment').momentPlainText
  const momentPreviewText: typeof import('./utils/moment').momentPreviewText
  const stripMomentImages: typeof import('./utils/moment').stripMomentImages
}
