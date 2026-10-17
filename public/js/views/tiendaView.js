// Tienda.js - Vista de la tienda (antes users/tienda.html). Dibuja las
// promociones y el catálogo (botín) leyendo el mismo catálogo compartido
// con el panel de administración, y agrega productos al carrito.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import ProductGrid from '../components/ProductGrid.js'
import Loading from '../components/Loading.js'
import { getActiveProducts, searchProducts } from '../services/catalogService.js'
import { agregarProducto } from '../services/cartService.js'
import { esperarUsuario } from '../services/authService.js'
import { notificar, notificarAlCargar } from '../utils/notificaciones.js'
import { irAlHash } from '../utils/navegacion.js'

export default {

    components: { Header, Footer, ProductGrid, Loading },

    data() {
        return {
            promociones: [],
            botin: [],
            busqueda: '',
            resultados: [],
            cargando: true,
            error: null
        }
    },

    async mounted() {
        try {
            // Una sola lectura del catálogo; promociones, botín y buscador salen de ella.
            const productos = await getActiveProducts()
            this.promociones = productos.filter(producto => producto.categoria === 'promociones')
            this.botin = productos.filter(producto => producto.categoria === 'botin')
        } catch (error) {
            console.error(error)
            this.error = 'No se pudo cargar el catálogo.'
            notificar('No se pudo cargar el catálogo. Recarga la página para intentarlo de nuevo.', 'error')
        } finally {
            this.cargando = false
        }

        // Ir a #promociones, #botin o al producto abierto desde "Ver en tienda" del panel admin.
        await this.$nextTick()
        const destino = irAlHash()
        if (destino?.id.startsWith('producto-')) destino.classList.add('resaltado')
    },

    methods: {
        buscarServicio() {
            this.resultados = searchProducts(this.busqueda, [...this.promociones, ...this.botin])
        },

        limpiarBusqueda() {
            this.busqueda = ''
            this.resultados = []
            this.$refs.buscador.focus()
        },

        async agregarAlCarrito(producto) {
            const usuario = await esperarUsuario()
            if (!usuario) {
                notificarAlCargar('Inicia sesión para agregar productos al carrito.', 'advertencia')
                window.location.href = 'login.html'
                return
            }

            try {
                await agregarProducto(producto)
                notificar(producto.nombre + ' se añadió al carrito.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo agregar el producto. Intenta nuevamente.', 'error')
            }
        }
    },

    template: `
        <div>
            <Header />

            <main>
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
                                    <ProductGrid :products="resultados" @add-to-cart="agregarAlCarrito" />
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
                    @add-to-cart="agregarAlCarrito"
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
                    @add-to-cart="agregarAlCarrito"
                />
            </main>

            <Footer />
        </div>
    `

}
