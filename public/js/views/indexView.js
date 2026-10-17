// Inicio.js - Vista de la página principal (antes users/index.html).
// Portada fija; atracciones, servicios, ubicación, horarios y contacto vienen de Firestore.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { db } from '../config/firebaseConfig.js'
import { collection, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { CONTENIDO_INICIAL } from '../utils/contenidoInicial.js'
import { irAlHash } from '../utils/navegacion.js'

const IMAGEN_POR_DEFECTO = '../../assets/img/logostar.png'

export default {

    components: { Header, Footer },

    data() {
        return {
            contenido: { ...CONTENIDO_INICIAL },
            atracciones: [],
            servicios: [],
            cargado: false,
            cancelar: []
        }
    },

    // El contenido se edita desde el panel admin (Contenido institucional) y se
    // escucha en tiempo real: cualquier cambio se ve sin recargar la página.
    mounted() {
        const ordenar = docs => docs.map(d => ({ id: d.id, ...d.data() })).sort((x, y) => (x.orden || 0) - (y.orden || 0))

        // Cuando llegan atracciones y servicios por primera vez (o fallan), la
        // página ya tiene su altura final y se puede ir a la sección del "#".
        const pendientes = new Set(['atracciones', 'servicios'])
        const listo = async nombre => {
            if (!pendientes.delete(nombre) || pendientes.size) return
            this.cargado = true
            await this.$nextTick()
            irAlHash()
        }
        const alFallar = nombre => error => { console.error(error); listo(nombre) }

        this.cancelar = [
            onSnapshot(doc(db, 'contenido', 'institucional'), snap => {
                this.contenido = { ...CONTENIDO_INICIAL, ...(snap.exists() ? snap.data() : {}) }
            }, error => console.error(error)),
            onSnapshot(collection(db, 'atracciones'), snap => { this.atracciones = ordenar(snap.docs); listo('atracciones') }, alFallar('atracciones')),
            onSnapshot(collection(db, 'servicios'), snap => { this.servicios = ordenar(snap.docs); listo('servicios') }, alFallar('servicios'))
        ]
    },

    computed: {
        // Abre Google Maps con la dirección que el admin configuró en Contenido institucional.
        enlaceMapa() {
            return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(this.contenido.ubicacion)
        }
    },

    unmounted() {
        this.cancelar.forEach(detener => detener())
    },

    methods: {
        imagenDe(item) {
            return item.imagen || IMAGEN_POR_DEFECTO
        },

        // Cada línea de la descripción es una viñeta cuando hay más de una.
        lineas(texto) {
            return String(texto || '').split('\n').map(l => l.trim()).filter(Boolean)
        }
    },

    template: `
        <div>
            <Header />

            <!-- Portada principal con imagen y mensaje de bienvenida. -->
            <section id="inicio" class="hero">
                <img src="../../assets/img/portada.png" alt="2 jóvenes jugando en el AirGame, Star Park" class="heroFoto">
                <div class="heroWrapper">
                    <div class="heroContenido">
                        <p class="etiqueta">¡Destino galáctico #1 en Huancayo!</p>
                        <div class="heroTituloFila">
                            <h1>TU AVENTURA ESPACIAL 🚀<br><em>Comienza Aquí</em></h1>
                        </div>
                        <p class="subtexto">
                            Bienvenidos al centro de juegos mecánicos y arcade más emocionante de Huancayo. <br>
                            ¡Regístrate como un nuevo astronauta y recibe tu primera misión!
                        </p>
                        <a class="btn btn-primary rounded-pill botonAmarillo" href="login.html">¡Iniciar Misión!</a>

                        <!-- Franja con lo que más buscan los visitantes: horario, dirección y cómo llegar. -->
                        <div class="franjaVisita glass">
                            <div class="franjaDato">
                                <span class="franjaIcono" aria-hidden="true">🕒</span>
                                <div>
                                    <p class="franjaTitulo">Horario</p>
                                    <p class="franjaTexto">{{ contenido.horarios }}</p>
                                </div>
                            </div>
                            <div class="franjaDato">
                                <span class="franjaIcono" aria-hidden="true">📍</span>
                                <div>
                                    <p class="franjaTitulo">Dirección</p>
                                    <p class="franjaTexto">{{ contenido.ubicacion }}</p>
                                </div>
                            </div>
                            <a class="btn botonCelesteBorde" :href="enlaceMapa" target="_blank" rel="noopener">🧭 Cómo llegar</a>
                        </div>
                    </div>
                </div>
            </section>

            <main>
                <!-- Lista de atracciones disponibles. -->
                <section id="atracciones">
                    <div class="seccionCabecera">
                        <h2>ATRACCIONES</h2>
                        <p class="etiquetaGris">MULTIVERSO DE ENTRETENIMIENTO</p>
                    </div>
                    <p v-if="cargado && !atracciones.length" class="etiquetaGris">Próximamente nuevas atracciones.</p>
                    <div v-else class="grilla3col">
                        <article v-for="atraccion in atracciones" :key="atraccion.id" class="tarjetaAtraccion glass">
                            <div class="tarjetaImgCaja">
                                <img :src="imagenDe(atraccion)" :alt="atraccion.nombre">
                                <div v-if="atraccion.etiqueta" class="badge">{{ atraccion.etiqueta }}</div>
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="celeste">{{ atraccion.nombre }}</h3>
                                <p>{{ atraccion.descripcion }}</p>
                            </div>
                        </article>
                    </div>
                </section>

                <!-- Servicios adicionales del parque -->
                <section id="servicios">
                    <div class="seccionCabecera">
                        <h2>SERVICIOS</h2>
                        <p class="etiquetaGris">SUMINISTROS DE ÉLITE PARA EXPLORADORES</p>
                    </div>

                    <p v-if="cargado && !servicios.length" class="etiquetaGris">Próximamente nuevos servicios.</p>
                    <div v-else class="grilla3col">
                        <article v-for="servicio in servicios" :key="servicio.id" class="tarjetaServicio glass">
                            <div class="tarjetaImgCaja">
                                <img :src="imagenDe(servicio)" :alt="servicio.nombre">
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="amarillo">{{ servicio.nombre }}</h3>
                                <ul v-if="lineas(servicio.descripcion).length > 1" class="tarjetaCuerpo">
                                    <li v-for="linea in lineas(servicio.descripcion)" :key="linea">{{ linea }}</li>
                                </ul>
                                <p v-else>{{ servicio.descripcion }}</p>
                            </div>
                        </article>
                    </div>
                </section>

                <!-- Ubicación y Horarios -->
                <section id="base-operaciones">
                    <div class="seccionCabecera">
                        <h2>UBICACIÓN Y HORARIOS</h2>
                        <p class="etiquetaGris">PLANIFICA TU EMBARQUE E INSPECCIONA LA UBICACIÓN</p>
                    </div>

                    <div class="grillaUbicacion">
                        <div class="tarjetaUbi glass">
                            <div class="tarjetaCuerpo">
                                <div>
                                    <h3 class="amarillo"> 🌎 Ubicación Estelar</h3>
                                    <p>{{ contenido.ubicacion }}</p>
                                </div>
                            </div>

                            <div class="tarjetaCuerpo">
                                <div>
                                    <h3 class="amarillo"> 🛸 Horario de Operaciones</h3>
                                    <p>{{ contenido.horarios }}</p>
                                </div>
                            </div>

                            <div class="tarjetaCuerpo">
                                <div>
                                    <h3 class="amarillo"> 📞 Contacto Galáctico</h3>
                                    <p>{{ contenido.contacto }}</p>
                                </div>
                            </div>
                        </div>

                        <a class="tarjetaMapa glass" :href="enlaceMapa" target="_blank" rel="noopener" title="Abrir en Google Maps">
                            <img src="../../assets/img/mapa_huancayo.png" alt="Mapa Ubicación Star Park, Huancayo. Abrir en Google Maps" class="mapaImagen">
                        </a>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    `

}
