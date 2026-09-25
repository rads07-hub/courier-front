<script setup>
import { ref } from 'vue'
import PantallaRegistro from './views/PantallaRegistro.vue'
import PantallaSeguimiento from './views/PantallaSeguimiento.vue'

const pantallaActiva = ref('registro') // 'registro' | 'seguimiento'
</script>

<template>
  <nav class="menu">
    <button :class="{ activo: pantallaActiva === 'registro' }" @click="pantallaActiva = 'registro'">
      Registrar envío
    </button>
    <button :class="{ activo: pantallaActiva === 'seguimiento' }" @click="pantallaActiva = 'seguimiento'">
      Seguimiento
    </button>
  </nav>

  <PantallaRegistro v-if="pantallaActiva === 'registro'" />
  <PantallaSeguimiento v-else />
</template>

<style>
.menu { display: flex; gap: 0.5rem; padding: 1rem; background: #1D2839; }
.menu button { background: transparent; color: white; border: none; padding: 0.5rem 1rem; cursor: pointer; opacity: 0.7; }
.menu button.activo { opacity: 1; border-bottom: 2px solid #E2A53D; }
body { margin: 0; }
</style>