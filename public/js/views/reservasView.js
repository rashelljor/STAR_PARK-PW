// Reservas.js - Vista de "Mis Reservas" (antes users/reservas.html y
// controller/reservas.js). Lista las reservas guardadas y permite pagarlas
// (en la página de pago), editarlas o eliminarlas. Una reserva pagada ya no se
// puede editar ni quitar (también lo impiden las reglas de Firestore) y muestra
// su entrada digital con código QR.
// En pantallas de 800px o menos, la tabla se muestra como tarjetas apiladas (ver reservas.css).

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import CalendarioAforo from '../components/CalendarioAforo.js'
import EntradaQR from '../components/EntradaQR.js'
import { obtenerReservas, actualizarReserva, eliminarReserva, entradasDe } from '../services/bookingService.js'
import { cuposLibres } from '../services/capacityService.js'
import { esperarUsuario } from '../services/authService.js'
import { notificar, confirmar, notificarAlCargar } from '../utils/notificaciones.js'
import { fechaLegible, formatearPrecio, milisegundos } from '../utils/formatters.js'
import { rangoFechasReserva, erroresDatosReserva } from '../utils/validators.js'

export default {

    components: { Header, Footer, CalendarioAforo, EntradaQR },

    data() {
        return {
            reservas: [],
            cargando: true,
            // Reserva que se está editando en el modal (null = modal cerrado).
            edicion: null,
            // Reserva pagada cuya entrada QR se está mostrando.
            entrada: null,
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
        fechaLegible,
        formatearPrecio,
        entradasDe,

        // Las más recientes primero.
        async cargar() {
            const reservas = await obtenerReservas()
            this.reservas = reservas.sort((a, b) => milisegundos(b.fechaRegistro) - milisegundos(a.fechaRegistro))
        },

        textoEstado(reserva) {
            if (reserva.estado === 'usada') return '✓ Entrada usada'
            return reserva.pagado ? '✓ Pagada' : 'Pendiente de pago'
        },

        // El pago se hace en su propia página, con los datos de la tarjeta.
        pagar(reserva) {
            // Las reservas anteriores al nuevo sistema guardaban el total como texto
            // y las reglas de pago no pueden validarlas.
            if (typeof reserva.total !== 'number') {
                notificar('Esta reserva se registró con el sistema anterior y no puede pagarse. Quítala y vuelve a reservar desde la tienda.', 'advertencia')
                return
            }
            window.location.href = 'pago.html?reserva=' + encodeURIComponent(reserva.id)
        },

        // Abre el modal con una copia de los datos: si el cliente cancela, la tabla no cambia.
        async abrirEdicion(reserva) {
            if (reserva.pagado) return
            this.fechas = rangoFechasReserva()
            this.edicion = {
                original: reserva,
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
                const { original, nombre, correo, telefono, fecha } = this.edicion
                const entradas = entradasDe(original)
                if (fecha !== original.fecha && await cuposLibres(fecha, original.id) < entradas) {
                    notificar('El ' + fecha + ' ya no tiene cupos para ' + entradas + ' entradas. Elige otra fecha.', 'advertencia')
                    this.guardando = false
                    return
                }
                await actualizarReserva(original, {
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
                await eliminarReserva(reserva)
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

            <main id="contenido">
                <div class="text-center text-white p-3 p-md-5">
                    <h1>PANEL DE RESERVA EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Todas tus reservas registradas</p>
                </div>

                <div class="panelAdmin">
                    <div v-if="cargando" class="placeholder-glow p-2" aria-busy="true" aria-label="Cargando tus reservas">
                        <span v-for="n in 4" :key="n" class="placeholder col-12 mb-3 rounded" style="height: 44px"></span>
                    </div>
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
                                    <td data-label="Total" class="amarillo celdaDestacada">
                                        {{ formatearPrecio(reserva.total) }}
                                        <small v-if="reserva.cupon" class="d-block celeste">Cupón {{ reserva.cupon }}</small>
                                    </td>
                                    <td data-label="Registrada">{{ fechaLegible(reserva.fechaRegistro) }}</td>
                                    <td data-label="Estado">
                                        <span class="estadoReserva" :class="reserva.pagado ? 'estadoPagada' : 'estadoPendiente'">
                                            {{ textoEstado(reserva) }}
                                        </span>
                                    </td>
                                    <td data-label="Acciones" class="celdaAcciones">
                                        <div v-if="!reserva.pagado" class="accionesReserva">
                                            <button class="botonPagar" @click="pagar(reserva)">Pagar</button>
                                            <button class="botonEditar" @click="abrirEdicion(reserva)">Editar</button>
                                            <button class="botonEliminar" @click="eliminar(reserva)">Quitar</button>
                                        </div>
                                        <div v-else class="accionesReserva">
                                            <button class="botonEditar" @click="entrada = reserva">🎟️ Ver entrada</button>
                                            <a class="enlaceBoleta" href="miscompras.html">Ver boleta →</a>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <!-- Entrada digital con QR (reutiliza la tarjeta de los mensajes centrados). -->
            <div v-if="entrada" class="mensajeFondo" @click.self="entrada = null" @keydown.esc="entrada = null">
                <div class="mensajeCaja mensaje-exito cajaFormulario" role="dialog" aria-modal="true" aria-labelledby="tituloEntrada">
                    <h2 class="mensajeTitulo" id="tituloEntrada">Tu entrada a Star Park</h2>
                    <p class="etiquetaGris mb-3">Muestra este código en la puerta el día de tu visita.</p>
                    <EntradaQR :reserva="entrada" />
                    <div class="mensajeAcciones">
                        <button type="button" class="mensajeBoton" @click="entrada = null" ref="cerrarEntrada">Cerrar</button>
                    </div>
                </div>
            </div>

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
                        <span class="form-label celeste">Fecha de visita</span>
                        <!-- Las reservas antiguas (sin "entradas") no tienen registro de aforo: no hay nada propio que descontar. -->
                        <CalendarioAforo v-model="edicion.fecha" :min="fechas.minima" :max="fechas.maxima"
                            :entradas="entradasDe(edicion.original)"
                            :ignorar="{ fecha: edicion.original.fecha, entradas: edicion.original.entradas || 0 }" />
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
