// Tienda.js - Vista de la tienda (antes users/tienda.html). Dibuja las
// promociones y el catálogo (botín) leyendo el mismo catálogo compartido
// con el panel de administración, y agrega productos al carrito.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import ProductGrid from '../components/ProductGrid.js'
import Loading from '../components/Loading.js'
import ResenasAside, { estrellasTexto } from '../components/ResenasAside.js'
import { getActiveProducts, searchProducts } from '../services/catalogService.js'
import { agregarProducto } from '../services/cartService.js'
import { esperarUsuario, obtenerPerfil } from '../services/authService.js'
import { obtenerResenasPorProducto, promedioEstrellas } from '../services/reviewService.js'
import { obtenerPaquetes, obtenerImagenCumpleanos } from '../services/eventService.js'
import { formatearPrecio, fechaLegible } from '../utils/formatters.js'

// Los comentarios sobre la página se guardan como reseñas de este "producto".
const PAGINA = { id: 'pagina', nombre: 'Star Park' }
import { notificar, notificarAlCargar } from '../utils/notificaciones.js'
import { irAlHash } from '../utils/navegacion.js'

export default {

    components: { Header, Footer, ProductGrid, Loading, ResenasAside },

    data() {
        return {
            promociones: [],
            botin: [],
            bazar: [],
            paquetes: [],
            imagenCumpleanos: '../../assets/img/logostar.png',
            busqueda: '',
            resultados: [],
            cargando: true,
            error: null,
            // Reseñas por producto y producto abierto en el panel de comentarios.
            resenas: {},
            productoResenas: null,
            usuario: null
        }
    },

    async mounted() {
        try {
            // Una sola lectura del catálogo; promociones, botín y buscador salen de ella.
            const productos = await getActiveProducts()
            this.promociones = productos.filter(producto => producto.categoria === 'promociones')
            this.botin = productos.filter(producto => producto.categoria === 'botin')
            this.bazar = productos.filter(producto => producto.categoria === 'bazar')
        } catch (error) {
            console.error(error)
            this.error = 'No se pudo cargar el catálogo.'
            notificar('No se pudo cargar el catálogo. Recarga la página para intentarlo de nuevo.', 'error')
        } finally {
            this.cargando = false
        }

        // "Ver en tienda" del inicio llega con ?buscar=<atracción> y abre el buscador con ese texto.
        const buscar = new URLSearchParams(window.location.search).get('buscar')
        if (buscar && !this.error) {
            this.busqueda = buscar
            this.buscarServicio()
        }

        // Las reseñas, los paquetes y el usuario no bloquean el catálogo: llegan después.
        this.cargarResenas()
        obtenerPaquetes().then(paquetes => { this.paquetes = paquetes })
        obtenerImagenCumpleanos().then(imagen => { if (imagen) this.imagenCumpleanos = imagen }).catch(console.error)
        esperarUsuario().then(async usuario => {
            if (!usuario) return
            const perfil = await obtenerPerfil(usuario.uid).catch(() => null)
            this.usuario = { uid: usuario.uid, nombre: perfil?.nombreCompleto?.trim() || 'Astronauta' }
        })

        // Ir a #promociones, #botin o al producto abierto desde "Ver en tienda" del panel admin.
        await this.$nextTick()
        const destino = irAlHash()
        if (destino?.id.startsWith('producto-')) destino.classList.add('resaltado')
    },

    computed: {
        resenasAbiertas() {
            return this.productoResenas ? this.resenas[this.productoResenas.id] || [] : []
        },

        comentariosPagina() {
            return this.resenas[PAGINA.id] || []
        },

        promedioPagina() {
            return promedioEstrellas(this.comentariosPagina)
        }
    },

    methods: {
        formatearPrecio,
        fechaLegible,
        estrellasTexto,

        verComentariosPagina() {
            this.verResenas(PAGINA)
        },

        async cargarResenas() {
            try {
                this.resenas = await obtenerResenasPorProducto()
            } catch (error) {
                console.error(error)
            }
        },

        verResenas(producto) {
            this.productoResenas = producto
            this.$refs.panelResenas.abrir()
        },

        buscarServicio() {
            this.resultados = searchProducts(this.busqueda, [...this.promociones, ...this.botin, ...this.bazar])
        },

        limpiarBusqueda() {
            this.busqueda = ''
            this.resultados = []
            this.$refs.buscador.focus()
        },

        async agregarAlCarrito(producto, color) {
            const usuario = await esperarUsuario()
            if (!usuario) {
                notificarAlCargar('Inicia sesión para agregar productos al carrito.', 'advertencia')
                window.location.href = 'login.html'
                return
            }

            try {
                await agregarProducto(producto, color)
                notificar(producto.nombre + ' se añadió al carrito.', 'exito')
            } catch (error) {
                console.error(error)
                if (error.paraCliente) notificar(error.message, 'advertencia')
                else notificar('No se pudo agregar el producto. Intenta nuevamente.', 'error')
            }
        }
    },

    template: `
        <div>
            <Header />

            <main id="contenido">
                <section id="buscador">
                    <div class="text-center text-white p-3 p-md-5">
                        <h1>BUSCAR EN <em class="celeste">STAR </em><em>PARK</em></h1><br>
                        <p>Ingrese el nombre del servicio que desea buscar.</p>
                        <div class="buscadorFila">
                            <input
                                v-model="busqueda"
                                @input="buscarServicio"
                                @keydown.esc="limpiarBusqueda"
                                ref="buscador"
                                type="text"
                                id="servicioInput"
                                class="form-control"
                                placeholder="Ejemplo: aventura, mision, nave..."
                                aria-label="Buscar en el catálogo"
                            >
                            <button v-if="busqueda" type="button" class="btn botonCelesteBorde" @click="limpiarBusqueda">✕ Limpiar</button>
                        </div>
                        <p class="etiquetaGris mt-2">No importan las mayúsculas ni las tildes.</p>

                        <!-- Antes había un <br><hr> entre v-if y v-else-if: Vue descartaba el
                             mensaje de "sin resultados" y nunca llegaba a mostrarse. -->
                        <div id="resultado" class="mt-4" aria-live="polite">
                            <template v-if="busqueda.trim()">
                                <template v-if="resultados.length">
                                    <p class="etiquetaGris mb-3">{{ resultados.length }} {{ resultados.length === 1 ? 'resultado' : 'resultados' }} para «{{ busqueda.trim() }}»</p>
                                    <ProductGrid :products="resultados" :resenas="resenas" @add-to-cart="agregarAlCarrito" @ver-resenas="verResenas" />
                                </template>
                                <div v-else class="sinResultados glass">
                                    <p>No encontramos resultados para <strong>«{{ busqueda.trim() }}»</strong>.</p>
                                    <p class="etiquetaGris">Prueba con otra palabra o revisa el catálogo completo.</p>
                                    <button type="button" class="btn botonAmarillo mt-2" @click="limpiarBusqueda">Ver todo el catálogo</button>
                                </div>
                                <hr class="my-5">
                            </template>
                        </div>
                    </div>
                </section>
                <!-- Promociones y catálogo a la izquierda; cumpleaños en un aside a su costado. -->
                <div class="row g-4">
                    <div class="col-12 col-lg-9">
                        <!-- Productos promocionales. -->
                        <div id="promociones">
                            <div class="seccionCabecera">
                                <h2>PROMOCIONES GALÁCTICAS</h2>
                                <p class="etiquetaGris">Promociones, descuentos y recompensas especiales.</p>
                            </div>
                        </div>

                        <Loading v-if="cargando" message="Cargando catálogo..." />
                        <p v-else-if="error" class="mensajeError">{{ error }}</p>
                        <ProductGrid
                            v-else
                            :products="promociones"
                            card-class="tarjetaAtraccion"
                            con-anclas
                            :resenas="resenas"
                            @add-to-cart="agregarAlCarrito"
                            @ver-resenas="verResenas"
                        /><br>

                        <!-- Productos individuales de las atracciones. -->
                        <div id="botin" class="seccionCabecera">
                            <h2>CATÁLOGO ESPACIAL</h2>
                            <p class="etiquetaGris">Elige tus misiones y añádelas al carrito</p>
                        </div>

                        <ProductGrid
                            v-if="!cargando && !error"
                            :products="botin"
                            card-class="tarjetaServicio"
                            con-anclas
                            :resenas="resenas"
                            @add-to-cart="agregarAlCarrito"
                            @ver-resenas="verResenas"
                        />

                        <!-- Bazar intergaláctico: productos físicos con stock y colores. -->
                        <template v-if="!cargando && !error && bazar.length">
                            <br>
                            <div id="bazar" class="seccionCabecera">
                                <h2>BAZAR INTERGALÁCTICO</h2>
                                <p class="etiquetaGris">Juguetes, libros, lapiceros y más recuerdos espaciales</p>
                            </div>

                            <ProductGrid
                                :products="bazar"
                                card-class="tarjetaServicio"
                                con-anclas
                                :resenas="resenas"
                                @add-to-cart="agregarAlCarrito"
                                @ver-resenas="verResenas"
                            />
                        </template>
                    </div>

                    <!-- Los cumpleaños tienen su propio formulario (no se compran por carrito).
                         Debajo, los comentarios de los clientes sobre la página. -->
                    <aside class="col-12 col-lg-3 d-flex flex-column gap-4" aria-labelledby="tituloCumpleanos">
                        <div class="tarjetaServicio glass">
                            <div class="tarjetaImgCaja">
                                <img :src="imagenCumpleanos" alt="Celebración de cumpleaños en Star Park">
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="amarillo" id="tituloCumpleanos">¿CELEBRAS UN CUMPLEAÑOS? 🎂</h3>
                                <p>Fiestas de otra galaxia con animación, torta y juegos.</p>
                                <ul v-if="paquetes.length" class="list-unstyled mb-0">
                                    <li v-for="paquete in paquetes" :key="paquete.id" class="d-flex justify-content-between gap-2">
                                        <span>{{ paquete.nombre }}</span>
                                        <span class="amarillo text-nowrap">{{ formatearPrecio(paquete.precioPorNino) }}</span>
                                    </li>
                                </ul>
                                <small class="etiquetaGris">Precio por niño</small>
                                <a class="btn botonAmarillo mt-2" href="eventos.html">Solicitar mi evento</a>
                            </div>
                        </div>

                        <section class="glass p-3" aria-labelledby="tituloComentariosPagina">
                            <h3 class="celeste h5" id="tituloComentariosPagina">¿QUÉ OPINAN DE STAR PARK? 💬</h3>
                            <p class="mb-2">
                                <span class="amarillo" :aria-label="comentariosPagina.length ? 'Calificación ' + promedioPagina.toFixed(1) + ' de 5' : 'Sin calificaciones'">{{ estrellasTexto(promedioPagina) }}</span>
                                <small class="etiquetaGris ms-1">{{ comentariosPagina.length ? promedioPagina.toFixed(1) + ' (' + comentariosPagina.length + ')' : 'Sin comentarios' }}</small>
                            </p>
                            <p v-if="!comentariosPagina.length" class="etiquetaGris small">Aún no hay comentarios. ¡Cuéntanos qué te parece la página!</p>
                            <article v-for="resena in comentariosPagina.slice(0, 3)" :key="resena.id" class="border-bottom pb-2 mb-2 small" style="border-color: var(--borde) !important">
                                <p class="fw-bold text-white mb-0">{{ resena.nombre || 'Astronauta' }} <span class="amarillo fw-normal">{{ estrellasTexto(resena.estrellas) }}</span></p>
                                <small class="etiquetaGris">{{ fechaLegible(resena.fecha) }}</small>
                                <p v-if="resena.comentario" class="mb-0 mt-1">{{ resena.comentario }}</p>
                            </article>
                            <button type="button" class="btn botonCelesteBorde w-100 mt-1" @click="verComentariosPagina" aria-controls="panelResenas">
                                {{ comentariosPagina.length > 3 ? 'Ver todos y comentar' : 'Dejar un comentario' }}
                            </button>
                        </section>
                    </aside>
                </div>
            </main>

            <ResenasAside ref="panelResenas" :producto="productoResenas" :resenas="resenasAbiertas" :usuario="usuario" @cambio="cargarResenas" />

            <Footer />
        </div>
    `

}
