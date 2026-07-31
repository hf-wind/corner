<template>
  <svg class="site-wind-logo" viewBox="0 0 64 64" role="img" aria-label="风隅随笔标志">
    <path class="corner" d="M15 14v35h35" />
    <path class="wind wind-one" d="M7 25c11 0 12-8 24-8 7 0 10 3 10 7 0 5-4 8-9 8" />
    <path class="wind wind-two" d="M7 36h37c7 0 11-3 11-8" />
    <path class="wind wind-three" d="M17 46h25c6 0 9 3 9 7" />
    <circle cx="15" cy="14" r="3" />
  </svg>
</template>

<style scoped>
.site-wind-logo { width:100%; height:100%; overflow:visible; fill:none; color:currentColor; }
.corner { stroke:currentColor; stroke-width:2.8; stroke-linecap:round; stroke-linejoin:round; opacity:.32; }
.wind { stroke:currentColor; stroke-width:3.2; stroke-linecap:round; }
.wind-two { opacity:.82; }.wind-three { opacity:.56; }
circle { fill:#d89454; stroke:var(--ld-bg-card); stroke-width:2; }
</style>
