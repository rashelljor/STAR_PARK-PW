// MisCompras.js - Vista de "Mis Compras" (antes users/miscompras.html y
// controller/miscompras.js). Muestra las boletas de las compras confirmadas.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { db } from '../config/firebaseConfig.js'
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { obtenerCompras } from '../services/purchaseService.js'
import { esperarUsuario, obtenerPerfil } from '../services/authService.js'
import { formatearPrecio, formatearFechaHora } from '../utils/formatters.js'
import { CONTENIDO_INICIAL } from '../utils/contenidoInicial.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            compras: [],
            perfil: null,
            direccion: CONTENIDO_INICIAL.ubicacion
        }
    },

    async mounted() {
        const usuario = await esperarUsuario()
        if (!usuario) {
            alert('Inicia sesión para ver tus compras.')
            window.location.href = 'login.html'
            return
        }

        this.compras = await obtenerCompras()
        this.perfil = await obtenerPerfil(usuario.uid)

        const contenido = await getDoc(doc(db, 'contenido', 'institucional'))
        if (contenido.exists() && contenido.data().ubicacion) this.direccion = contenido.data().ubicacion
    },

    methods: {
        formatearPrecio,

        numeroCompra(indice) {
            return (indice + 1).toString().padStart(2, '0')
        },

        // Serie y correlativo del comprobante: se deriva del id único del
        // documento en Firestore para que cada boleta tenga un identificador
        // estable e irrepetible (no reemplaza un correlativo SUNAT real).
        serieCompra(compra) {
            return 'B001-' + (compra.id || '').slice(-8).toUpperCase().padStart(8, '0')
        },

        fechaLegible(fecha) {
            if (!fecha) return ''
            const fechaJs = typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha)
            return formatearFechaHora(fechaJs)
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div class="text-center text-white p-3 p-md-5">
                    <h1>MIS COMPRAS EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Tus boletas de venta registradas</p>
                </div>

                <div id="listaCompras">
                    <p v-if="compras.length === 0" class="etiqueta glass text-center p-4">No has realizado ninguna compra todavía</p>

                    <section v-for="(compra, indice) in compras" :key="indice" class="glass bloqueFormulario">
                        <div class="totalFila">
                            <div>
                                <h3 class="celeste">BOLETA DE VENTA ELECTRÓNICA</h3>
                                <p class="etiqueta">Serie {{ serieCompra(compra) }}</p>
                            </div>
                            <div class="text-md-end">
                                <p class="etiquetaGris">FECHA DE EMISIÓN</p>
                                <p class="celeste">{{ fechaLegible(compra.fecha) }}</p>
                            </div>
                        </div>

                        <div class="separadorFormulario"></div>

                        <div class="totalFila">
                            <div>
                                <p class="etiquetaGris">EMISOR</p>
                                <h3>FAMILY PARK S.A.C.</h3>
                                <p>RUC: 20555297018</p>
                                <p>{{ direccion }}</p>
                            </div>
                            <div class="text-md-end">
                                <p class="etiquetaGris">CLIENTE</p>
                                <h3>{{ perfil?.nombreCompleto || 'Cliente Star Park' }}</h3>
                                <p>{{ perfil?.tipoDocumento || 'DNI' }}: {{ perfil?.numeroDocumento || 'No especificado' }}</p>
                            </div>
                        </div>

                        <div class="separadorFormulario"></div>

                        <div>
                            <p class="etiquetaGris">DETALLE DE LA OPERACIÓN</p>
                            <table class="table table-dark table-sm mb-0">
                                <thead>
                                    <tr>
                                        <th>Descripción</th>
                                        <th>Cantidad</th>
                                        <th>P. Unitario</th>
                                        <th>Importe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(item, i) in compra.items" :key="i">
                                        <td>{{ item.nombre }}</td>
                                        <td>1</td>
                                        <td>{{ formatearPrecio(item.precio) }}</td>
                                        <td>{{ formatearPrecio(item.precio) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="totalFila">
                            <p>IMPORTE TOTAL A PAGAR (SOLES)</p>
                            <p class="amarillo">{{ compra.total }}</p>
                        </div>

                        <p class="etiquetaGris text-center">¡Gracias por tu preferencia!</p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    `

}
