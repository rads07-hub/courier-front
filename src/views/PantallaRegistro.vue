<script setup>
import { ref, computed } from 'vue'

// ============================================================
// AJUSTAR ANTES DE USAR:
// Si tu proyecto tiene un archivo utils/api.js con llamadas ya
// configuradas, usa esas funciones en vez de fetch() directo.
// Estas rutas asumen que /cotizar y /confirmar están disponibles
// en la misma base que el resto de tu API. Si tu backend usa un
// prefijo distinto (por ejemplo /api/mediador/cotizar), ajústalo
// en las dos constantes de abajo.
// ============================================================
const RUTA_COTIZAR = '/cotizar'
const RUTA_CONFIRMAR = '/confirmar'
// AJUSTAR si tu proyecto sirve la API en otra base (por ejemplo con proxy /api en vite.config).
// Verificado contra el código real: las rutas del Mediador son exactamente estas, en la raíz.

// Catálogo fijo para la demo — reemplazar por datos reales si hace falta
const UBIGEOS = [
  { valor: '150101', texto: 'Lima' },
  { valor: '130101', texto: 'Trujillo' },
  { valor: '040101', texto: 'Arequipa' },
]
const TIPOS_CARGA = [
  { valor: 'DOCUMENTOS', texto: 'Documentos' },
  { valor: 'PAQUETE_PEQUENO', texto: 'Paquete pequeño' },
  { valor: 'CARGA_LIVIANA', texto: 'Carga liviana' },
  { valor: 'CARGA_PESADA', texto: 'Carga pesada' },
]

// ---------- Paso 1: datos del envío ----------
const idEnvioCourier = ref('')       // el identificador real del envío en Courier
const idCourier = ref(1)
const ubigeoOrigen = ref('150101')
const ubigeoDestino = ref('130101')
const tipoCarga = ref('CARGA_LIVIANA')
const paquetes = ref([
  { descripcion: '', pesoKg: null, cantidad: 1, esFragil: false },
])

function agregarPaquete() {
  paquetes.value.push({ descripcion: '', pesoKg: null, cantidad: 1, esFragil: false })
}
function quitarPaquete(indice) {
  if (paquetes.value.length > 1) paquetes.value.splice(indice, 1)
}
const pesoTotal = computed(() =>
  paquetes.value.reduce((suma, p) => suma + (Number(p.pesoKg) || 0) * (Number(p.cantidad) || 1), 0)
)

// ---------- Estado general ----------
const cargando = ref(false)
const errorMensaje = ref('')
const idCorrelacionActual = ref('')

function generarIdCorrelacion() {
  return 'COU-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
}

// ---------- Paso 2: cotizar ----------
const opciones = ref([])
const sinOpcionesMotivo = ref('')
const opcionElegida = ref(null)

