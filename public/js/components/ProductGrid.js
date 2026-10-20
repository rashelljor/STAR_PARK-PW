// ProductGrid.js - Dibuja una grilla de productos

import { getImagenPorDefecto, coloresDe } from '../services/catalogService.js'
import { promedioEstrellas } from '../services/reviewService.js'
import { estrellasTexto } from './ResenasAside.js'

export default {

    props: {
        products: {
            type: Array,
            required: true
        },
        // Si no se indica, cada tarjeta usa la clase según producto.categoria
        // (útil para grillas con productos mezclados, como los resultados de búsqueda).
        cardClass: {
            type: String,
            default: ''
        },
        // Da a cada tarjeta el id "producto-<id>" para enlazarla desde el panel
        // admin ("Ver en tienda"). Solo en las grillas principales, no en los
        // resultados de búsqueda, para no repetir ids en la página.
        conAnclas: {
            type: Boolean,
            default: false
        },
        // Reseñas agrupadas por id de producto (ver reviewService.js).
        resenas: {
            type: Object,
            default: () => ({})
        }
    },

    // add-to-cart envía (producto, color); el color solo existe en el bazar.
    emits: ['add-to-cart', 'ver-resenas'],

    data() {
        // Color elegido por producto: { idProducto: '#rrggbb' }.
        return { colorElegido: {} }
    },

    methods: {
        coloresDe,

        // Si el cliente no eligió, va el primer color disponible.
        colorDe(producto) {
            return this.colorElegido[producto.id] || coloresDe(producto)[0] || ''
        },

        claseTarjeta(producto) {
            if (this.cardClass) return this.cardClass
            return producto.categoria === 'promociones' ? 'tarjetaAtraccion' : 'tarjetaServicio'
        },

        imagenDe(producto) {
            return producto.imagen || getImagenPorDefecto()
        },

        // Promociones y catálogo son servicios (entradas); el bazar vende productos físicos.
        esProducto(producto) {
            return producto.categoria === 'bazar'
        },

        agotado(producto) {
            return this.esProducto(producto) && Number(producto.stock) <= 0
        },

        resenasDe(producto) {
            return this.resenas[producto.id] || []
        },

        promedioDe(producto) {
            return promedioEstrellas(this.resenasDe(producto))
        },

        estrellasTexto
    },

    template: `
        <div class="grilla3col">
            <div
                v-for="producto in products"
                :key="producto.id"
                :id="conAnclas ? 'producto-' + producto.id : null"
                :class="[claseTarjeta(producto), 'glass']"
            >
                <div class="tarjetaImgCaja">
                    <img :src="imagenDe(producto)" :alt="producto.alt || producto.nombre">
                    <span class="badge">{{ esProducto(producto) ? 'Producto' : 'Servicio' }}</span>
                </div>
                <div class="tarjetaCuerpo">
                    <h3>{{ producto.nombre }}</h3>
                    <p>{{ producto.descripcion }}</p>
                    <p>S/ {{ Number(producto.precio).toFixed(2) }}</p>
                    <!-- Solo los productos del bazar tienen stock y colores. -->
                    <template v-if="esProducto(producto)">
                        <p class="mb-0 small">Stock: {{ agotado(producto) ? 'Agotado' : producto.stock + ' unidades' }}</p>
                        <div v-if="coloresDe(producto).length" class="d-flex flex-wrap align-items-center gap-2 small" role="radiogroup" :aria-label="'Color de ' + producto.nombre">
                            Color:
                            <button
                                v-for="color in coloresDe(producto)"
                                :key="color"
                                type="button"
                                class="rounded-circle p-0"
                                :style="{ width: '22px', height: '22px', background: color, border: colorDe(producto) === color ? '3px solid var(--amarillo)' : '1px solid var(--borde)' }"
                                role="radio"
                                :aria-checked="colorDe(producto) === color"
                                :aria-label="'Color ' + color"
                                :title="color"
                                @click="colorElegido[producto.id] = color"
                            ></button>
                        </div>
                    </template>
                    <!-- Calificación promedio y acceso al panel de comentarios. -->
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-auto">
                        <span class="amarillo" :aria-label="resenasDe(producto).length ? 'Calificación ' + promedioDe(producto).toFixed(1) + ' de 5' : 'Sin calificaciones'">
                            {{ estrellasTexto(promedioDe(producto)) }}
                            <small class="etiquetaGris">{{ resenasDe(producto).length ? promedioDe(producto).toFixed(1) + ' (' + resenasDe(producto).length + ')' : 'Sin reseñas' }}</small>
                        </span>
                        <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill py-0 px-2" style="--bs-btn-color: var(--gris); --bs-btn-font-size: 12px" @click="$emit('ver-resenas', producto)" aria-controls="panelResenas">
                            Comentarios
                        </button>
                    </div>
                    <button type="button" class="btn" :disabled="agotado(producto)" @click="$emit('add-to-cart', producto, esProducto(producto) ? colorDe(producto) : '')">
                        {{ agotado(producto) ? 'Agotado' : '+ Añadir al carrito' }}
                    </button>
                </div>
            </div>
        </div>
    `

}
