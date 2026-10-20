// MisCompras.js - Vista de "Mis Compras" (antes users/miscompras.html y
// controller/miscompras.js). Muestra las boletas de las compras confirmadas.
// Diseño de la boleta en assets/css/compras.css (1440px, 800px y 640px).

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { db } from '../config/firebaseConfig.js'
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { obtenerCompras, resumenMillas } from '../services/purchaseService.js'
import { esperarUsuario, obtenerPerfil } from '../services/authService.js'
import { notificar, notificarAlCargar } from '../utils/notificaciones.js'
import { formatearPrecio, fechaLegible, milisegundos } from '../utils/formatters.js'
import { RANGOS_ASTRONAUTA, MILLAS_POR_CANJE, SOLES_POR_CANJE } from '../utils/constants.js'
import { CONTENIDO_INICIAL } from '../utils/contenidoInicial.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            compras: [],
            perfil: null,
            cargando: true,
            direccion: CONTENIDO_INICIAL.ubicacion,
            rangos: RANGOS_ASTRONAUTA,
            millasPorCanje: MILLAS_POR_CANJE,
            solesPorCanje: SOLES_POR_CANJE
        }
    },

    computed: {
        millas() {
            return resumenMillas(this.compras)
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
            this.compras = compras.sort((a, b) => milisegundos(b.fecha) - milisegundos(a.fecha))
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
        fechaLegible,

        // Serie y correlativo del comprobante: se deriva del id único del
        // documento en Firestore para que cada boleta tenga un identificador
        // estable e irrepetible (no reemplaza un correlativo SUNAT real).
        serieCompra(compra) {
            return 'B001-' + (compra.id || '').slice(-8).toUpperCase().padStart(8, '0')
        },

        // Las compras nuevas ya traen la cantidad de cada línea; las antiguas
        // guardaban una línea por unidad. Ambas se agrupan igual en la boleta.
        detalle(compra) {
            const grupos = new Map()
            ;(compra.items || []).forEach(item => {
                const clave = item.nombre + '|' + item.precio
                const grupo = grupos.get(clave) || { nombre: item.nombre, precio: Number(item.precio || 0), cantidad: 0 }
                grupo.cantidad += Number(item.cantidad) || 1
                grupos.set(clave, grupo)
            })
            return [...grupos.values()]
        }
    },

    template: `
        <div>
            <Header />

            <main id="contenido">
                <div class="text-center text-white p-3 p-md-5">
                    <h1>MIS COMPRAS EN <br> <em class="celeste">STAR </em><em>PARK</em></h1><br>
                    <p class="etiqueta">Tus boletas de venta registradas</p>
                </div>

                <!-- Millas espaciales y rango de astronauta. -->
                <section v-if="!cargando" class="glass p-4 mb-4" aria-labelledby="tituloMillas">
                    <div class="d-flex flex-wrap align-items-center gap-3 justify-content-between">
                        <div class="d-flex align-items-center gap-3">
                            <span class="display-5" aria-hidden="true">{{ millas.rango.icono }}</span>
                            <div>
                                <p class="etiquetaGris mb-0">TU RANGO DE ASTRONAUTA</p>
                                <h2 class="h4 text-white mb-0" id="tituloMillas">{{ millas.rango.nombre }}</h2>
                            </div>
                        </div>
                        <div class="text-end">
                            <p class="display-6 fw-bold amarillo mb-0">{{ millas.disponibles }}</p>
                            <p class="etiquetaGris mb-0">MILLAS DISPONIBLES · {{ millas.ganadas }} GANADAS EN TOTAL</p>
                        </div>
                    </div>
                    <div class="progress my-3" style="height: 10px; background: var(--tarjeta)" role="progressbar" :aria-valuenow="millas.avance" aria-valuemin="0" aria-valuemax="100" aria-label="Avance al siguiente rango">
                        <div class="progress-bar" :style="{ width: millas.avance + '%', background: 'var(--celeste)' }"></div>
                    </div>
                    <p class="mb-3">
                        <template v-if="millas.siguiente">Te faltan <strong class="celeste">{{ millas.siguiente.desde - millas.ganadas }} millas</strong> para ser {{ millas.siguiente.icono }} {{ millas.siguiente.nombre }}.</template>
                        <template v-else>¡Alcanzaste el rango más alto del universo! 🌌</template>
                        Ganas 1 milla por cada S/ 1 pagado y cada {{ millasPorCanje }} millas valen {{ formatearPrecio(solesPorCanje) }} al pagar una reserva.
                    </p>
                    <div class="d-flex flex-wrap gap-2" aria-label="Insignias">
                        <span v-for="rango in rangos" :key="rango.nombre" class="etiqueta"
                            :style="millas.ganadas >= rango.desde ? null : { opacity: 0.35 }"
                            :title="millas.ganadas >= rango.desde ? 'Insignia obtenida' : 'Desde ' + rango.desde + ' millas'">
                            {{ rango.icono }} {{ rango.nombre }}
                        </span>
                    </div>
                </section>

                <div id="listaCompras">
                    <div v-if="cargando" class="placeholder-glow" role="status">
                        <span class="visually-hidden">Cargando tus boletas...</span>
                        <span v-for="n in 2" :key="n" class="placeholder col-12 rounded mb-4" style="height: 320px" aria-hidden="true"></span>
                    </div>
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
                            <div v-if="compra.tarjeta">
                                <dt>Pago</dt>
                                <dd>{{ compra.tarjeta.marca }} •••• {{ compra.tarjeta.ultimos4 }} · Aut. {{ compra.codigoAutorizacion }}</dd>
                            </div>
                            <div v-if="compra.fechaVisita">
                                <dt>Fecha de visita</dt>
                                <dd>{{ compra.fechaVisita }}</dd>
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
                            <!-- Descuentos: cupón y millas canjeadas. -->
                            <div v-if="compra.descuentoCupon" class="boletaFila" role="row">
                                <span role="cell" class="boletaDescripcion celeste">Descuento cupón {{ compra.cupon }}</span>
                                <span role="cell"></span><span role="cell"></span>
                                <span role="cell" class="numero boletaImporte celeste">− {{ formatearPrecio(compra.descuentoCupon) }}</span>
                            </div>
                            <div v-if="compra.descuentoMillas" class="boletaFila" role="row">
                                <span role="cell" class="boletaDescripcion celeste">Canje de {{ compra.millasUsadas }} millas espaciales</span>
                                <span role="cell"></span><span role="cell"></span>
                                <span role="cell" class="numero boletaImporte celeste">− {{ formatearPrecio(compra.descuentoMillas) }}</span>
                            </div>
                        </div>

                        <div class="boletaTotal">
                            <span>Importe total</span>
                            <strong>{{ formatearPrecio(compra.total) }}</strong>
                        </div>

                        <footer class="boletaPie">
                            <span class="boletaEstado">✓ Pagado</span>
                            <p>¡Gracias por tu preferencia, astronauta!<template v-if="compra.millasGanadas"> Ganaste {{ compra.millasGanadas }} millas 🚀</template></p>
                        </footer>
                    </article>
                </div>
            </main>

            <Footer />
        </div>
    `

}
