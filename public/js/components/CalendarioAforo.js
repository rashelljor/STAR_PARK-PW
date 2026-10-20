// CalendarioAforo.js - Calendario para elegir la fecha de visita según el aforo.
// Pinta cada día con los colores del sitio: verde (libre), amarillo (casi lleno)
// y rojo (agotado, no se puede elegir). Se usa en el carrito y al editar una reserva.
// Sin clases nuevas: Bootstrap + las variables de color de global.css.

import { obtenerAforoMaximo, ocupacionEntre, estadoAforo } from '../services/capacityService.js'

const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
// Fondo del día elegido y color de texto/borde del resto (en modo claro, la versión oscura del acento).
const FONDOS = { libre: 'var(--verde)', casiLleno: 'var(--amarillo)', agotado: 'var(--rojo)' }
const COLORES = { libre: 'var(--verde-texto, var(--verde))', casiLleno: 'var(--amarillo-texto, var(--amarillo))', agotado: 'var(--rojo-texto, var(--rojo))' }
const TEXTOS = { libre: 'Libre', casiLleno: 'Casi lleno', agotado: 'Agotado' }

function aTexto(fecha) {
    return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('-')
}

export default {

    props: {
        modelValue: { type: String, default: '' },
        min: { type: String, required: true },
        max: { type: String, required: true },
        // Entradas que se quieren reservar: un día con menos cupos libres no se puede elegir.
        entradas: { type: Number, default: 1 },
        // Reserva que se está editando: sus propias entradas no cuentan como ocupadas.
        ignorar: { type: Object, default: null }
    },

    emits: ['update:modelValue'],

    data() {
        const base = new Date((this.modelValue || this.min) + 'T00:00:00')
        return {
            anio: base.getFullYear(),
            mes: base.getMonth(),
            maximo: 0,
            ocupacion: {},
            cargando: true,
            colores: COLORES,
            textos: TEXTOS,
            diasSemana: DIAS
        }
    },

    computed: {
        tituloMes() {
            const texto = new Date(this.anio, this.mes, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
            return texto.charAt(0).toUpperCase() + texto.slice(1)
        },

        // Celdas del mes; las vacías del inicio alinean el día 1 con su día de la semana (lunes primero).
        celdas() {
            const primero = new Date(this.anio, this.mes, 1)
            const vacias = (primero.getDay() + 6) % 7
            const diasMes = new Date(this.anio, this.mes + 1, 0).getDate()
            const celdas = Array.from({ length: vacias }, (_, i) => ({ clave: 'v' + i }))
            for (let dia = 1; dia <= diasMes; dia++) {
                const fecha = aTexto(new Date(this.anio, this.mes, dia))
                const fueraDeRango = fecha < this.min || fecha > this.max
                const ocupadas = this.ocupadasEn(fecha)
                const libres = Math.max(0, this.maximo - ocupadas)
                const estado = libres < this.entradas ? 'agotado' : estadoAforo(ocupadas, this.maximo)
                celdas.push({ clave: fecha, dia, fecha, fueraDeRango, estado, libres })
            }
            return celdas
        },

        puedeRetroceder() {
            return aTexto(new Date(this.anio, this.mes, 1)) > this.min
        },

        puedeAvanzar() {
            return aTexto(new Date(this.anio, this.mes + 1, 1)) <= this.max
        }
    },

    async mounted() {
        this.maximo = await obtenerAforoMaximo()
        await this.cargarMes()
    },

    methods: {
        ocupadasEn(fecha) {
            const propias = this.ignorar && this.ignorar.fecha === fecha ? Number(this.ignorar.entradas) || 0 : 0
            return Math.max(0, (this.ocupacion[fecha] || 0) - propias)
        },

        async cargarMes() {
            this.cargando = true
            try {
                const desde = aTexto(new Date(this.anio, this.mes, 1))
                const hasta = aTexto(new Date(this.anio, this.mes + 1, 0))
                this.ocupacion = await ocupacionEntre(desde, hasta)
            } catch (error) {
                console.error(error)
                this.ocupacion = {}
            } finally {
                this.cargando = false
            }
        },

        cambiarMes(paso) {
            const fecha = new Date(this.anio, this.mes + paso, 1)
            this.anio = fecha.getFullYear()
            this.mes = fecha.getMonth()
            this.cargarMes()
        },

        elegir(celda) {
            if (celda.fueraDeRango || celda.estado === 'agotado') return
            this.$emit('update:modelValue', celda.fecha)
        },

        estiloDia(celda) {
            if (celda.fueraDeRango) return { opacity: 0.3 }
            const color = COLORES[celda.estado]
            return celda.fecha === this.modelValue
                ? { background: FONDOS[celda.estado], borderColor: FONDOS[celda.estado], color: '#11131b', fontWeight: 800 }
                : { borderColor: color, color }
        },

        etiquetaDia(celda) {
            if (celda.fueraDeRango) return celda.fecha + ', no disponible'
            return celda.fecha + ', ' + TEXTOS[celda.estado] + (celda.estado === 'agotado' ? '' : ', ' + celda.libres + ' cupos libres')
        }
    },

    template: `
        <div class="glass p-3" role="group" aria-label="Calendario de disponibilidad">
            <div class="d-flex align-items-center justify-content-between mb-2">
                <button type="button" class="btn btn-sm botonCelesteBorde" :disabled="!puedeRetroceder" @click="cambiarMes(-1)" aria-label="Mes anterior">‹</button>
                <strong aria-live="polite">{{ tituloMes }}</strong>
                <button type="button" class="btn btn-sm botonCelesteBorde" :disabled="!puedeAvanzar" @click="cambiarMes(1)" aria-label="Mes siguiente">›</button>
            </div>

            <div v-if="cargando" class="placeholder-glow" aria-hidden="true">
                <span class="placeholder col-12 rounded" style="height: 220px"></span>
            </div>
            <div v-else style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px">
                <small v-for="dia in diasSemana" :key="dia" class="text-center etiquetaGris">{{ dia }}</small>
                <template v-for="celda in celdas" :key="celda.clave">
                    <span v-if="!celda.dia"></span>
                    <button
                        v-else
                        type="button"
                        class="btn btn-sm px-0"
                        :style="estiloDia(celda)"
                        :disabled="celda.fueraDeRango || celda.estado === 'agotado'"
                        :aria-pressed="celda.fecha === modelValue"
                        :aria-label="etiquetaDia(celda)"
                        :title="etiquetaDia(celda)"
                        @click="elegir(celda)"
                    >{{ celda.dia }}</button>
                </template>
            </div>

            <div class="d-flex flex-wrap gap-3 mt-2 justify-content-center">
                <small v-for="(texto, estado) in textos" :key="estado" class="etiquetaGris">
                    <span aria-hidden="true" :style="{ color: colores[estado] }">●</span> {{ texto }}
                </small>
            </div>
            <p v-if="modelValue" class="mt-2 mb-0 text-center">Fecha elegida: <strong class="amarillo">{{ modelValue }}</strong></p>
        </div>
    `

}
