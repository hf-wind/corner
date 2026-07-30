<template><AlbumEditor :id="id" /></template>
<script setup lang="ts">definePageMeta({layout:'admin',middleware:'auth',ssr:false});const route=useRoute();const id=computed(()=>String(route.params.id||''));useHead({title:'编辑相册'})</script>
