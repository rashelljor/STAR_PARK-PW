// Pago.js - Página de pago de una reserva (users/pago.html?reserva=<id>).
// Flujo simulado como una pasarela real:
//   1. Resumen de la reserva y canje opcional de millas espaciales.
//   2. Datos de la tarjeta (validación de número, vencimiento y CVV).
//   3. Verificación 3-D Secure: código de 6 dígitos que "envía el banco".
//   4. Procesamiento con el banco → aprobado (entrada QR) o rechazado (reintentar).
// La lógica de la pasarela está en services/paymentService.js.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import EntradaQR from '../components/EntradaQR.js'
import { obtenerReserva } from '../services/bookingService.js'
import { obtenerCompras, obtenerFidelidad, resumenMillas } from '../services/purchaseService.js'
import { procesarPago, erroresTarjeta, marcaTarjeta, formatearNumeroTarjeta, soloDigitos, maximoCanjes } from '../services/paymentService.js'
import { enviarCorreo } from '../services/mailService.js'
import { esperarUsuario } from '../services/authService.js'
import { notificar, notificarAlCargar } from '../utils/notificaciones.js'
import { aNumero, formatearPrecio, redondear } from '../utils/formatters.js'
import { MILLAS_POR_CANJE, SOLES_POR_CANJE } from '../utils/constants.js'

const INTENTOS_3DS = 3

