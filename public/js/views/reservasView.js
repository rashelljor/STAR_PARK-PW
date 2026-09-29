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
import { esperarUsuario } from '../services/authService.js'
import { formatearFechaHora } from '../utils/formatters.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            reservas: [],
            alerta: null
        }
    },

    async mounted() {
        const usuario = await esperarUsuario()
        if (!usuario) {
            alert('Inicia sesión para ver tus reservas.')
            window.location.href = 'login.html'
            return
        }

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

        fechaLegible(fecha) {
            if (!fecha) return ''
            const fechaJs = typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha)
            return formatearFechaHora(fechaJs)
        },

        async pagar(indice) {
            await pagarReserva(this.reservas[indice])
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

                <div class="text-center text-white p-5">
                    <h1>PANEL DE RESERVA EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Todas tus reservas registradas</p>
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
                                    <td>{{ fechaLegible(reserva.fechaRegistro) }}</td>
                                    <td>
                                        <div class="d-flex flex-wrap align-items-center gap-2">
                                            <span v-if="reserva.pagado" class="amarillo">Pagado</span>
                                            <button v-else class="botonPagar" @click="pagar(indice)">Pagar</button>
                                            <button class="botonEditar" @click="editar(indice)">Editar</button>
                                            <button class="botonEliminar" @click="eliminar(indice)">Quitar</button>
                                        </div>
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
