// Eventos.js - Cumpleaños y eventos (users/eventos.html). No es un producto del
// carrito: el cliente elige un paquete, completa la solicitud y el admin la
// confirma o rechaza desde "Administración de reservas y ventas".

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { solicitarEvento, obtenerMisEventos, cancelarEvento, obtenerPaquetes } from '../services/eventService.js'
import { enviarCorreo } from '../services/mailService.js'
import { esperarUsuario, obtenerPerfil } from '../services/authService.js'
import { notificar, confirmar } from '../utils/notificaciones.js'
import { formatearPrecio, fechaLegible } from '../utils/formatters.js'
import { rangoFechasReserva, esCorreoValido, esTelefonoValido } from '../utils/validators.js'
import { PAQUETES_EVENTO } from '../utils/constants.js'

const MINIMO_NINOS = 5
const MAXIMO_NINOS = 40
const ESTADOS = { pendiente: 'Pendiente de confirmación', confirmado: '✓ Confirmado', rechazado: '✕ No disponible' }

function formularioVacio() {
    return { cumpleanero: '', edad: '', fecha: '', hora: '15:00', ninos: 10, paquete: 'galactico', nombre: '', telefono: '', correo: '', comentarios: '' }
}

export default {

    components: { Header, Footer },

    data() {
        return {
            usuario: null,
            formulario: formularioVacio(),
            paquetes: PAQUETES_EVENTO,
            misEventos: [],
            cargando: true,
            enviando: false,
            fechas: rangoFechasReserva(),
            minimo: MINIMO_NINOS,
            maximo: MAXIMO_NINOS
        }
    },

    computed: {
        paqueteElegido() {
            return this.paquetes.find(paquete => paquete.id === this.formulario.paquete)
        },

        estimado() {
            return (this.paqueteElegido?.precioPorNino || 0) * (Number(this.formulario.ninos) || 0)
        }
    },

    async mounted() {
        // Paquetes editables desde el panel admin (Gestión de catálogo y promociones).
        this.paquetes = await obtenerPaquetes()
        if (!this.paqueteElegido) this.formulario.paquete = this.paquetes[0]?.id || ''

        this.usuario = await esperarUsuario()
        if (this.usuario) {
            const perfil = await obtenerPerfil(this.usuario.uid).catch(() => null)
            this.formulario.nombre = perfil?.nombreCompleto || ''
            this.formulario.telefono = perfil?.telefono || ''
            this.formulario.correo = perfil?.correo || this.usuario.email || ''
            this.misEventos = await obtenerMisEventos().catch(error => { console.error(error); return [] })
        }
        this.cargando = false
    },

    methods: {
        formatearPrecio,
        fechaLegible,

        textoEstado(estado) {
            return ESTADOS[estado] || estado
        },

        colorEstado(estado) {
            return { pendiente: 'var(--amarillo-texto, var(--amarillo))', confirmado: 'var(--verde-texto, var(--verde))', rechazado: 'var(--rojo-texto, var(--rojo))' }[estado]
        },

        errores() {
            const f = this.formulario
            const errores = []
            if (!f.cumpleanero.trim()) errores.push('Escribe el nombre del cumpleañero o del evento.')
            if (!f.fecha) errores.push('Elige la fecha del evento.')
            else if (f.fecha < this.fechas.minima || f.fecha > this.fechas.maxima) errores.push('La fecha debe estar entre hoy y un año después.')
            if (!f.hora) errores.push('Elige la hora de inicio.')
            const ninos = Number(f.ninos)
            if (!Number.isInteger(ninos) || ninos < MINIMO_NINOS || ninos > MAXIMO_NINOS) errores.push('El número de niños debe estar entre ' + MINIMO_NINOS + ' y ' + MAXIMO_NINOS + '.')
            if (!f.nombre.trim()) errores.push('Escribe el nombre de la persona de contacto.')
            if (!esTelefonoValido(f.telefono.replace(/\s/g, ''))) errores.push('Ingresa un teléfono válido de 9 dígitos.')
            if (!esCorreoValido(f.correo.trim())) errores.push('Ingresa un correo electrónico válido.')
            return errores
        },

        async enviar() {
            if (!this.usuario) {
                window.location.href = 'login.html'
                return
            }
            const errores = this.errores()
            if (errores.length) {
                notificar(errores, 'error')
                return
            }

            this.enviando = true
            try {
                const f = this.formulario
                const evento = await solicitarEvento({
                    cumpleanero: f.cumpleanero.trim(),
                    edad: f.edad ? Number(f.edad) : null,
                    fecha: f.fecha,
                    hora: f.hora,
                    ninos: Number(f.ninos),
                    paquete: this.paqueteElegido.nombre,
                    estimado: this.estimado,
                    nombre: f.nombre.trim(),
                    telefono: f.telefono.replace(/\s/g, ''),
                    correo: f.correo.trim(),
                    comentarios: f.comentarios.trim()
                })
                enviarCorreo({
                    para: evento.correo,
                    nombre: evento.nombre,
                    asunto: 'Recibimos tu solicitud de evento — Star Park',
                    mensaje: 'Recibimos tu solicitud del ' + evento.paquete + ' para ' + evento.cumpleanero + ' el ' + evento.fecha + ' a las ' + evento.hora +
                        ' (' + evento.ninos + ' niños, estimado ' + formatearPrecio(evento.estimado) + '). Te contactaremos para confirmarla.'
                })
                this.misEventos = await obtenerMisEventos()
                const { nombre, telefono, correo } = f
                this.formulario = { ...formularioVacio(), nombre, telefono, correo, paquete: f.paquete }
                notificar('¡Solicitud enviada! Te contactaremos para confirmar tu evento.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo enviar la solicitud. Intenta nuevamente.', 'error')
            } finally {
                this.enviando = false
            }
        },

        async cancelar(evento) {
            if (!await confirmar('¿Cancelar la solicitud del ' + evento.fecha + '?', { textoConfirmar: 'Cancelar solicitud', textoCancelar: 'Volver', tipo: 'error' })) return
            try {
                await cancelarEvento(evento.id)
                this.misEventos = this.misEventos.filter(item => item.id !== evento.id)
                notificar('Solicitud cancelada.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo cancelar la solicitud. Intenta nuevamente.', 'error')
            }
        }
    },

    template: `
        <div>
            <Header />

            <main id="contenido">
                <div class="text-center text-white p-3 p-md-5">
                    <h1>CUMPLEAÑOS Y EVENTOS EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Celebra una fiesta de otra galaxia 🎂🚀</p>
                </div>

                <!-- Paquetes disponibles: al tocar uno, queda elegido en el formulario. -->
                <section id="paquetes">
                    <div class="seccionCabecera">
                        <h2>PAQUETES DE CELEBRACIÓN</h2>
                        <p class="etiquetaGris">Precio referencial por niño. Te confirmamos el monto final por teléfono.</p>
                    </div>
                    <div class="grilla3col">
                        <button v-for="paquete in paquetes" :key="paquete.id" type="button"
                            class="tarjetaAtraccion glass text-start p-0"
                            :style="formulario.paquete === paquete.id ? { borderColor: 'var(--amarillo)', boxShadow: '0 0 0 2px var(--amarillo)' } : null"
                            :aria-pressed="formulario.paquete === paquete.id"
                            @click="formulario.paquete = paquete.id">
                            <div class="tarjetaCuerpo">
                                <h3 class="celeste">{{ paquete.nombre }}</h3>
                                <p>{{ paquete.detalle }}</p>
                                <p class="amarillo fw-bold mb-0">{{ formatearPrecio(paquete.precioPorNino) }} por niño</p>
                                <small v-if="formulario.paquete === paquete.id" class="amarillo">✓ Elegido</small>
                            </div>
                        </button>
                    </div>
                </section>

                <div class="layoutCarrito">
                    <div class="glass bloqueFormulario">
                        <h3>Solicitud de evento</h3>
                        <form novalidate @submit.prevent="enviar">
                            <div class="row g-2">
                                <div class="col-8 campo">
                                    <label class="form-label" for="cumpleanero">Cumpleañero / nombre del evento</label>
                                    <input v-model="formulario.cumpleanero" class="form-control" id="cumpleanero" placeholder="Ej. Mateo" required>
                                </div>
                                <div class="col-4 campo">
                                    <label class="form-label" for="edad">Edad que cumple</label>
                                    <input v-model="formulario.edad" class="form-control" id="edad" type="number" min="1" max="99" placeholder="6">
                                </div>
                                <div class="col-7 campo">
                                    <label class="form-label" for="fechaEvento">Fecha</label>
                                    <input v-model="formulario.fecha" class="form-control" id="fechaEvento" type="date" :min="fechas.minima" :max="fechas.maxima" required>
                                </div>
                                <div class="col-5 campo">
                                    <label class="form-label" for="hora">Hora de inicio</label>
                                    <input v-model="formulario.hora" class="form-control" id="hora" type="time" min="10:00" max="20:00" required>
                                </div>
                                <div class="col-6 campo">
                                    <label class="form-label" for="ninos">Número de niños</label>
                                    <input v-model.number="formulario.ninos" class="form-control" id="ninos" type="number" :min="minimo" :max="maximo" required>
                                </div>
                                <div class="col-6 campo">
                                    <label class="form-label" for="paquete">Paquete</label>
                                    <select v-model="formulario.paquete" class="form-select" id="paquete">
                                        <option v-for="paquete in paquetes" :key="paquete.id" :value="paquete.id">{{ paquete.nombre }}</option>
                                    </select>
                                </div>
                            </div>
                            <div class="separadorFormulario my-3"></div>
                            <div class="campo">
                                <label class="form-label" for="contacto">Persona de contacto</label>
                                <input v-model="formulario.nombre" class="form-control" id="contacto" autocomplete="name" required>
                            </div>
                            <div class="row g-2">
                                <div class="col-sm-6 campo">
                                    <label class="form-label" for="telefonoEvento">Teléfono</label>
                                    <input v-model="formulario.telefono" class="form-control" id="telefonoEvento" type="tel" placeholder="999 999 999" autocomplete="tel" required>
                                </div>
                                <div class="col-sm-6 campo">
                                    <label class="form-label" for="correoEvento">Correo</label>
                                    <input v-model="formulario.correo" class="form-control" id="correoEvento" type="email" autocomplete="email" required>
                                </div>
                            </div>
                            <div class="campo">
                                <label class="form-label" for="comentarios">Comentarios (opcional)</label>
                                <textarea v-model="formulario.comentarios" class="form-control" id="comentarios" rows="3" maxlength="500" placeholder="Temática, alergias, decoración especial..."></textarea>
                            </div>
                            <div class="totalFila">
                                <p>Estimado ({{ formulario.ninos || 0 }} niños)</p>
                                <p class="amarillo">{{ formatearPrecio(estimado) }}</p>
                            </div>
                            <button v-if="usuario || cargando" type="submit" class="btn botonAmarillo w-100" :disabled="enviando || cargando">{{ enviando ? 'Enviando...' : 'Enviar solicitud' }}</button>
                            <a v-else class="btn botonAmarillo w-100" href="login.html">Inicia sesión para enviar tu solicitud</a>
                        </form>
                    </div>

                    <div class="glass bloqueFormulario">
                        <h3>Mis solicitudes</h3>
                        <div v-if="cargando" class="placeholder-glow" aria-hidden="true">
                            <span v-for="n in 2" :key="n" class="placeholder col-12 mb-3 rounded" style="height: 72px"></span>
                        </div>
                        <p v-else-if="!usuario">Inicia sesión para ver el estado de tus solicitudes.</p>
                        <p v-else-if="!misEventos.length">Aún no has enviado solicitudes.</p>
                        <article v-for="evento in misEventos" :key="evento.id" class="itemCarrito flex-wrap gap-2">
                            <div>
                                <p class="mb-0 text-white">{{ evento.paquete }} · {{ evento.cumpleanero }}</p>
                                <small class="etiquetaGris">{{ evento.fecha }} {{ evento.hora }} · {{ evento.ninos }} niños · {{ formatearPrecio(evento.estimado) }}</small>
                                <p class="mb-0 small fw-bold" :style="{ color: colorEstado(evento.estado) }">{{ textoEstado(evento.estado) }}</p>
                            </div>
                            <button v-if="evento.estado === 'pendiente'" type="button" class="botonEliminar" @click="cancelar(evento)">Cancelar</button>
                        </article>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    `

}
