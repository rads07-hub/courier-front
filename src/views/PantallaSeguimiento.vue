<script setup>
import { ref } from 'vue'

// Verificado contra Mediador.ApplicationCore.Dtos.EnvioConsultaDto — campos exactos, camelCase confirmado en Program.cs
const RUTA_ENVIO = '/envio'

const codigoBuscado = ref('')
const cargando = ref(false)
const errorMensaje = ref('')
const resultado = ref(null)

// Colores por estado, para que la línea de tiempo se lea de un vistazo
const COLOR_ESTADO = {
  COTIZADO: '#8A97AD',
  CONFIRMADO: '#5FA88C',
  ENTREGADO_A_TRANSPORTISTA: '#5FA88C',
  EN_VIAJE: '#E2A53D',
  ARRIBADO: '#E2A53D',
  ENTREGADO: '#5FA88C',
  ANULADO: '#C4573F',
  RECHAZADO: '#C4573F',
  PENDIENTE_CONFIRMACION: '#E2A53D',
}
function colorDe(estado) {
  return COLOR_ESTADO[estado] || '#8A97AD'
}

function formatearFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function buscar() {
  errorMensaje.value = ''
  resultado.value = null

  const codigo = codigoBuscado.value.trim()
  if (!codigo) {
    errorMensaje.value = 'Ingresa un código de seguimiento.'
    return
  }

  cargando.value = true
  try {
    const respuesta = await fetch(`${RUTA_ENVIO}/${encodeURIComponent(codigo)}`)

    if (respuesta.status === 404) {
      errorMensaje.value = 'No se encontró ningún envío con ese código.'
      return
    }
    if (!respuesta.ok) {
      errorMensaje.value = 'El servidor respondió con un error al consultar.'
      return
    }
    resultado.value = await respuesta.json()
  } catch (e) {
    errorMensaje.value = 'No se pudo conectar con el servidor.'
  } finally {
    cargando.value = false
  }
}

// Permite llegar aquí ya con un código, por ejemplo enlazado desde la pantalla de registro
const props = defineProps({ codigoInicial: { type: String, default: '' } })
if (props.codigoInicial) {
  codigoBuscado.value = props.codigoInicial
  buscar()
}
</script>

<template>
  <div class="pantalla-seguimiento">
    <h1>Seguimiento de envío</h1>

    <div class="buscador">
      <input
        v-model="codigoBuscado"
        type="text"
        placeholder="Código de seguimiento — ej: MED-2026-000451"
        @keyup.enter="buscar"
      />
      <button type="button" class="boton-principal" :disabled="cargando" @click="buscar">
        {{ cargando ? 'Buscando…' : 'Buscar' }}
      </button>
    </div>

    <p v-if="errorMensaje" class="error">{{ errorMensaje }}</p>

    <section v-if="resultado" class="resultado">
      <div class="cabecera-resultado">
        <div>
          <span class="etiqueta">Código</span>
          <p class="codigo">{{ resultado.codigoSeguimiento }}</p>
        </div>
        <div>
          <span class="etiqueta">Estado actual</span>
          <p class="estado-actual" :style="{ color: colorDe(resultado.estadoActual) }">
            {{ resultado.estadoActual }}
          </p>
        </div>
      </div>

      <div class="datos-transportista" v-if="resultado.nombreTransportista">
        <p><strong>Transportista:</strong> {{ resultado.nombreTransportista }}</p>
        <p v-if="resultado.precioAcordado != null"><strong>Precio acordado:</strong> S/ {{ resultado.precioAcordado.toFixed(2) }}</p>
        <p v-if="resultado.busAsignado"><strong>Bus asignado:</strong> {{ resultado.busAsignado }}</p>
      </div>

      <h2>Historial</h2>
      <ol class="linea-tiempo">
        <li v-for="(paso, i) in resultado.historial" :key="i">
          <span class="punto" :style="{ backgroundColor: colorDe(paso.estado) }"></span>
          <div class="detalle-paso">
            <p class="estado-paso">{{ paso.estado }}</p>
            <p class="fecha-paso">{{ formatearFecha(paso.fecha) }} · {{ paso.origen }}</p>
            <p v-if="paso.comentario" class="comentario-paso">{{ paso.comentario }}</p>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.pantalla-seguimiento { max-width: 640px; margin: 0 auto; padding: 1.5rem; font-family: sans-serif; }
.buscador { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.buscador input { flex: 1; padding: 0.6rem; }
.boton-principal { background: #1D2839; color: white; border: none; padding: 0.6rem 1.2rem; cursor: pointer; }
.boton-principal:disabled { opacity: 0.5; cursor: not-allowed; }
.error { color: #C4573F; font-weight: bold; }

.resultado { margin-top: 1.5rem; }
.cabecera-resultado { display: flex; gap: 2rem; padding: 1rem; background: #F4F6F8; border-radius: 6px; margin-bottom: 1rem; }
.etiqueta { font-size: 0.8rem; color: #6B7A90; text-transform: uppercase; letter-spacing: 0.05em; }
.codigo { font-size: 1.3rem; font-weight: bold; margin: 0.2rem 0 0; }
.estado-actual { font-size: 1.3rem; font-weight: bold; margin: 0.2rem 0 0; }
.datos-transportista { margin-bottom: 1.5rem; }
.datos-transportista p { margin: 0.2rem 0; }

.linea-tiempo { list-style: none; padding: 0; margin: 0; border-left: 2px solid #D8DEE6; }
.linea-tiempo li { position: relative; padding: 0 0 1.2rem 1.5rem; }
.punto { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: 50%; }
.estado-paso { font-weight: bold; margin: 0; }
.fecha-paso { font-size: 0.85rem; color: #6B7A90; margin: 0.1rem 0; }
.comentario-paso { font-size: 0.85rem; color: #33415A; margin: 0.1rem 0 0; font-style: italic; }
</style>