async function cotizar() {
  errorMensaje.value = ''
  opciones.value = []
  sinOpcionesMotivo.value = ''
  opcionElegida.value = null

  if (!idEnvioCourier.value || !ubigeoDestino.value || paquetes.value.length === 0) {
    errorMensaje.value = 'Falta el identificador del envío, el destino, o no hay paquetes.'
    return
  }

  idCorrelacionActual.value = generarIdCorrelacion()
  cargando.value = true

  const cuerpo = {
    idCorrelacion: idCorrelacionActual.value,
    idEnvioCourier: idEnvioCourier.value,
    idCourier: Number(idCourier.value),
    ubigeoOrigen: ubigeoOrigen.value || null,
    ubigeoDestino: ubigeoDestino.value,
    tipoCarga: tipoCarga.value,
    fechaSolicitud: new Date().toISOString(),
    paquetes: paquetes.value.map(p => ({
      descripcion: p.descripcion || null,
      pesoKg: Number(p.pesoKg),
      cantidad: Number(p.cantidad) || 1,
      esFragil: !!p.esFragil,
    })),
  }

  try {
    const respuesta = await fetch(RUTA_COTIZAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const datos = await respuesta.json()

    if (!respuesta.ok) {
      errorMensaje.value = 'El servidor respondió con un error al cotizar.'
      return
    }
    if (datos.estado === 'SIN_OPCIONES') {
      sinOpcionesMotivo.value = datos.motivo || 'No hay opciones disponibles.'
      return
    }
    opciones.value = datos.opciones || []
    if (opciones.value.length > 0) {
      opcionElegida.value = opciones.value[0].idOpcion // la más barata, ya viene ordenada
    }
  } catch (e) {
    errorMensaje.value = 'No se pudo conectar con el servidor. Verifica que el Mediador esté corriendo.'
  } finally {
    cargando.value = false
  }
}

// ---------- Paso 3: datos de remitente y consignado ----------
const mostrarFormularioConfirmar = ref(false)
const remitente = ref({ tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidos: '', telefono: '' })
const consignado = ref({ tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidos: '', telefono: '', direccion: '', ubigeo: '' })

function irAConfirmar() {
  if (!opcionElegida.value) {
    errorMensaje.value = 'Elige una opción antes de continuar.'
    return
  }
  mostrarFormularioConfirmar.value = true
}

// ---------- Paso 4: confirmar ----------
const resultadoConfirmacion = ref(null)
const precioCambio = ref(null)

async function confirmar() {
  errorMensaje.value = ''
  cargando.value = true

  const cuerpo = {
    idCorrelacion: idCorrelacionActual.value,
    idOpcion: opcionElegida.value,
    remitente: { ...remitente.value },
    consignado: { ...consignado.value, ubigeo: consignado.value.ubigeo || ubigeoDestino.value },
  }

  try {
    const respuesta = await fetch(RUTA_CONFIRMAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const datos = await respuesta.json()

    if (!respuesta.ok) {
      errorMensaje.value = 'El servidor respondió con un error al confirmar.'
      return
    }
    if (datos.estado === 'PRECIO_CAMBIO') {
      precioCambio.value = datos
      return
    }
    if (datos.estado === 'OPCION_EXPIRADA') {
      errorMensaje.value = 'La cotización venció. Vuelve a cotizar.'
      return
    }
    if (datos.estado !== 'CONFIRMADO') {
      errorMensaje.value = `El servidor respondió "${datos.estado}": ${datos.motivo || 'sin más detalle.'}`
      return
    }
    resultadoConfirmacion.value = datos
  } catch (e) {
    errorMensaje.value = 'No se pudo conectar con el servidor al confirmar.'
  } finally {
    cargando.value = false
  }
}

async function aceptarPrecioNuevo() {
  if (!precioCambio.value) return
  opcionElegida.value = precioCambio.value.idOpcionActualizada
  precioCambio.value = null
  await confirmar()
}

function reiniciar() {
  idEnvioCourier.value = ''
  paquetes.value = [{ descripcion: '', pesoKg: null, cantidad: 1, esFragil: false }]
  opciones.value = []
  opcionElegida.value = null
  mostrarFormularioConfirmar.value = false
  resultadoConfirmacion.value = null
  precioCambio.value = null
  errorMensaje.value = ''
}
</script>

<template>
  <div class="pantalla-registro">
    <h1>Registrar envío</h1>

    <!-- ================= PASO 1: DATOS DEL ENVÍO ================= -->
    <section v-if="!resultadoConfirmacion" class="bloque">
      <h2>1. Datos del envío</h2>

      <label>
        Identificador del envío en Courier
        <input v-model="idEnvioCourier" type="text" placeholder="Ej: 89" />
      </label>

      <label>
        Origen
        <select v-model="ubigeoOrigen">
          <option v-for="u in UBIGEOS" :key="u.valor" :value="u.valor">{{ u.texto }}</option>
        </select>
      </label>

      <label>
        Destino
        <select v-model="ubigeoDestino">
          <option v-for="u in UBIGEOS" :key="u.valor" :value="u.valor">{{ u.texto }}</option>
        </select>
      </label>

      <label>
        Tipo de carga
        <select v-model="tipoCarga">
          <option v-for="t in TIPOS_CARGA" :key="t.valor" :value="t.valor">{{ t.texto }}</option>
        </select>
      </label>

      <h3>Paquetes</h3>
      <div v-for="(p, i) in paquetes" :key="i" class="fila-paquete">
        <input v-model="p.descripcion" type="text" placeholder="Descripción" />
        <input v-model.number="p.pesoKg" type="number" step="0.01" placeholder="Peso (kg)" />
        <input v-model.number="p.cantidad" type="number" min="1" placeholder="Cantidad" />
        <label class="fragil">
          <input v-model="p.esFragil" type="checkbox" /> Frágil
        </label>
        <button type="button" @click="quitarPaquete(i)" :disabled="paquetes.length === 1">Quitar</button>
      </div>
      <button type="button" @click="agregarPaquete">+ Agregar paquete</button>

      <p class="peso-total">Peso total: {{ pesoTotal.toFixed(2) }} kg</p>

      <button type="button" class="boton-principal" :disabled="cargando" @click="cotizar">
        {{ cargando ? 'Consultando…' : 'Cotizar' }}
      </button>

      <p v-if="errorMensaje" class="error">{{ errorMensaje }}</p>
      <p v-if="sinOpcionesMotivo" class="error">Sin opciones disponibles: {{ sinOpcionesMotivo }}</p>
    </section>

    <!-- ================= PASO 2: OPCIONES DEVUELTAS ================= -->
    <section v-if="opciones.length > 0 && !mostrarFormularioConfirmar && !resultadoConfirmacion" class="bloque">
      <h2>2. Elegir transportista</h2>
      <div
        v-for="op in opciones"
        :key="op.idOpcion"
        class="tarjeta-opcion"
        :class="{ elegida: opcionElegida === op.idOpcion }"
        @click="opcionElegida = op.idOpcion"
      >
        <input type="radio" :value="op.idOpcion" v-model="opcionElegida" />
        <div>
          <strong>{{ op.nombreTransportista }}</strong>
          <span class="precio">S/ {{ op.precioReferencial?.toFixed(2) }}</span>
          <p>{{ op.frecuenciaSalidas }}</p>
        </div>
      </div>
      <button type="button" class="boton-principal" @click="irAConfirmar">Continuar</button>
    </section>

    <!-- ================= PASO 3: DATOS PARA CONFIRMAR ================= -->
    <section v-if="mostrarFormularioConfirmar && !resultadoConfirmacion" class="bloque">
      <h2>3. Remitente y consignado</h2>

      <h3>Remitente</h3>
      <input v-model="remitente.numeroDocumento" placeholder="Documento" />
      <input v-model="remitente.nombres" placeholder="Nombres" />
      <input v-model="remitente.apellidos" placeholder="Apellidos" />
      <input v-model="remitente.telefono" placeholder="Teléfono" />

      <h3>Consignado</h3>
      <input v-model="consignado.numeroDocumento" placeholder="Documento" />
      <input v-model="consignado.nombres" placeholder="Nombres" />
      <input v-model="consignado.apellidos" placeholder="Apellidos" />
      <input v-model="consignado.telefono" placeholder="Teléfono" />
      <input v-model="consignado.direccion" placeholder="Dirección" />

      <button type="button" class="boton-principal" :disabled="cargando" @click="confirmar">
        {{ cargando ? 'Confirmando…' : 'Confirmar envío' }}
      </button>

      <p v-if="errorMensaje" class="error">{{ errorMensaje }}</p>

      <div v-if="precioCambio" class="aviso-precio">
        <p>El precio real es distinto al estimado:</p>
        <p>Estimado: S/ {{ precioCambio.precioReferencial?.toFixed(2) }}</p>
        <p>Real: S/ {{ precioCambio.precioReal?.toFixed(2) }}</p>
        <button type="button" @click="aceptarPrecioNuevo">Aceptar el precio real y confirmar</button>
      </div>
    </section>

    <!-- ================= PASO 4: RESULTADO ================= -->
    <section v-if="resultadoConfirmacion" class="bloque resultado">
      <h2>Envío confirmado</h2>
      <p class="codigo">{{ resultadoConfirmacion.codigoSeguimiento }}</p>
      <p>Transportista: {{ resultadoConfirmacion.nombreTransportista }}</p>
      <p>Precio final: S/ {{ resultadoConfirmacion.precioFinal?.toFixed(2) }}</p>
      <button type="button" @click="reiniciar">Registrar otro envío</button>
    </section>
  </div>
</template>

<style scoped>
.pantalla-registro { max-width: 640px; margin: 0 auto; padding: 1.5rem; font-family: sans-serif; }
.bloque { margin-bottom: 2rem; }
label { display: block; margin-bottom: 0.75rem; }
input, select { display: block; width: 100%; padding: 0.4rem; margin-top: 0.25rem; box-sizing: border-box; }
.fila-paquete { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
.fila-paquete input { width: auto; flex: 1; }
.fragil { display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
.peso-total { font-weight: bold; }
.boton-principal { background: #1D2839; color: white; border: none; padding: 0.6rem 1.2rem; cursor: pointer; margin-top: 1rem; }
.boton-principal:disabled { opacity: 0.5; cursor: not-allowed; }
.error { color: #C4573F; font-weight: bold; }
.tarjeta-opcion { display: flex; gap: 0.75rem; align-items: center; border: 1px solid #ccc; padding: 0.75rem; margin-bottom: 0.5rem; cursor: pointer; }
.tarjeta-opcion.elegida { border-color: #E2A53D; background: #FFF9E8; }
.precio { font-weight: bold; margin-left: 0.5rem; }
.aviso-precio { border: 1px solid #E2A53D; padding: 1rem; margin-top: 1rem; }
.resultado .codigo { font-size: 1.5rem; font-weight: bold; }
</style>
