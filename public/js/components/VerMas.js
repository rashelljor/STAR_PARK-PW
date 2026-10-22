// VerMas.js - Muestra una lista por tandas (6 elementos, 3 en celular) con los
// botones "Ver más" / "Ver menos" debajo. La vista dibuja solo los visibles:
//   <VerMas :items="reservas" v-slot="{ visibles }"> ... v-for="reserva in visibles" ... </VerMas>

import { consultaCelular, pasoLista } from '../utils/paginacion.js'

export default {

    props: {
        items: {
            type: Array,
            required: true
        },
        // Al cambiar (texto buscado, filtro...) se vuelve a la primera tanda.
        reiniciarCon: {
            default: null
        },
        // Id del elemento en la página (ej. producto => 'producto-' + producto.id).
        // Si la URL apunta a uno que quedó oculto, se muestran tandas hasta llegar a él.
        idAncla: {
            type: Function,
            default: null
        }
    },

    data() {
        return { paso: pasoLista(), limite: pasoLista() }
    },

    computed: {
        mostrados() {
            return Math.min(this.limite, this.items.length)
        },

        visibles() {
            return this.items.slice(0, this.limite)
        }
    },

    watch: {
        reiniciarCon() {
            this.limite = this.paso
        },

        items: {
            immediate: true,
            handler() {
                this.mostrarAncla()
            }
        }
    },

    mounted() {
        this.alCambiarPantalla = () => {
            this.paso = pasoLista()
            this.limite = this.paso
        }
        consultaCelular.addEventListener('change', this.alCambiarPantalla)
    },

    unmounted() {
        consultaCelular.removeEventListener('change', this.alCambiarPantalla)
    },

    methods: {
        mostrarAncla() {
            const hash = decodeURIComponent(window.location.hash.slice(1))
            if (!this.idAncla || !hash) return
            const indice = this.items.findIndex(item => this.idAncla(item) === hash)
            if (indice >= this.limite) this.limite = Math.ceil((indice + 1) / this.paso) * this.paso
        },

        verMas() {
            this.limite += this.paso
        },

        // La lista se acorta: se sigue viendo la barra de botones.
        async verMenos() {
            this.limite = Math.max(this.paso, this.limite - this.paso)
            await this.$nextTick()
            this.$refs.barra?.scrollIntoView({ block: 'nearest' })
        }
    },

    template: `
        <slot :visibles="visibles"></slot>
        <div v-if="items.length > paso" ref="barra" class="d-flex flex-wrap justify-content-center align-items-center gap-2 mt-3">
            <small class="etiquetaGris">Mostrando {{ mostrados }} de {{ items.length }}</small>
            <button v-if="mostrados < items.length" type="button" class="btn botonCelesteBorde" @click="verMas">Ver más</button>
            <button v-if="limite > paso" type="button" class="btn botonCelesteBorde" @click="verMenos">Ver menos</button>
        </div>
    `

}
