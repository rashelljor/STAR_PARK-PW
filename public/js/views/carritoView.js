// Carrito.js - Vista del carrito (antes users/carrito.html). Muestra los
// productos guardados, calcula el total y confirma la reserva.
// Se le agregan Header/Footer para que, a diferencia de la página anterior,
// también tenga navegación hacia el resto del sitio.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { obtenerCarrito, quitarProducto, calcularTotal, limpiarCarrito } from '../services/cartService.js'
import { crearReserva } from '../services/bookingService.js'
import { formatearPrecio } from '../utils/formatters.js'
import { esperarUsuario, obtenerPerfil } from '../services/authService.js'
import { notificar, confirmar, notificarAlCargar } from '../utils/notificaciones.js'
import { rangoFechasReserva, erroresDatosReserva } from '../utils/validators.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            carrito: [],
            formulario: {
                nombre: '',
                correo: '',
                telefono: '',
                fecha: ''
            },
            perfil: null,
            fechaMinima: '',
            fechaMaxima: '',
            enviando: false
        }
    },

    computed: {
        total() {
            return calcularTotal(this.carrito)
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
            this.carrito = await obtenerCarrito()
        } catch (error) {
            console.error(error)
            notificar('No se pudo cargar tu carrito. Recarga la página para intentarlo de nuevo.', 'error')
        }

        // Precarga nombre, correo y teléfono desde el perfil del cliente.
        // Si el perfil no carga, el cliente simplemente los escribe a mano.
        this.perfil = await obtenerPerfil(usuario.uid).catch(() => null)
        this.formulario.nombre = this.perfil?.nombreCompleto || ''
        this.formulario.correo = this.perfil?.correo || usuario.email || ''
        this.formulario.telefono = this.perfil?.telefono || ''
    },

    methods: {
        formatearPrecio,

        async eliminar(indice) {
            const item = this.carrito[indice]
            if (!await confirmar('¿Quitar ' + item.nombre + ' de tu carrito?', { textoConfirmar: 'Quitar', tipo: 'error' })) return

            try {
                this.carrito = await quitarProducto(indice)
                notificar(item.nombre + ' se quitó de tu carrito.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo quitar el producto. Intenta nuevamente.', 'error')
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
                await crearReserva({
                    nombre: this.formulario.nombre,
                    correo: this.formulario.correo,
                    telefono: this.formulario.telefono,
                    fecha: this.formulario.fecha,
                    total: formatearPrecio(this.total),
                    items: this.carrito
                })

                await limpiarCarrito()
                this.carrito = []
                this.formulario = { nombre: '', correo: '', telefono: '', fecha: '' }

                notificar('¡Reserva confirmada! Puedes pagarla desde Mis Reservas.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo registrar la reserva. Intenta nuevamente.', 'error')
            } finally {
                this.enviando = false
            }
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div class="text-center text-white p-3 p-md-5">
                    <h1>TU CARRITO EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Revisa tu selección y completa tu reserva</p>
                </div>

                <!-- Una columna muestra productos y la otra contiene el formulario. -->
                <div class="layoutCarrito">
                    <div class="glass bloqueFormulario">
                        <h3>Servicios seleccionados</h3>
                        <div id="listaCarrito">
                            <p v-if="carrito.length === 0" class="itemCarrito">Tu carrito está vacío.</p>
                            <p v-for="(item, indice) in carrito" :key="indice" class="itemCarrito">
                                {{ item.nombre }} — {{ formatearPrecio(item.precio) }}
                                <button type="button" @click="eliminar(indice)">Eliminar</button>
                            </p>
                        </div>
                        <div class="totalFila">
                            <p>TOTAL</p>
                            <p class="amarillo" id="totalPrecio">{{ formatearPrecio(total) }}</p>
                        </div>
                    </div>

                    <div class="glass bloqueFormulario">
                        <h3>Datos para la reserva</h3>
                        <form id="formularioCarrito" novalidate @submit.prevent="confirmarReserva">
                            <div class="campo">
                                <label class="form-label" for="nombre">Nombre completo</label>
                                <input v-model="formulario.nombre" class="form-control" type="text" id="nombre" placeholder="Nombres" required>
                            </div>
                            <div class="campo">
                                <label class="form-label" for="correo">Correo</label>
                                <input v-model="formulario.correo" class="form-control" type="email" id="correo" placeholder="abc@gmail.com" required>
                            </div>
                            <div class="campo">
                                <label class="form-label" for="telefono">Teléfono</label>
                                <input v-model="formulario.telefono" class="form-control" type="tel" id="telefono" placeholder="999 999 999" required>
                            </div>
                            <div class="campo">
                                <label class="form-label" for="fecha">Fecha de visita</label>
                                <input v-model="formulario.fecha" :min="fechaMinima" :max="fechaMaxima" class="form-control" type="date" id="fecha" required>
                            </div>
                            <button type="submit" class="btn botonAmarillo" :disabled="enviando">{{ enviando ? 'Registrando...' : 'Confirmar reserva' }}</button>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    `

}
