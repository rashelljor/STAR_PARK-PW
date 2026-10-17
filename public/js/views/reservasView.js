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
import { notificar, confirmar } from '../utils/notificaciones.js'
import { formatearFechaHora } from '../utils/formatters.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            reservas: []
        }
    },

    async mounted() {
        const usuario = await esperarUsuario()
        if (!usuario) {
            await notificar('Inicia sesión para ver tus reservas.', 'advertencia')
            window.location.href = 'login.html'
            return
        }

        this.cargar()
    },

    methods: {
        // Si no hay reservas, la tabla ya muestra "No hay reservas aún.".
        async cargar() {
            this.reservas = await obtenerReservas()
        },

        fechaLegible(fecha) {
            if (!fecha) return ''
            const fechaJs = typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha)
            return formatearFechaHora(fechaJs)
        },

        async pagar(indice) {
            try {
                await pagarReserva(this.reservas[indice])
                await this.cargar()
                notificar('Pago confirmado. Revisa tu boleta en Mis Compras.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo procesar el pago. Intenta nuevamente.', 'error')
            }
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

            try {
                await actualizarReserva(reserva.id, {
                    nombre: nombre.trim(),
                    correo: correo.trim(),
                    telefono: telefono.trim(),
                    fecha: fecha.trim()
                })
                await this.cargar()
                notificar('Reserva actualizada correctamente.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo actualizar la reserva. Intenta nuevamente.', 'error')
            }
        },

        async eliminar(indice) {
            if (!await confirmar('¿Quitar esta reserva? Esta acción no se puede deshacer.', { textoConfirmar: 'Quitar', tipo: 'error' })) return

            try {
                await eliminarReserva(this.reservas[indice].id)
                await this.cargar()
                notificar('Reserva eliminada correctamente.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo eliminar la reserva. Intenta nuevamente.', 'error')
            }
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div class="text-center text-white p-3 p-md-5">
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
