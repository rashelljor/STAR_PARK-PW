// perfilView.js - "Mi perfil" del cliente (users/perfil.html).
// Arriba: foto (se cambia tocándola), nombre completo y rango de astronauta.
// Botones que abren ventanas: Información personal (editable), Preguntas,
// Opiniones, Favoritos, Tarjetas (editables) y Comunicaciones; y enlaces a
// Mis Reservas y Mis Compras. Abajo, la bandeja de entrada (#bandeja), la
// misma que cuenta la campanita del menú.
// Las ventanas reutilizan la tarjeta de los mensajes centrados (.mensajeCaja).

import Header, { EVENTO_PERFIL } from '../components/Header.js'
import Footer from '../components/Footer.js'
import VerMas from '../components/VerMas.js'
import { db } from '../config/firebaseConfig.js'
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { esperarUsuario, obtenerPerfil, guardarFotoPerfil } from '../services/authService.js'
import { obtenerCompras, resumenMillas } from '../services/purchaseService.js'
import { getProducts } from '../services/catalogService.js'
import { eliminarResena } from '../services/reviewService.js'
import { prepararImagen, indicacionImagen, formatosAceptados } from '../services/imageService.js'
import { formatearNumeroTarjeta, soloDigitos } from '../services/paymentService.js'
import {
    escucharNotificaciones, marcarLeida, marcarTodasLeidas, eliminarNotificacion, avisosNavegador, pedirAvisosNavegador
} from '../services/notificationService.js'
import {
    actualizarPerfil, guardarPreferencias, marcarFavorito, obtenerTarjetas, erroresDatosTarjeta, agregarTarjeta, editarTarjeta,
    eliminarTarjeta, obtenerMisResenas, obtenerMisPreguntas, enviarPregunta, eliminarPregunta
} from '../services/profileService.js'
import { notificar, confirmar, notificarAlCargar } from '../utils/notificaciones.js'
import { fechaLegible } from '../utils/formatters.js'
import { esTelefonoValido, esDocumentoValido } from '../utils/validators.js'
import { irAlHash } from '../utils/navegacion.js'
import { REGIONES, TIPOS_DOCUMENTO, PREGUNTAS_FRECUENTES } from '../utils/constants.js'

const VENTANAS = [
    { id: 'info', icono: '👤', texto: 'Información personal' },
    { id: 'preguntas', icono: '❓', texto: 'Preguntas' },
    { id: 'opiniones', icono: '⭐', texto: 'Opiniones' },
    { id: 'favoritos', icono: '❤️', texto: 'Favoritos' },
    { id: 'tarjetas', icono: '💳', texto: 'Tarjetas' },
    { id: 'comunicaciones', icono: '🔔', texto: 'Comunicaciones' }
]

const ICONOS_NOTIFICACION = { reembolso: '💸', respuesta: '💬', info: 'ℹ️' }

const tarjetaVacia = () => ({ id: null, numero: '', titular: '', vencimiento: '', alias: '' })

