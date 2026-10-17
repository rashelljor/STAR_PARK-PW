// ProductGrid.js - Dibuja una grilla de productos

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
        },
        // Da a cada tarjeta el id "producto-<id>" para enlazarla desde el panel
        // admin ("Ver en tienda"). Solo en las grillas principales, no en los
        // resultados de búsqueda, para no repetir ids en la página.
        conAnclas: {
            type: Boolean,
            default: false
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
                :id="conAnclas ? 'producto-' + producto.id : null"
                :class="[claseTarjeta(producto), 'glass']"
            >
                <div class="tarjetaImgCaja">
                    <img :src="imagenDe(producto)" :alt="producto.alt || producto.nombre">
                </div>
                <div class="tarjetaCuerpo">
                    <h3>{{ producto.nombre }}</h3>
                    <p>{{ producto.descripcion }}</p>
                    <p>S/ {{ Number(producto.precio).toFixed(2) }}</p>
                    <button type="button" class="btn" @click="$emit('add-to-cart', producto)">
                        + Añadir al carrito
                    </button>
                </div>
            </div>
        </div>
    `

}
