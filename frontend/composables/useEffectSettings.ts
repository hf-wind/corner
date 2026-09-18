import { readonly, ref } from "vue";
import { DEFAULT_EFFECT_CONFIG } from "@/utils/effectsEngine";
import type { EffectConfig } from "@/utils/effectsEngine";

interface EffectSettingsContext {
  config: Ref<EffectConfig>
  setConfig: (patch: Partial<EffectConfig>) => void
  reset: () => void
}

let instance: EffectSettingsContext | null = null;

function normalize(raw: Record<string, unknown>): EffectConfig {
  const clickEffects = ["none", "fireworks", "stardust", "hearts"];
  const ambientEffects = ["none", "petals", "fireflies", "starlight"];
  const clamp = (value: unknown, min: number, max: number, fallback: number) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
  };
  return {
    clickEffect: clickEffects.includes(String(raw.clickEffect)) ? (raw.clickEffect as EffectConfig["clickEffect"]) : DEFAULT_EFFECT_CONFIG.clickEffect,
    clickCount: clamp(raw.clickCount, 6, 60, DEFAULT_EFFECT_CONFIG.clickCount),
    clickSpeed: clamp(raw.clickSpeed, 0.5, 2, DEFAULT_EFFECT_CONFIG.clickSpeed),
    ambientEffect: ambientEffects.includes(String(raw.ambientEffect)) ? (raw.ambientEffect as EffectConfig["ambientEffect"]) : DEFAULT_EFFECT_CONFIG.ambientEffect,
    ambientDensity: clamp(raw.ambientDensity, 4, 48, DEFAULT_EFFECT_CONFIG.ambientDensity),
    ambientSpeed: clamp(raw.ambientSpeed, 0.5, 2, DEFAULT_EFFECT_CONFIG.ambientSpeed),
  };
}

export function useEffectSettings(): EffectSettingsContext {
  if (instance) return instance;

  const clientState = useClientState();
  const stored = typeof window === "undefined" ? {} : (clientState.get("site", "effects", {}) as unknown as Record<string, unknown>);
  const config = ref<EffectConfig>(normalize(stored ?? {}));

  function persist() {
    clientState.set("site", "effects", JSON.parse(JSON.stringify(config.value)));
  }

  function setConfig(patch: Partial<EffectConfig>) {
    config.value = normalize({ ...config.value, ...patch } as unknown as Record<string, unknown>);
    persist();
  }

  function reset() {
    config.value = { ...DEFAULT_EFFECT_CONFIG };
    persist();
  }

  instance = { config: readonly(config) as Ref<EffectConfig>, setConfig, reset };
  return instance;
}