export default {

    components: { Header, Footer, EntradaQR },

    data() {
        return {
            reserva: null,
            millas: null,
            canjes: 0,
            cargando: true,
            // 'tarjeta' | 'verificacion' | 'procesando' | 'aprobado' | 'rechazado'
            paso: 'tarjeta',
            tarjeta: { numero: '', titular: '', vencimiento: '', cvv: '' },
            codigoEnviado: '',
            codigoIngresado: '',
            intentos: INTENTOS_3DS,
            transaccion: null,
            motivoRechazo: '',
            millasPorCanje: MILLAS_POR_CANJE,
            solesPorCanje: SOLES_POR_CANJE
        }
    },

    computed: {
        maximo() {
            return this.reserva && this.millas ? maximoCanjes(this.millas.disponibles, this.reserva.total) : 0
        },

        descuentoMillas() {
            return this.canjes * SOLES_POR_CANJE
        },

        totalAPagar() {
            return this.reserva ? redondear(aNumero(this.reserva.total) - this.descuentoMillas) : 0
        },

        marca() {
            return marcaTarjeta(this.tarjeta.numero)
        },

        // Número enmascarado para la vista previa de la tarjeta.
        numeroVistaPrevia() {
            const digitos = soloDigitos(this.tarjeta.numero)
            const visibles = [...digitos].map((digito, i) => (i < 4 || i >= digitos.length - 4 ? digito : '•')).join('').padEnd(16, '•')
            return visibles.replace(/(.{4})(?=.)/g, '$1 ')
        },

        numeroPaso() {
            return { tarjeta: 1, verificacion: 2, procesando: 3, aprobado: 3, rechazado: 3 }[this.paso]
        }
    },

    async mounted() {
        const usuario = await esperarUsuario()
        if (!usuario) {
            notificarAlCargar('Inicia sesión para pagar tu reserva.', 'advertencia')
            window.location.href = 'login.html'
            return
        }

        const id = new URLSearchParams(window.location.search).get('reserva')
        try {
            const [reserva, compras, fidelidad] = await Promise.all([id ? obtenerReserva(id) : null, obtenerCompras(), obtenerFidelidad()])
            if (!reserva || reserva.uid !== usuario.uid) throw new Error('Reserva no encontrada')
            if (reserva.pagado) {
                notificarAlCargar('Esta reserva ya está pagada. Tu entrada QR está en Mis Reservas.', 'info')
                window.location.href = 'reservas.html'
                return
            }
            this.reserva = reserva
            // Solo se puede canjear el saldo del contador de fidelidad, que es el que validan las reglas.
            const millas = resumenMillas(compras)
            this.millas = { ...millas, disponibles: Math.max(0, Math.min(millas.disponibles, fidelidad.millasGanadas - fidelidad.millasUsadas)) }
            this.tarjeta.titular = (reserva.nombre || '').toUpperCase()
        } catch (error) {
            console.error(error)
            notificarAlCargar('No encontramos la reserva que quieres pagar.', 'error')
            window.location.href = 'reservas.html'
            return
        } finally {
            this.cargando = false
        }
    },

    methods: {
        formatearPrecio,

        alEscribirNumero(evento) {
            this.tarjeta.numero = formatearNumeroTarjeta(evento.target.value)
        },

        // "0427" → "04/27" mientras se escribe.
        alEscribirVencimiento(evento) {
            const digitos = soloDigitos(evento.target.value).slice(0, 4)
            this.tarjeta.vencimiento = digitos.length > 2 ? digitos.slice(0, 2) + '/' + digitos.slice(2) : digitos
        },

        alEscribirCvv(evento) {
            this.tarjeta.cvv = soloDigitos(evento.target.value).slice(0, 4)
        },

        // Paso 1 → 2: valida la tarjeta y "el banco envía" el código 3-D Secure.
        continuar() {
            const errores = erroresTarjeta(this.tarjeta)
            if (errores.length) {
                notificar(errores, 'error')
                return
            }
            this.codigoEnviado = String(Math.floor(100000 + Math.random() * 900000))
            this.codigoIngresado = ''
            this.intentos = INTENTOS_3DS
            this.paso = 'verificacion'
            this.$nextTick(() => this.$refs.codigo3ds?.focus())
        },

        async verificar() {
            if (soloDigitos(this.codigoIngresado) !== this.codigoEnviado) {
                this.intentos--
                if (this.intentos > 0) {
                    notificar('Código incorrecto. Te quedan ' + this.intentos + (this.intentos === 1 ? ' intento.' : ' intentos.'), 'error')
                    return
                }
                this.motivoRechazo = 'No se pudo verificar tu identidad con el banco (3-D Secure). Por seguridad, la operación se canceló.'
                this.paso = 'rechazado'
                return
            }
            await this.pagar()
        },

        async pagar() {
            this.paso = 'procesando'
            try {
                this.transaccion = await procesarPago(this.reserva, this.tarjeta, this.canjes)
                this.reserva = { ...this.reserva, pagado: true, estado: 'pagado' }
                this.paso = 'aprobado'
                // El número de la tarjeta no se queda en memoria después del pago.
                this.tarjeta = { numero: '', titular: '', vencimiento: '', cvv: '' }

                enviarCorreo({
                    para: this.reserva.correo,
                    nombre: this.reserva.nombre,
                    asunto: 'Pago aprobado — tu entrada para el ' + this.reserva.fecha,
                    mensaje: 'Recibimos tu pago de ' + formatearPrecio(this.transaccion.total) + ' con ' + this.transaccion.tarjeta.marca + ' terminada en ' + this.transaccion.tarjeta.ultimos4 +
                        ' (autorización ' + this.transaccion.codigoAutorizacion + '). Ganaste ' + this.transaccion.millasGanadas + ' millas espaciales. ' +
                        'Tu entrada con código QR está en "Mis Reservas" (código ' + this.reserva.id.slice(-8).toUpperCase() + ').'
                })
            } catch (error) {
                console.error(error)
                this.motivoRechazo = error.code === 'permission-denied'
                    ? 'La operación no pasó la validación de seguridad. Recarga la página e inténtalo de nuevo.'
                    : error.message || 'No se pudo procesar el pago.'
                this.paso = 'rechazado'
            }
        },

        reintentar() {
            this.tarjeta.cvv = ''
            this.paso = 'tarjeta'
        }
    },

    template: `
        <div>
            <Header />

            <main id="contenido">
                <div class="text-center text-white p-3 p-md-5">
                    <h1>PAGO SEGURO EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">🔒 Paso {{ numeroPaso }} de 3 · Pasarela de pago simulada</p>
                </div>

                <div v-if="cargando" class="layoutCarrito placeholder-glow" aria-busy="true" aria-label="Cargando tu reserva">
                    <span class="placeholder col-12 rounded" style="height: 320px"></span>
                    <span class="placeholder col-12 rounded" style="height: 320px"></span>
                </div>

                <div v-else-if="reserva" class="layoutCarrito">
                    <!-- Resumen de la reserva (siempre visible). -->
                    <div class="glass bloqueFormulario">
                        <h3>Resumen de tu reserva</h3>
                        <div>
                            <p v-for="item in reserva.items" :key="item.id + item.nombre" class="itemCarrito mb-0">
                                <span>{{ item.nombre }} × {{ item.cantidad || 1 }}</span>
                                <span>{{ formatearPrecio(item.precio * (item.cantidad || 1)) }}</span>
                            </p>
                        </div>
                        <p class="mb-0">📅 Visita: <strong class="text-white">{{ reserva.fecha }}</strong> · {{ reserva.entradas }} entrada(s)</p>
                        <div>
                            <div class="totalFila"><p>Subtotal</p><p>{{ formatearPrecio(reserva.subtotal) }}</p></div>
                            <div v-if="reserva.cupon" class="totalFila"><p>Cupón <span class="celeste">{{ reserva.cupon }}</span></p><p class="celeste">− {{ formatearPrecio(reserva.descuentoCupon) }}</p></div>
                            <div v-if="canjes" class="totalFila"><p>Millas canjeadas ({{ canjes * millasPorCanje }})</p><p class="celeste">− {{ formatearPrecio(descuentoMillas) }}</p></div>
                            <div class="totalFila"><p>TOTAL A PAGAR</p><p class="amarillo">{{ formatearPrecio(totalAPagar) }}</p></div>
                        </div>

                        <!-- Canje de millas espaciales (solo antes de pagar). -->
                        <div v-if="paso === 'tarjeta' && millas" class="glass p-3">
                            <p class="mb-1">{{ millas.rango.icono }} <strong class="text-white">{{ millas.rango.nombre }}</strong> · {{ millas.disponibles }} millas disponibles</p>
                            <template v-if="maximo">
                                <label class="form-label mb-1" for="canjes">Canjear {{ millasPorCanje }} millas = {{ formatearPrecio(solesPorCanje) }} de descuento</label>
                                <div class="d-flex align-items-center gap-3">
                                    <input v-model.number="canjes" type="range" class="form-range" id="canjes" min="0" :max="maximo" step="1" :aria-valuetext="canjes + ' canjes'">
                                    <strong class="amarillo text-nowrap">{{ canjes }} × {{ formatearPrecio(solesPorCanje) }}</strong>
                                </div>
                            </template>
                            <p v-else class="etiquetaGris mb-0">Junta {{ millasPorCanje }} millas para canjearlas por {{ formatearPrecio(solesPorCanje) }} de descuento.</p>
                        </div>
                    </div>

                    <!-- Paso 1: datos de la tarjeta. -->
                    <div v-if="paso === 'tarjeta'" class="glass bloqueFormulario">
                        <h3>Datos de tu tarjeta</h3>

                        <!-- Vista previa de la tarjeta. -->
                        <div class="seccionCabecera align-items-start text-start mb-0" aria-hidden="true">
                            <p class="mb-3 w-100 d-flex justify-content-between"><span>💳 {{ marca || 'Tarjeta' }}</span><span class="celeste">STAR PARK PAY</span></p>
                            <p class="h5 text-white mb-3" style="letter-spacing: 2px">{{ numeroVistaPrevia }}</p>
                            <p class="mb-0 w-100 d-flex justify-content-between"><span>{{ tarjeta.titular || 'NOMBRE DEL TITULAR' }}</span><span>{{ tarjeta.vencimiento || 'MM/AA' }}</span></p>
                        </div>

                        <form novalidate @submit.prevent="continuar">
                            <div class="campo">
                                <label class="form-label" for="numeroTarjeta">Número de tarjeta</label>
                                <input :value="tarjeta.numero" @input="alEscribirNumero" class="form-control" id="numeroTarjeta" inputmode="numeric" autocomplete="cc-number" placeholder="4111 1111 1111 1111" maxlength="23" required>
                            </div>
                            <div class="campo">
                                <label class="form-label" for="titular">Nombre del titular</label>
                                <input v-model="tarjeta.titular" @input="tarjeta.titular = tarjeta.titular.toUpperCase()" class="form-control" id="titular" autocomplete="cc-name" placeholder="COMO APARECE EN LA TARJETA" required>
                            </div>
                            <div class="row g-3">
                                <div class="col-6 campo">
                                    <label class="form-label" for="vencimiento">Vencimiento</label>
                                    <input :value="tarjeta.vencimiento" @input="alEscribirVencimiento" class="form-control" id="vencimiento" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5" required>
                                </div>
                                <div class="col-6 campo">
                                    <label class="form-label" for="cvv">CVV</label>
                                    <input :value="tarjeta.cvv" @input="alEscribirCvv" class="form-control" id="cvv" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" required>
                                </div>
                            </div>
                            <button type="submit" class="btn botonAmarillo w-100 mt-2">Pagar {{ formatearPrecio(totalAPagar) }}</button>
                        </form>
                        <p class="etiquetaGris mb-0">
                            🔒 Simulación: no se cobra dinero real ni se guarda el número de tu tarjeta.
                            Prueba con 4111 1111 1111 1111 (aprobada), 4000 0000 0000 0002 (fondos insuficientes) o 4000 0000 0000 0069 (bloqueada).
                        </p>
                    </div>

                    <!-- Paso 2: verificación 3-D Secure. -->
                    <div v-else-if="paso === 'verificacion'" class="glass bloqueFormulario">
                        <h3>Verificación de tu banco (3-D Secure)</h3>
                        <p>Para proteger tu compra, tu banco envió un código de 6 dígitos a tu celular registrado.</p>
                        <p class="etiqueta">📱 Simulación — SMS recibido: <strong>{{ codigoEnviado }}</strong></p>
                        <form novalidate @submit.prevent="verificar">
                            <div class="campo">
                                <label class="form-label" for="codigo3ds">Código de verificación</label>
                                <input v-model="codigoIngresado" ref="codigo3ds" class="form-control text-center" id="codigo3ds" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" style="letter-spacing: 8px">
                            </div>
                            <p class="etiquetaGris">Intentos restantes: {{ intentos }}</p>
                            <div class="d-flex flex-wrap gap-2">
                                <button type="button" class="btn botonCelesteBorde" @click="paso = 'tarjeta'">Volver</button>
                                <button type="submit" class="btn botonAmarillo flex-grow-1">Verificar y pagar</button>
                            </div>
                        </form>
                    </div>

                    <!-- Paso 3: procesando con el banco. -->
                    <div v-else-if="paso === 'procesando'" class="glass bloqueFormulario text-center justify-content-center" role="status" aria-live="polite">
                        <div class="spinner-border mx-auto celeste" style="width: 3rem; height: 3rem" aria-hidden="true"></div>
                        <h3 class="border-0">Procesando tu pago...</h3>
                        <p>Estamos confirmando la operación con tu banco. No cierres ni recargues esta página.</p>
                    </div>

                    <!-- Resultado: aprobado. -->
                    <div v-else-if="paso === 'aprobado'" class="glass bloqueFormulario" role="status">
                        <h3 style="color: var(--verde-texto, var(--verde))">✓ ¡Pago aprobado!</h3>
                        <EntradaQR :reserva="reserva" />
                        <dl class="mb-0">
                            <div class="totalFila"><dt>Monto pagado</dt><dd class="amarillo">{{ formatearPrecio(transaccion.total) }}</dd></div>
                            <div class="totalFila"><dt>Tarjeta</dt><dd>{{ transaccion.tarjeta.marca }} •••• {{ transaccion.tarjeta.ultimos4 }}</dd></div>
                            <div class="totalFila"><dt>Código de autorización</dt><dd>{{ transaccion.codigoAutorizacion }}</dd></div>
                            <div class="totalFila"><dt>Millas ganadas</dt><dd class="celeste">+{{ transaccion.millasGanadas }} 🚀</dd></div>
                        </dl>
                        <div class="d-flex flex-wrap gap-2">
                            <a class="btn botonAmarillo flex-grow-1" href="miscompras.html">Ver mi boleta</a>
                            <a class="btn botonCelesteBorde flex-grow-1" href="reservas.html">Mis reservas</a>
                        </div>
                    </div>

                    <!-- Resultado: rechazado. -->
                    <div v-else-if="paso === 'rechazado'" class="glass bloqueFormulario" role="alert">
                        <h3 style="color: var(--rojo-texto, var(--rojo))">✕ Pago rechazado</h3>
                        <p>{{ motivoRechazo }}</p>
                        <p class="etiquetaGris">No se realizó ningún cargo. Tu reserva sigue pendiente de pago.</p>
                        <div class="d-flex flex-wrap gap-2">
                            <button type="button" class="btn botonAmarillo flex-grow-1" @click="reintentar">Intentar de nuevo</button>
                            <a class="btn botonCelesteBorde flex-grow-1" href="reservas.html">Volver a mis reservas</a>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    `

}
