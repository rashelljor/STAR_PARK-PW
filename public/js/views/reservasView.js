// Reservas.js - Vista de "Mis Reservas" (antes users/reservas.html y
// controller/reservas.js). Lista las reservas guardadas y permite pagarlas,
// editarlas o eliminarlas, igual que antes.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import {
    obtenerReservas,
    pagarReserva,
    actualizarReserva,
    eliminarReserva
} from '../services/bookingService.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            reservas: [],
            alerta: null
        }
    },

    mounted() {
        this.cargar()
    },

    methods: {
        async cargar() {
            this.reservas = await obtenerReservas()

            if (this.reservas.length === 0) {
                this.mostrarAlerta('No hay reservas aún.', 'info')
            }
        },

        mostrarAlerta(mensaje, tipo) {
            this.alerta = { mensaje, tipo }
        },

        async pagar(indice) {
            await pagarReserva(this.reservas[indice].id)
            await this.cargar()
            alert('Pago confirmado. Revisa Mis Compras.')
        },

        async editar(indice) {
            const reserva = this.reservas[indice]
            const nombre = prompt('Nombre completo', reserva.nombre)
            const correo = prompt('Correo', reserva.correo)
            const telefono = prompt('Teléfono', reserva.telefono)
            const fecha = prompt('Fecha de visita', reserva.fecha)

            if (nombre === null || correo === null || telefono === null || fecha === null) {
                return
            }

            await actualizarReserva(reserva.id, {
                nombre: nombre.trim(),
                correo: correo.trim(),
                telefono: telefono.trim(),
                fecha: fecha.trim()
            })

            await this.cargar()
            this.mostrarAlerta('Reserva actualizada correctamente.', 'success')
        },

        async eliminar(indice) {
            await eliminarReserva(this.reservas[indice].id)
            await this.cargar()
            this.mostrarAlerta('Reserva eliminada correctamente.', 'success')
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div id="alertContainer" class="container mt-4">
                    <div v-if="alerta" :class="'alert alert-' + alerta.tipo" role="alert">{{ alerta.mensaje }}</div>
                </div>

                <div class="admin-header text-white">
                    <h1>PANEL DE <em class="celeste">RESERVAS</em></h1>
                    <p class="etiqueta">Todas las reservas registradas</p>
                </div>

                <div class="panelAdmin">
                    <div class="bloqueAdmin">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Teléfono</th>
                                    <th>Fecha de visita</th>
                                    <th>Total</th>
                                    <th>Fecha y hora de registro</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="reservas.length === 0">
                                    <td colspan="8" style="text-align:center; color:#d9dfe8; padding:20px;">No hay reservas aún.</td>
                                </tr>
                                <tr v-for="(reserva, indice) in reservas" :key="indice">
                                    <td>{{ indice + 1 }}</td>
                                    <td>{{ reserva.nombre }}</td>
                                    <td>{{ reserva.correo }}</td>
                                    <td>{{ reserva.telefono }}</td>
                                    <td>{{ reserva.fecha }}</td>
                                    <td class="amarillo">{{ reserva.total }}</td>
                                    <td>{{ reserva.fechaRegistro }}</td>
                                    <td>
                                        <span v-if="reserva.pagado" class="amarillo">Pagado</span>
                                        <button v-else class="botonPagar" @click="pagar(indice)">Pagar</button>
                                        <button class="botonEditar" @click="editar(indice)">Editar</button>
                                        <button class="botonEliminar" @click="eliminar(indice)">Quitar</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    `

}
