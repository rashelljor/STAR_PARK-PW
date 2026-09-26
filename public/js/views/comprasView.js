// MisCompras.js - Vista de "Mis Compras" (antes users/miscompras.html y
// controller/miscompras.js). Muestra las boletas de las compras confirmadas.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { obtenerCompras } from '../services/purchaseService.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            compras: []
        }
    },

    async mounted() {
        this.compras = await obtenerCompras()
    },

    methods: {
        numeroCompra(indice) {
            return (indice + 1).toString().padStart(2, '0')
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div class="text-center text-white p-5">
                    <h1>MIS COMPRAS EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Tus boletas de venta registradas</p>
                </div>

                <div id="listaCompras">
                    <p v-if="compras.length === 0">No has realizado ninguna compra todavía</p>

                    <template v-for="(compra, indice) in compras" :key="indice">
                        <div>
                            <div class="infoFila">
                                <h3>Compra {{ numeroCompra(indice) }}</h3>
                                <p>Boleta de Venta</p>
                            </div>

                            <div class="infoFila">
                                <p class="em">Cliente</p>
                                <div>
                                    <h3>FAMILY PARK S.A.C.</h3>
                                    <p>RUC: 20555297018</p>
                                </div>
                            </div>

                            <div class="infoFila">
                                <div>
                                    <h3>Fecha de emisión</h3>
                                    <p>{{ compra.fecha }}</p>
                                </div>
                            </div>

                            <div class="infoFila">
                                <div>
                                    <h3>Servicios adquiridos</h3>
                                    <ul>
                                        <li v-for="(item, i) in compra.items" :key="i">
                                            {{ item.nombre }} — S/ {{ Number(item.precio).toFixed(2) }}
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div>
                                <h3>TOTAL</h3>
                                <p>{{ compra.total }}</p>
                            </div>

                            <p>¡Gracias por tu preferencia!</p>
                        </div>
                        <br>
                        <hr>
                        <hr>
                        <br>
                    </template>
                </div>
            </main>

            <Footer />
        </div>
    `

}
