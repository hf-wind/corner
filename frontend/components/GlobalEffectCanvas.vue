<template>
  <canvas
    ref="canvasRef"
    class="global-effect-canvas"
    aria-hidden="true"
  ></canvas>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { EffectEngine } from "@/utils/effectsEngine";
import { useEffectSettings } from "@/composables/useEffectSettings";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { config } = useEffectSettings();
const { palette } = useTheme();

let engine: EffectEngine | null = null;

onMounted(() => {
  if (!canvasRef.value) return;
  engine = new EffectEngine(canvasRef.value, { interactive: true });
  engine.setPalette(paletteHue(palette.value));
  engine.setConfig(config.value);
  engine.start();
});

watch(
  config,
  (value) => {
    engine?.setConfig(value);
  },
  { deep: true },
);

watch(palette, (value) => {
  engine?.setPalette(paletteHue(value));
});

function paletteHue(value: string) {
  return value === "ocean" ? 220 : value === "sakura" ? 338 : 152;
}

onBeforeUnmount(() => {
  engine?.destroy();
  engine = null;
});
</script>

<style scoped>
.global-effect-canvas {
  position: fixed;
  inset: 0;
  z-index: 11600;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
