// Tienda.js - Vista de la tienda (antes users/tienda.html). Dibuja las
// promociones y el catálogo (botín) leyendo el mismo catálogo compartido
// con el panel de administración, y agrega productos al carrito.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import ProductGrid from '../components/ProductGrid.js'
import Loading from '../components/Loading.js'
import { getProductsByCategory, searchProducts } from '../services/catalogService.js'
import { agregarProducto } from '../services/cartService.js'

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
            this.promociones = await getProductsByCategory('promociones')
            this.botin = await getProductsByCategory('botin')
        } catch (error) {
            console.error(error)
            this.error = 'No se pudo cargar el catálogo.'
        } finally {
            this.cargando = false
        }
    },

    methods: {
        async buscarServicio() {
            this.resultados = await searchProducts(this.busqueda)
        },

        async agregarAlCarrito(producto) {
            await agregarProducto(producto)
            alert(producto.nombre + ' añadido al carrito')
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <section id="buscador">
                    <div class="text-center text-white p-5">
                        <h1>BUSCAR EN <em class="celeste">STAR </em><em>PARK</em></h1><br>
                        <p>Ingrese el nombre del servicio que desea buscar y haga clic en el botón "Buscar".</p>
                        <input
                            v-model="busqueda"
                            @input="buscarServicio"
                            type="text"
                            id="servicioInput"
                            class="form-control"
                            placeholder="Ejemplo: Aventura Espacial"
                        >
                        <br>
                        <button @click="buscarServicio" class="btn btn-outline-info">Buscar Servicio</button>
                        <div id="resultado">
                            <ProductGrid
                                v-if="busqueda.trim() && resultados.length"
                                :products="resultados"
                                @add-to-cart="agregarAlCarrito"
                            />
                            <p v-else-if="busqueda.trim()" class="etiquetaGris">No encontramos servicios con ese nombre.</p>
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
                    @add-to-cart="agregarAlCarrito"
                />
            </main>

            <Footer />
        </div>
    `

}
