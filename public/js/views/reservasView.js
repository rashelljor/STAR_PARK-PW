// Reservas.js - Vista de "Mis Reservas" (antes users/reservas.html y
// controller/reservas.js). Lista las reservas guardadas y permite pagarlas,
// editarlas o eliminarlas. Una reserva pagada ya no se puede editar ni quitar
// (también lo impiden las reglas de Firestore).
// En pantallas de 800px o menos, la tabla se muestra como tarjetas apiladas (ver reservas.css).

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import {
    obtenerReservas,
    pagarReserva,
    actualizarReserva,
    eliminarReserva
} from '../services/bookingService.js'
import { esperarUsuario } from '../services/authService.js'
import { notificar, confirmar, notificarAlCargar } from '../utils/notificaciones.js'
import { formatearFechaHora } from '../utils/formatters.js'
import { rangoFechasReserva, erroresDatosReserva } from '../utils/validators.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            reservas: [],
            cargando: true,
            // Reserva que se está editando en el modal (null = modal cerrado).
            edicion: null,
            guardando: false,
            fechas: rangoFechasReserva()
        }
    },

    async mounted() {
        const usuario = await esperarUsuario()
        if (!usuario) {
            notificarAlCargar('Inicia sesión para ver tus reservas.', 'advertencia')
            window.location.href = 'login.html'
            return
        }

        try {
            await this.cargar()
        } catch (error) {
            console.error(error)
            notificar('No se pudieron cargar tus reservas. Recarga la página para intentarlo de nuevo.', 'error')
        } finally {
            this.cargando = false
        }
    },

    methods: {
        // Las más recientes primero.
        async cargar() {
            const reservas = await obtenerReservas()
            this.reservas = reservas.sort((a, b) => this.milisegundos(b.fechaRegistro) - this.milisegundos(a.fechaRegistro))
        },

        milisegundos(fecha) {
            if (!fecha) return 0
            return typeof fecha.toMillis === 'function' ? fecha.toMillis() : new Date(fecha).getTime()
        },

        fechaLegible(fecha) {
            if (!fecha) return ''
            const fechaJs = typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha)
            return formatearFechaHora(fechaJs)
        },

        async pagar(reserva) {
            if (!await confirmar('¿Confirmas el pago de ' + reserva.total + ' por tu visita del ' + reserva.fecha + '?', { textoConfirmar: 'Pagar', tipo: 'info' })) return

            try {
                await pagarReserva(reserva)
                await this.cargar()
                notificar('Pago confirmado. Revisa tu boleta en Mis Compras.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo procesar el pago. Intenta nuevamente.', 'error')
            }
        },

        // Abre el modal con una copia de los datos: si el cliente cancela, la tabla no cambia.
        async abrirEdicion(reserva) {
            if (reserva.pagado) return
            this.fechas = rangoFechasReserva()
            this.edicion = {
                id: reserva.id,
                nombre: reserva.nombre || '',
                correo: reserva.correo || '',
                telefono: reserva.telefono || '',
                fecha: reserva.fecha || ''
            }
            await this.$nextTick()
            this.$refs.primerCampo?.focus()
        },

        cerrarEdicion() {
            if (!this.guardando) this.edicion = null
        },

        async guardarEdicion() {
            const errores = erroresDatosReserva(this.edicion)
            if (errores.length) {
                notificar(errores, 'error')
                return
            }

            this.guardando = true
            try {
                const { id, nombre, correo, telefono, fecha } = this.edicion
                await actualizarReserva(id, {
                    nombre: nombre.trim(),
                    correo: correo.trim(),
                    telefono: telefono.replace(/\s/g, ''),
                    fecha
                })
                await this.cargar()
                this.guardando = false
                this.edicion = null
                notificar('Reserva actualizada correctamente.', 'exito')
            } catch (error) {
                console.error(error)
                this.guardando = false
                notificar('No se pudo actualizar la reserva. Intenta nuevamente.', 'error')
            }
        },

        async eliminar(reserva) {
            if (reserva.pagado) return
            if (!await confirmar('¿Quitar esta reserva? Esta acción no se puede deshacer.', { textoConfirmar: 'Quitar', tipo: 'error' })) return

            try {
                await eliminarReserva(reserva.id)
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
                    <p v-if="cargando" class="text-center etiquetaGris p-3">Cargando tus reservas...</p>
                    <div v-else-if="reservas.length === 0" class="reservasVacio">
                        <p>Aún no tienes reservas.</p>
                        <a class="btn botonAmarillo" href="tienda.html">Ir a la tienda</a>
                    </div>
                    <div v-else class="bloqueAdmin">
                        <!-- data-label da el título de cada dato cuando la fila se convierte en tarjeta. -->
                        <table class="tablaReservas">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Teléfono</th>
                                    <th>Fecha de visita</th>
                                    <th>Total</th>
                                    <th>Registrada</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(reserva, indice) in reservas" :key="reserva.id" :class="{ filaPagada: reserva.pagado }">
                                    <td data-label="Reserva" class="celdaNumero">#{{ reservas.length - indice }}</td>
                                    <td data-label="Nombre">{{ reserva.nombre }}</td>
                                    <td data-label="Correo" class="celdaCorreo">{{ reserva.correo }}</td>
                                    <td data-label="Teléfono">{{ reserva.telefono }}</td>
                                    <td data-label="Fecha de visita" class="celdaDestacada">{{ reserva.fecha }}</td>
                                    <td data-label="Total" class="amarillo celdaDestacada">{{ reserva.total }}</td>
                                    <td data-label="Registrada">{{ fechaLegible(reserva.fechaRegistro) }}</td>
                                    <td data-label="Estado">
                                        <span class="estadoReserva" :class="reserva.pagado ? 'estadoPagada' : 'estadoPendiente'">
                                            {{ reserva.pagado ? '✓ Pagada' : 'Pendiente de pago' }}
                                        </span>
                                    </td>
                                    <td data-label="Acciones" class="celdaAcciones">
                                        <div v-if="!reserva.pagado" class="accionesReserva">
                                            <button class="botonPagar" @click="pagar(reserva)">Pagar</button>
                                            <button class="botonEditar" @click="abrirEdicion(reserva)">Editar</button>
                                            <button class="botonEliminar" @click="eliminar(reserva)">Quitar</button>
                                        </div>
                                        <a v-else class="enlaceBoleta" href="miscompras.html">Ver boleta →</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <!-- Modal de edición: un solo formulario en lugar de cuatro ventanas emergentes. -->
            <div v-if="edicion" class="mensajeFondo" @click.self="cerrarEdicion" @keydown.esc="cerrarEdicion">
                <form class="mensajeCaja mensaje-info cajaFormulario" role="dialog" aria-modal="true" aria-labelledby="tituloEdicion" novalidate @submit.prevent="guardarEdicion">
                    <h2 class="mensajeTitulo" id="tituloEdicion">Editar reserva</h2>
                    <p class="etiquetaGris mb-3">Cambia los datos que necesites y guarda.</p>

                    <div class="campo">
                        <label class="form-label celeste" for="editarNombre">Nombre completo</label>
                        <input v-model="edicion.nombre" ref="primerCampo" class="form-control" type="text" id="editarNombre" autocomplete="name">
                    </div>
                    <div class="campo">
                        <label class="form-label celeste" for="editarCorreo">Correo</label>
                        <input v-model="edicion.correo" class="form-control" type="email" id="editarCorreo" autocomplete="email">
                    </div>
                    <div class="campo">
                        <label class="form-label celeste" for="editarTelefono">Teléfono</label>
                        <input v-model="edicion.telefono" class="form-control" type="tel" id="editarTelefono" inputmode="numeric" placeholder="999 999 999" autocomplete="tel">
                    </div>
                    <div class="campo">
                        <label class="form-label celeste" for="editarFecha">Fecha de visita</label>
                        <input v-model="edicion.fecha" :min="fechas.minima" :max="fechas.maxima" class="form-control" type="date" id="editarFecha">
                    </div>

                    <div class="mensajeAcciones">
                        <button type="button" class="mensajeBoton mensajeBotonSecundario" @click="cerrarEdicion" :disabled="guardando">Cancelar</button>
                        <button type="submit" class="mensajeBoton" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar cambios' }}</button>
                    </div>
                </form>
            </div>

            <Footer />
        </div>
    `

}
