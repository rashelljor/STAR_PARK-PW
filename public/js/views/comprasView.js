// MisCompras.js - Vista de "Mis Compras" (antes users/miscompras.html y
// controller/miscompras.js). Muestra las boletas de las compras confirmadas.
// Diseño de la boleta en assets/css/compras.css (1440px, 800px y 640px).

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { db } from '../config/firebaseConfig.js'
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { obtenerCompras } from '../services/purchaseService.js'
import { esperarUsuario, obtenerPerfil } from '../services/authService.js'
import { notificar, notificarAlCargar } from '../utils/notificaciones.js'
import { formatearPrecio, formatearFechaHora } from '../utils/formatters.js'
import { CONTENIDO_INICIAL } from '../utils/contenidoInicial.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            compras: [],
            perfil: null,
            cargando: true,
            direccion: CONTENIDO_INICIAL.ubicacion
        }
    },

    async mounted() {
        const usuario = await esperarUsuario()
        if (!usuario) {
            notificarAlCargar('Inicia sesión para ver tus compras.', 'advertencia')
            window.location.href = 'login.html'
            return
        }

        try {
            // Las compras más recientes primero.
            const compras = await obtenerCompras()
            this.compras = compras.sort((a, b) => this.milisegundos(b.fecha) - this.milisegundos(a.fecha))
        } catch (error) {
            console.error(error)
            notificar('No se pudieron cargar tus compras. Recarga la página para intentarlo de nuevo.', 'error')
            return
        } finally {
            this.cargando = false
        }

        // Perfil y dirección son datos complementarios de la boleta: si fallan,
        // la boleta se muestra con los valores por defecto sin alarmar al cliente.
        this.perfil = await obtenerPerfil(usuario.uid).catch(() => null)
        const contenido = await getDoc(doc(db, 'contenido', 'institucional')).catch(() => null)
        if (contenido?.exists() && contenido.data().ubicacion) this.direccion = contenido.data().ubicacion
    },

    methods: {
        formatearPrecio,

        milisegundos(fecha) {
            if (!fecha) return 0
            return typeof fecha.toMillis === 'function' ? fecha.toMillis() : new Date(fecha).getTime()
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
        },

        // El carrito guarda una línea por unidad; en la boleta se agrupan los
        // productos iguales con su cantidad, como en un comprobante real.
        detalle(compra) {
            const grupos = new Map()
            ;(compra.items || []).forEach(item => {
                const clave = item.nombre + '|' + item.precio
                const grupo = grupos.get(clave) || { nombre: item.nombre, precio: Number(item.precio || 0), cantidad: 0 }
                grupo.cantidad++
                grupos.set(clave, grupo)
            })
            return [...grupos.values()]
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
                    <p v-if="cargando" class="etiqueta glass text-center p-4">Cargando tus boletas...</p>
                    <div v-else-if="compras.length === 0" class="boletaVacia glass">
                        <p>No has realizado ninguna compra todavía.</p>
                        <a class="btn botonAmarillo" href="reservas.html">Ver mis reservas</a>
                    </div>

                    <article v-for="compra in compras" :key="compra.id" class="boleta">
                        <!-- Cabecera: emisor a la izquierda y recuadro del comprobante a la derecha. -->
                        <header class="boletaCabecera">
                            <div class="boletaEmisor">
                                <img src="../../assets/img/logostar.png" alt="" class="boletaLogo">
                                <div>
                                    <p class="boletaEmpresa">FAMILY PARK S.A.C.</p>
                                    <p class="boletaDato">{{ direccion }}</p>
                                </div>
                            </div>
                            <div class="boletaRecuadro">
                                <p>R.U.C. 20555297018</p>
                                <p class="boletaTipo">BOLETA DE VENTA ELECTRÓNICA</p>
                                <p class="boletaSerie">{{ serieCompra(compra) }}</p>
                            </div>
                        </header>

                        <!-- Datos del cliente y de la operación. -->
                        <dl class="boletaInfo">
                            <div>
                                <dt>Cliente</dt>
                                <dd>{{ perfil?.nombreCompleto || 'Cliente Star Park' }}</dd>
                            </div>
                            <div>
                                <dt>{{ perfil?.tipoDocumento || 'Documento' }}</dt>
                                <dd>{{ perfil?.numeroDocumento || 'No especificado' }}</dd>
                            </div>
                            <div>
                                <dt>Fecha de emisión</dt>
                                <dd>{{ fechaLegible(compra.fecha) }}</dd>
                            </div>
                            <div>
                                <dt>Moneda</dt>
                                <dd>Soles (PEN)</dd>
                            </div>
                        </dl>

                        <!-- Detalle: en 640px cada fila pasa a dos líneas (ver compras.css). -->
                        <div class="boletaDetalle" role="table" aria-label="Detalle de la compra">
                            <div class="boletaFila boletaFilaTitulo" role="row">
                                <span role="columnheader">Descripción</span>
                                <span role="columnheader" class="numero">Cant.</span>
                                <span role="columnheader" class="numero">P. Unit.</span>
                                <span role="columnheader" class="numero">Importe</span>
                            </div>
                            <div v-for="linea in detalle(compra)" :key="linea.nombre + linea.precio" class="boletaFila" role="row">
                                <span role="cell" class="boletaDescripcion">{{ linea.nombre }}</span>
                                <span role="cell" class="numero boletaCantidad">{{ linea.cantidad }}</span>
                                <span role="cell" class="numero boletaUnitario">{{ formatearPrecio(linea.precio) }}</span>
                                <span role="cell" class="numero boletaImporte">{{ formatearPrecio(linea.precio * linea.cantidad) }}</span>
                            </div>
                        </div>

                        <div class="boletaTotal">
                            <span>Importe total</span>
                            <strong>{{ compra.total }}</strong>
                        </div>

                        <footer class="boletaPie">
                            <span class="boletaEstado">✓ Pagado</span>
                            <p>¡Gracias por tu preferencia, astronauta!</p>
                        </footer>
                    </article>
                </div>
            </main>

            <Footer />
        </div>
    `

}
