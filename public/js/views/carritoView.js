// Carrito.js - Vista del carrito (antes users/carrito.html). Muestra los
// productos guardados, calcula el total y confirma la reserva.
// Se le agregan Header/Footer para que, a diferencia de la página anterior,
// también tenga navegación hacia el resto del sitio.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { obtenerCarrito, quitarProducto, calcularTotal, limpiarCarrito } from '../services/cartService.js'
import { crearReserva } from '../services/bookingService.js'
import { formatearPrecio } from '../utils/formatters.js'

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
            fechaMinima: ''
        }
    },

    computed: {
        total() {
            return calcularTotal(this.carrito)
        }
    },

    async mounted() {
        this.carrito = await obtenerCarrito()
        // Impide seleccionar una fecha anterior al día actual.
        this.fechaMinima = new Date().toISOString().slice(0, 10)
    },

    methods: {
        formatearPrecio,

        async eliminar(indice) {
            this.carrito = await quitarProducto(indice)
        },

        async confirmarReserva() {
            if (this.carrito.length === 0) {
                alert('Tu carrito está vacío.')
                return
            }

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

            alert('¡Reserva confirmada!')
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div class="text-center text-white p-5">
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
                        <form id="formularioCarrito" @submit.prevent="confirmarReserva">
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
                                <input v-model="formulario.fecha" :min="fechaMinima" class="form-control" type="date" id="fecha" required>
                            </div>
                            <button type="submit" class="btn botonAmarillo">Confirmar reserva</button>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    `

}