export default {

    components: { Header, Footer, VerMas },

    data() {
        return {
            cargando: true,
            uid: '',
            perfil: {},
            compras: [],
            notificaciones: [],
            ventanas: VENTANAS,
            // Ventana abierta (id de VENTANAS) o null.
            ventana: null,
            cargandoVentana: false,
            guardando: false,
            indicacionFoto: indicacionImagen('perfil'),
            formatosFoto: formatosAceptados(),
            regiones: REGIONES,
            tiposDocumento: TIPOS_DOCUMENTO,
            preguntasFrecuentes: PREGUNTAS_FRECUENTES,
            // Datos de cada ventana (se cargan al abrirla).
            datos: {},
            resenas: [],
            productos: {},
            preguntas: [],
            nuevaPregunta: '',
            atracciones: [],
            tarjetas: [],
            tarjeta: null,
            preferencias: { preferenciasCorreo: false },
            permisoNavegador: avisosNavegador()
        }
    },

    computed: {
        millas() {
            return resumenMillas(this.compras)
        },

        noLeidas() {
            return this.notificaciones.filter(item => !item.leida).length
        },

        tituloVentana() {
            const ventana = VENTANAS.find(item => item.id === this.ventana)
            return ventana ? ventana.icono + ' ' + ventana.texto : ''
        },

        favoritos() {
            return this.perfil.favoritos || []
        }
    },

    async mounted() {
        const usuario = await esperarUsuario()
        if (!usuario) {
            notificarAlCargar('Inicia sesión para ver tu perfil.', 'advertencia')
            window.location.href = 'login.html'
            return
        }
        this.uid = usuario.uid

        try {
            const [perfil, compras] = await Promise.all([obtenerPerfil(usuario.uid), obtenerCompras()])
            this.perfil = { ...perfil, correo: perfil?.correo || usuario.email }
            this.compras = compras
        } catch (error) {
            console.error(error)
            notificar('No se pudo cargar tu perfil. Recarga la página para intentarlo de nuevo.', 'error')
        } finally {
            this.cargando = false
        }

        this.detenerBandeja = escucharNotificaciones(usuario.uid, lista => { this.notificaciones = lista }, error => {
            console.error(error)
            notificar('No se pudo cargar tu bandeja de entrada.', 'error')
        })

        this.alPresionarTecla = evento => {
            if (evento.key === 'Escape' && document.querySelectorAll('.mensajeFondo').length === 1) this.cerrar()
        }
        document.addEventListener('keydown', this.alPresionarTecla)

        await this.$nextTick()
        irAlHash()
    },

    unmounted() {
        this.detenerBandeja?.()
        document.removeEventListener('keydown', this.alPresionarTecla)
    },

    methods: {
        fechaLegible,

        // Avisa al menú (foto y saludo) de los cambios del perfil.
        avisarCambio(detalle) {
            window.dispatchEvent(new CustomEvent(EVENTO_PERFIL, { detail: detalle }))
        },

        async cambiarFoto(evento) {
            const archivo = evento.target.files[0]
            evento.target.value = ''
            if (!archivo) return
            try {
                const foto = await prepararImagen(archivo, 'perfil')
                await guardarFotoPerfil(foto)
                this.perfil = { ...this.perfil, foto }
                this.avisarCambio({ foto })
                notificar('Foto de perfil actualizada.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo guardar la foto: ' + error.message + ' (' + this.indicacionFoto + ')', 'error')
            }
        },

        async quitarFoto() {
            if (!await confirmar('¿Quitar tu foto de perfil?', { textoConfirmar: 'Quitar' })) return
            try {
                await guardarFotoPerfil('')
                this.perfil = { ...this.perfil, foto: '' }
                this.avisarCambio({ foto: '' })
            } catch (error) {
                console.error(error)
                notificar('No se pudo quitar la foto. Intenta nuevamente.', 'error')
            }
        },

        // --- Ventanas ---

        async abrir(id) {
            this.ventana = id
            this.cargandoVentana = true
            try {
                if (id === 'info') {
                    const { nombreCompleto = '', telefono = '', tipoDocumento = '', numeroDocumento = '', region = '' } = this.perfil
                    this.datos = { nombreCompleto, telefono, tipoDocumento, numeroDocumento, region }
                } else if (id === 'opiniones') {
                    const [resenas, productos] = await Promise.all([obtenerMisResenas(), getProducts()])
                    this.resenas = resenas
                    this.productos = Object.fromEntries(productos.map(producto => [producto.id, producto.nombre]))
                } else if (id === 'preguntas') {
                    this.preguntas = await obtenerMisPreguntas()
                } else if (id === 'favoritos') {
                    const snapshot = await getDocs(collection(db, 'atracciones'))
                    this.atracciones = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() })).sort((a, b) => (a.orden || 0) - (b.orden || 0))
                } else if (id === 'tarjetas') {
                    this.tarjeta = null
                    this.tarjetas = await obtenerTarjetas()
                } else if (id === 'comunicaciones') {
                    this.preferencias = { preferenciasCorreo: Boolean(this.perfil.preferenciasCorreo) }
                    this.permisoNavegador = avisosNavegador()
                }
            } catch (error) {
                console.error(error)
                notificar('No se pudo cargar esta sección. Intenta nuevamente.', 'error')
                this.ventana = null
            } finally {
                this.cargandoVentana = false
            }
        },

        cerrar() {
            if (!this.guardando) this.ventana = null
        },

        // Información personal.
        async guardarInfo() {
            const datos = {
                ...this.datos,
                nombreCompleto: this.datos.nombreCompleto.trim().toLocaleUpperCase('es'),
                telefono: this.datos.telefono.replace(/\s/g, ''),
                numeroDocumento: this.datos.numeroDocumento.trim()
            }
            const errores = []
            if (!datos.nombreCompleto) errores.push('Ingresa tu nombre completo.')
            if (!esTelefonoValido(datos.telefono)) errores.push('Ingresa un número de teléfono válido de 9 dígitos.')
            if (!datos.tipoDocumento) errores.push('Elige tu tipo de documento.')
            else if (!esDocumentoValido(datos.tipoDocumento, datos.numeroDocumento)) errores.push(datos.tipoDocumento === 'DNI' ? 'El DNI debe tener 8 dígitos.' : 'El documento debe tener de 6 a 12 letras o números.')
            if (!datos.region) errores.push('Selecciona tu región.')
            if (errores.length) return notificar(errores, 'error')

            this.guardando = true
            try {
                await actualizarPerfil(datos)
                this.perfil = { ...this.perfil, ...datos }
                this.avisarCambio({ nombreCompleto: datos.nombreCompleto })
                this.guardando = false
                this.ventana = null
                notificar('Tus datos se guardaron correctamente.', 'exito')
            } catch (error) {
                console.error(error)
                this.guardando = false
                notificar('No se pudieron guardar tus datos. Intenta nuevamente.', 'error')
            }
        },

        // Preguntas.
        async preguntar() {
            const pregunta = this.nuevaPregunta.trim()
            if (pregunta.length < 5) return notificar('Escribe tu pregunta (al menos 5 caracteres).', 'advertencia')
            this.guardando = true
            try {
                await enviarPregunta(pregunta, { nombre: this.perfil.nombreCompleto || '', correo: this.perfil.correo || '' })
                this.nuevaPregunta = ''
                this.preguntas = await obtenerMisPreguntas()
                notificar('Recibimos tu pregunta. Te responderemos en tu bandeja de entrada.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo enviar tu pregunta. Intenta nuevamente.', 'error')
            } finally {
                this.guardando = false
            }
        },

        async borrarPregunta(pregunta) {
            if (!await confirmar('¿Eliminar esta pregunta?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return
            try {
                await eliminarPregunta(pregunta.id)
            } catch (error) {
                console.error(error)
                notificar('No se pudo eliminar la pregunta.', 'error')
            }
            this.abrir('preguntas')
        },

        // Opiniones.
        estrellas(cantidad) {
            const llenas = Math.max(0, Math.min(5, Number(cantidad) || 0))
            return '★'.repeat(llenas) + '☆'.repeat(5 - llenas)
        },

        async borrarResena(resena) {
            // El mensaje de confirmación se muestra encima de esta ventana; luego se recarga la lista.
            if (!await confirmar('¿Eliminar tu opinión sobre ' + (this.productos[resena.productoId] || 'este producto') + '?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return
            try {
                await eliminarResena(resena.id)
            } catch (error) {
                console.error(error)
                notificar('No se pudo eliminar tu opinión.', 'error')
            }
            this.abrir('opiniones')
        },

        // Favoritos.
        esFavorito(atraccion) {
            return this.favoritos.includes(atraccion.id)
        },

        async alternarFavorito(atraccion) {
            const favorito = !this.esFavorito(atraccion)
            try {
                await marcarFavorito(atraccion.id, favorito)
                this.perfil = { ...this.perfil, favoritos: favorito ? [...this.favoritos, atraccion.id] : this.favoritos.filter(id => id !== atraccion.id) }
            } catch (error) {
                console.error(error)
                notificar('No se pudo actualizar tus favoritos.', 'error')
            }
        },

        // Tarjetas.
        nuevaTarjeta() {
            this.tarjeta = tarjetaVacia()
        },

        editarTarjeta(tarjeta) {
            this.tarjeta = { id: tarjeta.id, numero: '', titular: tarjeta.titular, vencimiento: tarjeta.vencimiento, alias: tarjeta.alias || '' }
        },

        alEscribirNumero(evento) {
            this.tarjeta.numero = formatearNumeroTarjeta(evento.target.value)
        },

        alEscribirVencimiento(evento) {
            const digitos = soloDigitos(evento.target.value).slice(0, 4)
            this.tarjeta.vencimiento = digitos.length > 2 ? digitos.slice(0, 2) + '/' + digitos.slice(2) : digitos
        },

        async guardarTarjeta() {
            const nueva = !this.tarjeta.id
            const errores = erroresDatosTarjeta(this.tarjeta, nueva)
            if (errores.length) return notificar(errores, 'error')
            this.guardando = true
            try {
                if (nueva) await agregarTarjeta(this.tarjeta)
                else await editarTarjeta(this.tarjeta.id, this.tarjeta)
                this.tarjeta = null
                this.tarjetas = await obtenerTarjetas()
                notificar(nueva ? 'Tarjeta guardada.' : 'Tarjeta actualizada.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo guardar la tarjeta. Intenta nuevamente.', 'error')
            } finally {
                this.guardando = false
            }
        },

        async borrarTarjeta(tarjeta) {
            if (!await confirmar('¿Eliminar la tarjeta ' + tarjeta.marca + ' •••• ' + tarjeta.ultimos4 + '?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return
            try {
                await eliminarTarjeta(tarjeta.id)
            } catch (error) {
                console.error(error)
                notificar('No se pudo eliminar la tarjeta.', 'error')
            }
            this.abrir('tarjetas')
        },

        // Comunicaciones.
        async activarAvisos() {
            this.permisoNavegador = await pedirAvisosNavegador()
            if (this.permisoNavegador === 'granted') notificar('¡Listo! El navegador te avisará cuando llegue un mensaje a tu bandeja.', 'exito')
        },

        async guardarComunicaciones() {
            this.guardando = true
            try {
                await guardarPreferencias(this.preferencias)
                this.perfil = { ...this.perfil, ...this.preferencias }
                this.guardando = false
                this.ventana = null
                notificar('Preferencias de comunicación guardadas.', 'exito')
            } catch (error) {
                console.error(error)
                this.guardando = false
                notificar('No se pudieron guardar tus preferencias.', 'error')
            }
        },

        // --- Bandeja de entrada ---

        iconoNotificacion(notificacion) {
            return ICONOS_NOTIFICACION[notificacion.tipo] || ICONOS_NOTIFICACION.info
        },

        async leer(notificacion) {
            if (notificacion.leida) return
            await marcarLeida(notificacion.id).catch(console.error)
        },

        async leerTodas() {
            await marcarTodasLeidas(this.notificaciones).catch(error => {
                console.error(error)
                notificar('No se pudieron marcar los mensajes como leídos.', 'error')
            })
        },

        async borrarNotificacion(notificacion) {
            if (!await confirmar('¿Eliminar este mensaje de tu bandeja?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return
            await eliminarNotificacion(notificacion.id).catch(error => {
                console.error(error)
                notificar('No se pudo eliminar el mensaje.', 'error')
            })
        }
    },

    template: `
        <div>
            <Header />

            <main id="contenido">
                <div class="text-center text-white p-3 p-md-5">
                    <h1>MI PERFIL EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Tu cabina de mando, astronauta</p>
                </div>

                <div v-if="cargando" class="placeholder-glow" role="status">
                    <span class="visually-hidden">Cargando tu perfil...</span>
                    <span v-for="n in 3" :key="n" class="placeholder col-12 rounded mb-4" style="height: 160px" aria-hidden="true"></span>
                </div>

                <template v-else>
                    <!-- Foto, nombre completo y rango de astronauta. -->
                    <section class="glass p-4 mb-4" aria-labelledby="nombrePerfil">
                        <div class="d-flex flex-wrap align-items-center gap-4">
                            <div class="text-center">
                                <label class="btn btn-outline-light rounded-circle p-0 d-inline-flex align-items-center justify-content-center overflow-hidden"
                                    style="width: 120px; height: 120px" :title="'Cambiar foto (' + indicacionFoto + ')'">
                                    <img v-if="perfil.foto" :src="perfil.foto" alt="Tu foto de perfil" class="w-100 h-100 object-fit-cover">
                                    <span v-else class="display-4" aria-hidden="true">👤</span>
                                    <span class="visually-hidden">Cambiar foto de perfil ({{ indicacionFoto }})</span>
                                    <input type="file" class="visually-hidden" :accept="formatosFoto" @change="cambiarFoto">
                                </label>
                                <button v-if="perfil.foto" type="button" class="btn btn-link btn-sm d-block mx-auto celeste" @click="quitarFoto">Quitar foto</button>
                                <small v-else class="d-block etiquetaGris mt-1">Toca para subir una foto</small>
                            </div>
                            <div class="flex-grow-1">
                                <p class="etiquetaGris mb-1">@{{ perfil.nombreUsuario }} · {{ perfil.correo }}</p>
                                <h2 class="text-white mb-2" id="nombrePerfil">{{ perfil.nombreCompleto || 'Astronauta' }}</h2>
                                <span class="etiqueta">{{ millas.rango.icono }} {{ millas.rango.nombre }}</span>
                                <p class="mt-3 mb-0">
                                    <strong class="amarillo">{{ millas.disponibles }} millas disponibles</strong> · {{ millas.ganadas }} ganadas en total.
                                    <template v-if="millas.siguiente">Te faltan <strong class="celeste">{{ millas.siguiente.desde - millas.ganadas }}</strong> para ser {{ millas.siguiente.icono }} {{ millas.siguiente.nombre }}.</template>
                                    <template v-else>¡Alcanzaste el rango más alto! 🌌</template>
                                </p>
                            </div>
                        </div>
                        <div class="progress mt-3" style="height: 10px; background: var(--tarjeta)" role="progressbar" :aria-valuenow="millas.avance" aria-valuemin="0" aria-valuemax="100" aria-label="Avance al siguiente rango">
                            <div class="progress-bar" :style="{ width: millas.avance + '%', background: 'var(--celeste)' }"></div>
                        </div>
                    </section>

                    <!-- Opciones de la cuenta: ventanas emergentes y accesos a reservas y compras. -->
                    <section class="glass p-4 mb-4" aria-label="Opciones de mi cuenta">
                        <div class="d-flex flex-wrap gap-2">
                            <button v-for="opcion in ventanas" :key="opcion.id" type="button" class="btn botonCelesteBorde" @click="abrir(opcion.id)">
                                <span aria-hidden="true">{{ opcion.icono }}</span> {{ opcion.texto }}
                            </button>
                            <a class="btn botonAmarillo" href="reservas.html">🎟️ Reservas</a>
                            <a class="btn botonAmarillo" href="miscompras.html">🧾 Compras</a>
                        </div>
                    </section>

                    <!-- Bandeja de entrada: la misma que cuenta la campanita del menú. -->
                    <section class="glass p-4 mb-4" id="bandeja" aria-labelledby="tituloBandeja">
                        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2">
                            <h2 class="h4 text-white m-0" id="tituloBandeja">📬 Bandeja de entrada
                                <span v-if="noLeidas" class="estadoReserva estadoPendiente align-middle ms-1">{{ noLeidas }} sin leer</span>
                            </h2>
                            <button v-if="noLeidas" type="button" class="botonEditar" @click="leerTodas">Marcar todo como leído</button>
                        </div>
                        <p v-if="!notificaciones.length" class="etiquetaGris mb-0">No tienes mensajes por ahora. Aquí llegarán tus reembolsos y las respuestas a tus preguntas.</p>
                        <VerMas v-else :items="notificaciones" v-slot="{ visibles }">
                        <ul class="list-unstyled mb-0">
                            <li v-for="notificacion in visibles" :key="notificacion.id" class="d-flex gap-3 py-3 border-bottom" :style="notificacion.leida ? { opacity: 0.7 } : null" @click="leer(notificacion)">
                                <span class="fs-3" aria-hidden="true">{{ iconoNotificacion(notificacion) }}</span>
                                <div class="flex-grow-1">
                                    <p class="mb-1 text-white">
                                        <span v-if="!notificacion.leida" class="celeste" aria-label="Sin leer">● </span>
                                        <strong>{{ notificacion.titulo }}</strong>
                                    </p>
                                    <p class="mb-1">{{ notificacion.mensaje }}</p>
                                    <small class="etiquetaGris">{{ fechaLegible(notificacion.visibleDesde || notificacion.fecha) }}</small>
                                </div>
                                <div class="d-flex flex-column gap-2 align-items-end">
                                    <button v-if="!notificacion.leida" type="button" class="botonEditar" @click.stop="leer(notificacion)">Leído</button>
                                    <button type="button" class="botonEliminar" @click.stop="borrarNotificacion(notificacion)" :aria-label="'Eliminar ' + notificacion.titulo">Eliminar</button>
                                </div>
                            </li>
                        </ul>
                        </VerMas>
                    </section>
                </template>
            </main>

            <!-- Ventanas emergentes del perfil. -->
            <div v-if="ventana" class="mensajeFondo" @click.self="cerrar">
                <div class="mensajeCaja mensaje-info cajaFormulario" role="dialog" aria-modal="true" aria-labelledby="tituloVentana">
                    <h2 class="mensajeTitulo" id="tituloVentana">{{ tituloVentana }}</h2>

                    <p v-if="cargandoVentana" class="etiquetaGris">Cargando...</p>

                    <!-- Información personal (editable). Correo y usuario son el acceso a la cuenta: no se cambian aquí. -->
                    <form v-else-if="ventana === 'info'" novalidate @submit.prevent="guardarInfo">
                        <p class="etiquetaGris mb-3">Correo: {{ perfil.correo }} · Usuario: @{{ perfil.nombreUsuario }}</p>
                        <div class="campo">
                            <label class="form-label celeste" for="perfilNombre">Nombre completo</label>
                            <input v-model="datos.nombreCompleto" class="form-control text-uppercase" id="perfilNombre" autocomplete="name">
                        </div>
                        <div class="campo">
                            <label class="form-label celeste" for="perfilTelefono">Teléfono</label>
                            <input v-model="datos.telefono" class="form-control" type="tel" id="perfilTelefono" inputmode="numeric" placeholder="999 999 999" autocomplete="tel">
                        </div>
                        <fieldset class="campo">
                            <legend class="form-label celeste fs-6">Tipo de documento</legend>
                            <div class="grupoOpciones">
                                <label v-for="tipo in tiposDocumento" :key="tipo" class="opcionRadio"><input v-model="datos.tipoDocumento" type="radio" name="perfilTipoDocumento" :value="tipo">{{ tipo }}</label>
                            </div>
                        </fieldset>
                        <div class="campo">
                            <label class="form-label celeste" for="perfilDocumento">Número de documento</label>
                            <input v-model="datos.numeroDocumento" class="form-control" id="perfilDocumento" autocomplete="off">
                        </div>
                        <fieldset class="campo">
                            <legend class="form-label celeste fs-6">Región</legend>
                            <div class="grupoOpciones">
                                <label v-for="region in regiones" :key="region" class="opcionRadio"><input v-model="datos.region" type="radio" name="perfilRegion" :value="region">{{ region }}</label>
                            </div>
                        </fieldset>
                        <div class="mensajeAcciones">
                            <button type="button" class="mensajeBoton mensajeBotonSecundario" @click="cerrar" :disabled="guardando">Cancelar</button>
                            <button type="submit" class="mensajeBoton" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar cambios' }}</button>
                        </div>
                    </form>

                    <!-- Preguntas: frecuentes + las que el cliente envía (el admin responde a su bandeja). -->
                    <div v-else-if="ventana === 'preguntas'">
                        <h3 class="h6 celeste">Preguntas frecuentes</h3>
                        <details v-for="item in preguntasFrecuentes" :key="item.pregunta" class="mb-2">
                            <summary class="text-white">{{ item.pregunta }}</summary>
                            <p class="mt-1 mb-0">{{ item.respuesta }}</p>
                        </details>
                        <form class="mt-3" novalidate @submit.prevent="preguntar">
                            <label class="form-label celeste" for="nuevaPregunta">¿Tienes otra pregunta?</label>
                            <textarea v-model="nuevaPregunta" class="form-control" id="nuevaPregunta" rows="3" maxlength="500" placeholder="Escribe tu pregunta para el equipo de Star Park"></textarea>
                            <button type="submit" class="btn botonAmarillo mt-2" :disabled="guardando">{{ guardando ? 'Enviando...' : 'Enviar pregunta' }}</button>
                        </form>
                        <h3 class="h6 celeste mt-4">Mis preguntas</h3>
                        <p v-if="!preguntas.length" class="etiquetaGris">Aún no has enviado preguntas.</p>
                        <VerMas :items="preguntas" v-slot="{ visibles }">
                        <div v-for="pregunta in visibles" :key="pregunta.id" class="border-bottom py-2">
                            <p class="mb-1 text-white">{{ pregunta.pregunta }}</p>
                            <span class="estadoReserva" :class="pregunta.estado === 'respondida' ? 'estadoPagada' : 'estadoPendiente'">{{ pregunta.estado === 'respondida' ? '✓ Respondida' : 'Esperando respuesta' }}</span>
                            <p v-if="pregunta.respuesta" class="mt-2 mb-1"><strong class="celeste">Star Park:</strong> {{ pregunta.respuesta }}</p>
                            <button type="button" class="btn btn-link btn-sm p-0 ms-2 celeste" @click="borrarPregunta(pregunta)">Eliminar</button>
                        </div>
                        </VerMas>
                    </div>

                    <!-- Opiniones: las reseñas propias de los productos de la tienda. -->
                    <div v-else-if="ventana === 'opiniones'">
                        <p v-if="!resenas.length" class="etiquetaGris">Aún no has opinado. Puedes calificar los productos desde la tienda.</p>
                        <VerMas :items="resenas" v-slot="{ visibles }">
                        <div v-for="resena in visibles" :key="resena.id" class="border-bottom py-2">
                            <p class="mb-1 text-white"><strong>{{ productos[resena.productoId] || 'Producto retirado' }}</strong></p>
                            <p class="mb-1 amarillo" :aria-label="resena.estrellas + ' de 5 estrellas'">{{ estrellas(resena.estrellas) }}</p>
                            <p v-if="resena.comentario" class="mb-1">{{ resena.comentario }}</p>
                            <small class="etiquetaGris">{{ fechaLegible(resena.fecha) }}</small>
                            <button type="button" class="btn btn-link btn-sm p-0 ms-2 celeste" @click="borrarResena(resena)">Eliminar</button>
                        </div>
                        </VerMas>
                        <a class="btn botonCelesteBorde mt-3" href="tienda.html">Ir a la tienda</a>
                    </div>

                    <!-- Favoritos: atracciones (juegos) marcadas con ♥. -->
                    <div v-else-if="ventana === 'favoritos'">
                        <p class="etiquetaGris">{{ favoritos.length ? 'Tienes ' + favoritos.length + ' juego(s) favorito(s).' : 'Toca ♡ para guardar tus juegos favoritos.' }}</p>
                        <VerMas :items="atracciones" v-slot="{ visibles }">
                        <div v-for="atraccion in visibles" :key="atraccion.id" class="d-flex align-items-center gap-3 border-bottom py-2">
                            <img :src="atraccion.imagen || '../../assets/img/logostar.png'" alt="" style="width: 64px; height: 48px; object-fit: cover; border-radius: 6px">
                            <span class="flex-grow-1 text-white">{{ atraccion.nombre }}</span>
                            <button type="button" class="btn btn-sm rounded-pill" :class="esFavorito(atraccion) ? 'btn-danger' : 'btn-outline-light'"
                                :aria-pressed="esFavorito(atraccion)" :aria-label="(esFavorito(atraccion) ? 'Quitar de' : 'Agregar a') + ' favoritos: ' + atraccion.nombre"
                                @click="alternarFavorito(atraccion)">{{ esFavorito(atraccion) ? '♥' : '♡' }}</button>
                        </div>
                        </VerMas>
                    </div>

                    <!-- Tarjetas guardadas (editables). Del número solo se guardan los últimos 4 dígitos. -->
                    <div v-else-if="ventana === 'tarjetas'">
                        <form v-if="tarjeta" novalidate @submit.prevent="guardarTarjeta">
                            <h3 class="h6 celeste">{{ tarjeta.id ? 'Editar tarjeta' : 'Nueva tarjeta' }}</h3>
                            <div v-if="!tarjeta.id" class="campo">
                                <label class="form-label celeste" for="tarjetaNumero">Número de tarjeta</label>
                                <input :value="tarjeta.numero" @input="alEscribirNumero" class="form-control" id="tarjetaNumero" inputmode="numeric" autocomplete="cc-number" placeholder="4111 1111 1111 1111">
                            </div>
                            <div class="campo">
                                <label class="form-label celeste" for="tarjetaTitular">Titular</label>
                                <input v-model="tarjeta.titular" class="form-control text-uppercase" id="tarjetaTitular" autocomplete="cc-name">
                            </div>
                            <div class="campo">
                                <label class="form-label celeste" for="tarjetaVencimiento">Vencimiento (MM/AA)</label>
                                <input :value="tarjeta.vencimiento" @input="alEscribirVencimiento" class="form-control" id="tarjetaVencimiento" inputmode="numeric" autocomplete="cc-exp" placeholder="08/29">
                            </div>
                            <div class="campo">
                                <label class="form-label celeste" for="tarjetaAlias">Alias (opcional)</label>
                                <input v-model="tarjeta.alias" class="form-control" id="tarjetaAlias" maxlength="30" placeholder="Mi tarjeta principal">
                            </div>
                            <p class="etiquetaGris small">Por seguridad no guardamos el número completo ni el CVV.</p>
                            <div class="mensajeAcciones">
                                <button type="button" class="mensajeBoton mensajeBotonSecundario" @click="tarjeta = null" :disabled="guardando">Volver</button>
                                <button type="submit" class="mensajeBoton" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar tarjeta' }}</button>
                            </div>
                        </form>
                        <template v-else>
                            <p v-if="!tarjetas.length" class="etiquetaGris">No tienes tarjetas guardadas.</p>
                            <VerMas :items="tarjetas" v-slot="{ visibles }">
                            <div v-for="item in visibles" :key="item.id" class="d-flex flex-wrap align-items-center gap-2 border-bottom py-2">
                                <div class="flex-grow-1">
                                    <p class="mb-0 text-white"><strong>{{ item.marca }} •••• {{ item.ultimos4 }}</strong><span v-if="item.alias" class="etiquetaGris"> · {{ item.alias }}</span></p>
                                    <small class="etiquetaGris">{{ item.titular }} · vence {{ item.vencimiento }}</small>
                                </div>
                                <button type="button" class="botonEditar" @click="editarTarjeta(item)">Editar</button>
                                <button type="button" class="botonEliminar" @click="borrarTarjeta(item)">Eliminar</button>
                            </div>
                            </VerMas>
                            <button type="button" class="btn botonAmarillo mt-3" @click="nuevaTarjeta">+ Agregar tarjeta</button>
                        </template>
                    </div>

                    <!-- Comunicaciones: correo y avisos del navegador (campanita). -->
                    <form v-else-if="ventana === 'comunicaciones'" novalidate @submit.prevent="guardarComunicaciones">
                        <div class="campo filaCheckbox">
                            <label><input v-model="preferencias.preferenciasCorreo" type="checkbox">Recibir por correo novedades, promociones y anuncios de Star Park.</label>
                        </div>
                        <h3 class="h6 celeste mt-3">Avisos del navegador 🔔</h3>
                        <p class="mb-2">Los mensajes de tu bandeja siempre se ven en la campanita del menú. Además, el navegador puede avisarte con una notificación.</p>
                        <p v-if="permisoNavegador === 'granted'" class="mb-0"><span class="estadoReserva estadoPagada">✓ Activados</span></p>
                        <p v-else-if="permisoNavegador === 'denied'" class="etiquetaGris mb-0">Los bloqueaste en este navegador. Para activarlos, permite las notificaciones de este sitio en la configuración del navegador (ícono 🔒 junto a la dirección).</p>
                        <p v-else-if="permisoNavegador === 'no-disponible'" class="etiquetaGris mb-0">Este navegador no permite notificaciones.</p>
                        <button v-else type="button" class="btn botonCelesteBorde" @click="activarAvisos">Activar avisos del navegador</button>
                        <div class="mensajeAcciones">
                            <button type="button" class="mensajeBoton mensajeBotonSecundario" @click="cerrar" :disabled="guardando">Cancelar</button>
                            <button type="submit" class="mensajeBoton" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar' }}</button>
                        </div>
                    </form>

                    <div v-if="!cargandoVentana && !['info', 'comunicaciones'].includes(ventana)" class="mensajeAcciones">
                        <button type="button" class="mensajeBoton mensajeBotonSecundario" @click="cerrar">Cerrar</button>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    `

}
