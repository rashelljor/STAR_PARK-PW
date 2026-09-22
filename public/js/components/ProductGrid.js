// ProductGrid.js - Dibuja una grilla de productos usando las mismas clases
// visuales que ya existían en tienda.html ('tarjetaAtraccion' para
// promociones, 'tarjetaServicio' para el catálogo/botín), sin tocar el CSS.

import { getImagenPorDefecto } from '../services/catalogService.js'

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
        }
    },

    emits: ['add-to-cart'],

    methods: {
        claseTarjeta(producto) {
            if (this.cardClass) return this.cardClass
            return producto.categoria === 'promociones' ? 'tarjetaAtraccion' : 'tarjetaServicio'
        },

        imagenDe(producto) {
            return producto.imagen || getImagenPorDefecto()
        }
    },

    template: `
        <div class="grilla3col">
            <div
                v-for="producto in products"
                :key="producto.id"
                :class="[claseTarjeta(producto), 'glass']"
            >
                <div class="tarjetaImgCaja">
                    <img :src="imagenDe(producto)" :alt="producto.alt || producto.nombre">
                </div>
                <div class="tarjetaCuerpo">
                    <h3>{{ producto.nombre }}</h3>
                    <p>{{ producto.descripcion }}</p>
                    <p>S/ {{ Number(producto.precio).toFixed(2) }}</p>
                    <button type="button" @click="$emit('add-to-cart', producto)">
                        + Añadir al carrito
                    </button>
                </div>
            </div>
        </div>
    `

}
