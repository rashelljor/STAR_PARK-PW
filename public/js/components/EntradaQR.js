// EntradaQR.js - Entrada digital: código QR con el id de la reserva pagada.
// En la puerta, el admin lo escanea desde "Administración de reservas y ventas".

import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm'
import { PREFIJO_QR } from '../utils/constants.js'

export default {

    props: {
        reserva: { type: Object, required: true }
    },

    data() {
        return { imagen: '' }
    },

    computed: {
        codigo() {
            return this.reserva.id.slice(-8).toUpperCase()
        }
    },

    async mounted() {
        try {
            this.imagen = await QRCode.toDataURL(PREFIJO_QR + this.reserva.id, { width: 240, margin: 2, color: { dark: '#11131b', light: '#ffffff' } })
        } catch (error) {
            console.error(error)
        }
    },

    template: `
        <div class="text-center">
            <div v-if="!imagen" class="placeholder-glow mx-auto" style="width: 240px" aria-hidden="true">
                <span class="placeholder col-12 rounded" style="height: 240px"></span>
            </div>
            <img v-else :src="imagen" width="240" height="240" class="mx-auto rounded" :alt="'Código QR de la entrada ' + codigo">
            <p class="mt-2 mb-1">Código de entrada: <strong class="amarillo">{{ codigo }}</strong></p>
            <p class="etiquetaGris mb-0">Visita: {{ reserva.fecha }} · {{ reserva.entradas || reserva.items?.length || 1 }} entrada(s)</p>
            <p v-if="reserva.estado === 'usada'" class="mt-2 mb-0" style="color: var(--rojo-texto, var(--rojo))">Esta entrada ya fue usada.</p>
        </div>
    `

}
