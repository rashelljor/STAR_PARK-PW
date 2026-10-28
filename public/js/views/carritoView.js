// Carrito.js - Vista del carrito (antes users/carrito.html). Muestra los
// productos guardados con su cantidad, aplica cupones, valida el aforo de la
// fecha elegida en el calendario y confirma la reserva.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import CalendarioAforo from '../components/CalendarioAforo.js'
import { cambiarCantidad, quitarProducto, calcularTotal, contarEntradas, limpiarCarrito, actualizarDesdeCatalogo } from '../services/cartService.js'
import { crearReserva } from '../services/bookingService.js'
import { cuposLibres } from '../services/capacityService.js'
import { validarCupon, cuponesDisponibles, calcularDescuento } from '../services/couponService.js'
import { obtenerFidelidad } from '../services/purchaseService.js'
import { enviarCorreo } from '../services/mailService.js'
import { formatearPrecio, redondear } from '../utils/formatters.js'
import { esperarUsuario, obtenerPerfil } from '../services/authService.js'
import { notificar, confirmar, notificarAlCargar } from '../utils/notificaciones.js'
import { rangoFechasReserva, erroresDatosReserva } from '../utils/validators.js'

export default {

    components: { Header, Footer, CalendarioAforo },

    data() {
        return {
            carrito: [],
            cargando: true,
            formulario: {
                nombre: '',
                correo: '',
                telefono: '',
                fecha: ''
            },
            perfil: null,
            fechaMinima: '',
            fechaMaxima: '',
            enviando: false,
            actualizando: false,
            compras: 0,
            codigoCupon: '',
            cupon: null,
            validandoCupon: false,
            // Cupones cuya condición ya cumple el cliente (se muestran bajo el campo del cupón).
            disponibles: []
        }
    },

    computed: {
        subtotal() {
            return calcularTotal(this.carrito)
        },

        unidades() {
            // Solo entradas: los productos del bazar no ocupan aforo ni cuentan como juegos.
            return contarEntradas(this.carrito)
        },

        // Solo productos del bazar, sin entradas: es un pedido para recoger en el bazar.
        soloBazar() {
            return !this.cargando && this.carrito.length > 0 && this.unidades === 0
        },

        descuento() {
            return this.cupon ? calcularDescuento(this.subtotal, this.cupon.descuento) : 0
        },

        total() {
            return redondear(this.subtotal - this.descuento)
        }
    },

    watch: {
        // Quien compra solo en el bazar suele estar ya en el parque: se propone recogerlo hoy.
        soloBazar(valor) {
            if (valor && !this.formulario.fecha) this.formulario.fecha = this.fechaMinima
        }
    },

    async mounted() {
        const usuario = await esperarUsuario()
        if (!usuario) {
            notificarAlCargar('Inicia sesión para ver tu carrito.', 'advertencia')
            window.location.href = 'login.html'
            return
        }

        // Solo se puede reservar desde hoy hasta un año después.
        const { minima, maxima } = rangoFechasReserva()
        this.fechaMinima = minima
        this.fechaMaxima = maxima

        try {
            // Se carga ya al día con el catálogo (precio, stock y categoría), así
            // el carrito sabe desde el inicio si es una compra solo del bazar.
            const { carrito, avisos } = await actualizarDesdeCatalogo()
            this.carrito = carrito
            if (avisos.length) notificar(avisos, 'advertencia')
        } catch (error) {
            console.error(error)
            notificar('No se pudo cargar tu carrito. Recarga la página para intentarlo de nuevo.', 'error')
        } finally {
            this.cargando = false
        }

        // Compras pagadas: deciden si aplican los cupones de primera compra y cliente frecuente.
        // Se leen del contador de fidelidad, el mismo que revisan las reglas de Firestore.
        this.compras = (await obtenerFidelidad().catch(() => ({ compras: 0 }))).compras
        this.avisarCupones()

        // Precarga nombre, correo y teléfono desde el perfil del cliente.
        // Si el perfil no carga, el cliente simplemente los escribe a mano.
        this.perfil = await obtenerPerfil(usuario.uid).catch(() => null)
        this.formulario.nombre = this.perfil?.nombreCompleto || ''
        this.formulario.correo = this.perfil?.correo || usuario.email || ''
        this.formulario.telefono = this.perfil?.telefono || ''
    },

    methods: {
        formatearPrecio,

        async cambiar(item, cambio) {
            if (this.actualizando) return
            if (cambio < 0 && item.cantidad === 1) return this.eliminar(item)

            this.actualizando = true
            try {
                this.carrito = await cambiarCantidad(item.id, cambio)
                await this.revisarCupon()
            } catch (error) {
                console.error(error)
                if (error.paraCliente) notificar(error.message, 'advertencia')
                else notificar('No se pudo cambiar la cantidad. Intenta nuevamente.', 'error')
            } finally {
                this.actualizando = false
            }
        },

        async eliminar(item) {
            if (!await confirmar('¿Quitar ' + item.nombre + ' de tu carrito?', { textoConfirmar: 'Quitar', tipo: 'error' })) return

            try {
                this.carrito = await quitarProducto(item.id)
                await this.revisarCupon()
                notificar(item.nombre + ' se quitó de tu carrito.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo quitar el producto. Intenta nuevamente.', 'error')
            }
        },

        async aplicarCupon() {
            if (!this.carrito.length) {
                notificar('Agrega productos a tu carrito antes de aplicar un cupón.', 'advertencia')
                return
            }
            this.validandoCupon = true
            try {
                const resultado = await validarCupon(this.codigoCupon, { subtotal: this.subtotal, unidades: this.unidades, compras: this.compras })
                if (!resultado.ok) {
                    notificar(resultado.mensaje, 'advertencia')
                    return
                }
                this.cupon = resultado.cupon
                this.codigoCupon = ''
                notificar('Cupón ' + resultado.cupon.id + ' aplicado: ' + resultado.cupon.descuento + ' % de descuento.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo validar el cupón. Intenta nuevamente.', 'error')
            } finally {
                this.validandoCupon = false
            }
        },

        quitarCupon() {
            this.cupon = null
        },

        // Aplica uno de los cupones disponibles con un clic.
        usarCupon(cupon) {
            this.codigoCupon = cupon.id
            this.aplicarCupon()
        },

        // Cupones que el cliente cumple con su carrito actual (ninguno si está vacío).
        async actualizarDisponibles() {
            if (!this.carrito.length) {
                this.disponibles = []
                return
            }
            this.disponibles = await cuponesDisponibles({ unidades: this.unidades, compras: this.compras }).catch(error => { console.error(error); return [] })
        },

        // Mensaje al entrar al carrito: sin productos no hay cupones; con productos,
        // los cupones cuya condición ya cumple.
        async avisarCupones() {
            if (!this.carrito.length) {
                notificar('No podemos ofrecerte cupones mientras tengas tu carrito vacío.', 'info')
                return
            }
            await this.actualizarDisponibles()
            if (this.disponibles.length) {
                notificar(this.disponibles.map(cupon => cupon.id + ': ' + (cupon.descripcion || cupon.descuento + ' % de descuento')), 'info')
            } else {
                notificar('Por ahora no cumples las condiciones de ningún cupón. Hay cupones por tu primera compra, por llevar más de 3 juegos o por ser cliente frecuente.', 'info')
            }
        },

        // Al cambiar el carrito, el cupón aplicado podría dejar de cumplir su condición
        // (por ejemplo, bajar de 4 a 3 juegos con MISION10) y cambian los disponibles.
        async revisarCupon() {
            this.actualizarDisponibles()
            if (!this.cupon) return
            const resultado = await validarCupon(this.cupon.id, { subtotal: this.subtotal, unidades: this.unidades, compras: this.compras })
            if (!resultado.ok) {
                this.cupon = null
                notificar('Se quitó el cupón: ' + resultado.mensaje, 'advertencia')
            }
        },

        async confirmarReserva() {
            if (this.enviando) return

            if (this.carrito.length === 0) {
                notificar('Tu carrito está vacío. Agrega productos desde la tienda.', 'advertencia')
                return
            }

            const errores = erroresDatosReserva(this.formulario)
            if (errores.length) {
                notificar(errores, 'error')
                return
            }

            // Evita que un doble clic registre la misma reserva dos veces.
            this.enviando = true
            try {
                // Precios y stock al día: si algo cambió, el cliente revisa el nuevo total antes de reservar.
                const { carrito, avisos } = await actualizarDesdeCatalogo()
                if (avisos.length) {
                    this.carrito = carrito
                    await this.revisarCupon()
                    notificar(avisos, 'advertencia')
                    return
                }

                // El aforo se vuelve a revisar justo antes de guardar: otro cliente pudo reservar mientras tanto.
                // (Un pedido solo del bazar no ocupa aforo.)
                const libres = this.unidades ? await cuposLibres(this.formulario.fecha) : Infinity
                if (libres < this.unidades) {
                    notificar(libres
                        ? 'Para el ' + this.formulario.fecha + ' solo quedan ' + libres + ' cupos y tu carrito tiene ' + this.unidades + ' entradas. Elige otra fecha.'
                        : 'El ' + this.formulario.fecha + ' ya está agotado. Elige otra fecha en el calendario.', 'advertencia')
                    return
                }

                const reserva = await crearReserva({
                    nombre: this.formulario.nombre.trim(),
                    correo: this.formulario.correo.trim(),
                    telefono: this.formulario.telefono.replace(/\s/g, ''),
                    fecha: this.formulario.fecha,
                    subtotal: this.subtotal,
                    cupon: this.cupon?.id || null,
                    descuentoCupon: this.descuento,
                    items: this.carrito
                })

                const soloBazar = reserva.entradas === 0
                enviarCorreo({
                    para: reserva.correo,
                    nombre: reserva.nombre,
                    asunto: (soloBazar ? 'Pedido del bazar registrado para el ' : 'Reserva registrada para el ') + reserva.fecha + ' — Star Park',
                    mensaje: soloBazar
                        ? 'Registramos tu pedido del bazar para recoger el ' + reserva.fecha + ' por ' + formatearPrecio(reserva.total) + '. Al pagarlo recibirás tu código QR de recojo (si no terminaste el pago, puedes hacerlo desde "Mis Reservas").'
                        : 'Registramos tu reserva de ' + reserva.entradas + ' entrada(s) para el ' + reserva.fecha + ' por ' + formatearPrecio(reserva.total) + '. Recuerda pagarla desde "Mis Reservas" para recibir tu entrada con código QR.'
                })

                await limpiarCarrito()
                this.carrito = []
                this.cupon = null
                this.formulario.fecha = ''

                // Una compra solo del bazar pasa directo al pago; una reserva se paga desde Mis Reservas.
                if (soloBazar) {
                    window.location.href = 'pago.html?reserva=' + encodeURIComponent(reserva.id)
                    return
                }
                await notificar('¡Reserva confirmada! Ahora puedes pagarla desde Mis Reservas.', 'exito')
                window.location.href = 'reservas.html'
            } catch (error) {
                console.error(error)
                notificar(error.code === 'permission-denied'
                    ? 'La reserva no pasó la validación de seguridad (otro cliente pudo llevarse el último stock o el último uso del cupón). Recarga la página e inténtalo de nuevo.'
                    : 'No se pudo registrar la reserva. Intenta nuevamente.', 'error')
            } finally {
                this.enviando = false
            }
        }
    },

    template: `
        <div>
            <Header />

            <main id="contenido">
                <div class="text-center text-white p-3 p-md-5">
                    <h1>TU CARRITO EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Revisa tu selección y completa tu reserva</p>
                </div>

                <!-- Una columna muestra productos y la otra contiene el formulario. -->
                <div class="layoutCarrito">
                    <div class="glass bloqueFormulario">
                        <h3>Servicios seleccionados</h3>
                        <div id="listaCarrito" aria-live="polite">
                            <div v-if="cargando" class="placeholder-glow" aria-hidden="true">
                                <span class="placeholder col-12 mb-3 rounded" v-for="n in 3" :key="n" style="height: 36px"></span>
                            </div>
                            <p v-else-if="carrito.length === 0" class="itemCarrito">Tu carrito está vacío.</p>
                            <div v-for="item in carrito" :key="item.id" class="itemCarrito gap-2 flex-wrap">
                                <div>
                                    <p class="mb-0 text-white">
                                        {{ item.nombre }}
                                        <span v-if="item.color" class="d-inline-block rounded-circle align-middle ms-1" :style="{ width: '14px', height: '14px', background: item.color, border: '1px solid var(--borde)' }" role="img" :aria-label="'Color ' + item.color" :title="item.color"></span>
                                    </p>
                                    <small class="etiquetaGris">{{ formatearPrecio(item.precio) }} c/u · {{ formatearPrecio(item.precio * item.cantidad) }}</small>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <button type="button" :disabled="actualizando" @click="cambiar(item, -1)" :aria-label="'Quitar una unidad de ' + item.nombre">−</button>
                                    <strong aria-live="polite" :aria-label="item.cantidad + ' unidades'">{{ item.cantidad }}</strong>
                                    <button type="button" :disabled="actualizando" @click="cambiar(item, 1)" :aria-label="'Agregar una unidad de ' + item.nombre">+</button>
                                    <button type="button" class="botonEliminar ms-2" @click="eliminar(item)">Eliminar</button>
                                </div>
                            </div>
                        </div>

                        <!-- Cupón de descuento. -->
                        <form v-if="!cupon" class="d-flex gap-2" @submit.prevent="aplicarCupon">
                            <label class="visually-hidden" for="codigoCupon">Código de cupón</label>
                            <input v-model="codigoCupon" id="codigoCupon" class="form-control text-uppercase" placeholder="¿Tienes un cupón?" autocomplete="off">
                            <button type="submit" class="btn botonCelesteBorde text-nowrap" :disabled="validandoCupon">{{ validandoCupon ? 'Validando...' : 'Aplicar' }}</button>
                        </form>
                        <template v-if="!cupon && !cargando">
                            <p v-if="!carrito.length" class="etiquetaGris mb-0">No podemos ofrecerte cupones mientras tengas tu carrito vacío.</p>
                            <div v-else-if="disponibles.length" class="d-flex flex-wrap align-items-center gap-2">
                                <span class="etiquetaGris">Tus cupones disponibles:</span>
                                <button v-for="disponible in disponibles" :key="disponible.id" type="button" class="btn btn-sm botonCelesteBorde py-1 px-3"
                                    :disabled="validandoCupon" :title="disponible.descripcion" @click="usarCupon(disponible)">{{ disponible.id }} (−{{ disponible.descuento }} %)</button>
                            </div>
                            <p v-else class="etiquetaGris mb-0">Cupones para tu primera compra, por llevar más de 3 juegos o por ser cliente frecuente.</p>
                        </template>

                        <div>
                            <div class="totalFila">
                                <p>Subtotal</p>
                                <p>{{ formatearPrecio(subtotal) }}</p>
                            </div>
                            <div v-if="cupon" class="totalFila">
                                <p>
                                    Cupón <span class="celeste">{{ cupon.id }}</span> (−{{ cupon.descuento }} %)
                                    <button type="button" class="btn btn-link btn-sm p-0 ms-1" style="color: var(--rojo-texto, var(--rojo))" @click="quitarCupon">Quitar</button>
                                </p>
                                <p class="celeste">− {{ formatearPrecio(descuento) }}</p>
                            </div>
                            <div class="totalFila">
                                <p>TOTAL</p>
                                <p class="amarillo" id="totalPrecio">{{ formatearPrecio(total) }}</p>
                            </div>
                            <p class="etiquetaGris mb-0">Ganarás {{ Math.floor(total) }} millas espaciales al pagar 🚀</p>
                        </div>
                    </div>

                    <div class="glass bloqueFormulario">
                        <h3>{{ soloBazar ? 'Datos para tu compra' : 'Datos para la reserva' }}</h3>
                        <form id="formularioCarrito" novalidate @submit.prevent="confirmarReserva">
                            <div class="campo">
                                <label class="form-label" for="nombre">Nombre completo</label>
                                <input v-model="formulario.nombre" class="form-control" type="text" id="nombre" placeholder="Nombres" autocomplete="name" required>
                            </div>
                            <div class="campo">
                                <label class="form-label" for="correo">Correo</label>
                                <input v-model="formulario.correo" class="form-control" type="email" id="correo" placeholder="abc@gmail.com" autocomplete="email" required>
                            </div>
                            <div class="campo">
                                <label class="form-label" for="telefono">Teléfono</label>
                                <input v-model="formulario.telefono" class="form-control" type="tel" id="telefono" placeholder="999 999 999" autocomplete="tel" required>
                            </div>
                            <div class="campo">
                                <span v-if="soloBazar" class="form-label">Fecha de recojo en el bazar</span>
                                <span v-else class="form-label">Fecha de visita ({{ unidades }} {{ unidades === 1 ? 'entrada' : 'entradas' }})</span>
                                <!-- Un pedido solo del bazar no ocupa aforo: ningún día aparece agotado. -->
                                <CalendarioAforo v-if="fechaMinima" v-model="formulario.fecha" :min="fechaMinima" :max="fechaMaxima" :entradas="soloBazar ? 0 : Math.max(1, unidades)" />
                                <small v-if="soloBazar" class="etiquetaGris d-block mt-1">Al confirmar pasas directo al pago. Luego recoge tu pedido en el bazar mostrando tu código QR, sin hacer fila.</small>
                            </div>
                            <button type="submit" class="btn botonAmarillo" :disabled="enviando">{{ enviando ? 'Registrando...' : soloBazar ? 'Comprar y pagar' : 'Confirmar reserva' }}</button>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    `

}
