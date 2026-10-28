// VerMas.js - Muestra una lista por tandas (6 elementos, 3 en celular) con los
// botones "Ver más" / "Ver menos" debajo. La vista dibuja solo los visibles:
//   <VerMas :items="reservas" v-slot="{ visibles }"> ... v-for="reserva in visibles" ... </VerMas>
// Con "por-paginas" (lo usa la tienda) muestra una página a la vez con un
// paginador debajo: "Estás en la página [1] 2 3 4 5 … 15".

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
        },
        // Páginas en lugar de tandas que se acumulan (lo usa la tienda).
        porPaginas: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return { paso: pasoLista(), limite: pasoLista(), pagina: 1 }
    },

    computed: {
        totalPaginas() {
            return Math.max(1, Math.ceil(this.items.length / this.paso))
        },

        mostrados() {
            if (this.porPaginas) return this.visibles.length
            return Math.min(this.limite, this.items.length)
        },

        visibles() {
            if (this.porPaginas) return this.items.slice((this.pagina - 1) * this.paso, this.pagina * this.paso)
            return this.items.slice(0, this.limite)
        },

        // Números del paginador: los extremos, la página actual y sus vecinas;
        // el resto se resume con "…". Ej.: 1 2 3 4 5 … 15 · 1 … 6 7 8 … 15.
        botonesPagina() {
            const total = this.totalPaginas
            const actual = this.pagina
            if (total <= 7) return Array.from({ length: total }, (_, indice) => indice + 1)
            if (actual <= 4) return [1, 2, 3, 4, 5, '…', total]
            if (actual >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
            return [1, '…', actual - 1, actual, actual + 1, '…', total]
        }
    },

    watch: {
        reiniciarCon() {
            this.limite = this.paso
            this.pagina = 1
        },

        items: {
            immediate: true,
            handler() {
                // Si la lista se acorta, no se queda en una página que ya no existe.
                this.pagina = Math.min(this.pagina, this.totalPaginas)
                this.mostrarAncla()
            }
        }
    },

    mounted() {
        this.alCambiarPantalla = () => {
            this.paso = pasoLista()
            this.limite = this.paso
            this.pagina = 1
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
            if (indice < 0) return
            if (this.porPaginas) this.pagina = Math.floor(indice / this.paso) + 1
            else if (indice >= this.limite) this.limite = Math.ceil((indice + 1) / this.paso) * this.paso
        },

        verMas() {
            this.limite += this.paso
        },

        // La lista se acorta: se sigue viendo la barra de botones.
        async verMenos() {
            this.limite = Math.max(this.paso, this.limite - this.paso)
            await this.$nextTick()
            this.$refs.barra?.scrollIntoView({ block: 'nearest' })
        },

        // Cambia de página y sube al inicio de la lista (84px = alto del menú fijo).
        async irAPagina(numero) {
            if (numero < 1 || numero > this.totalPaginas || numero === this.pagina) return
            this.pagina = numero
            await this.$nextTick()
            const lista = this.$refs.paginador?.previousElementSibling
            if (lista) window.scrollTo({ top: lista.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' })
        }
    },

    template: `
        <slot :visibles="visibles"></slot>
        <nav v-if="porPaginas && items.length > paso" ref="paginador" class="d-flex flex-column align-items-center gap-2 mt-3" aria-label="Páginas de la lista">
            <small class="etiquetaGris">Mostrando {{ mostrados }} de {{ items.length }}</small>
            <div class="d-flex flex-wrap justify-content-center align-items-center gap-1">
                <span class="etiquetaGris small me-1">Estás en la página</span>
                <button type="button" class="btn btn-sm border-0" style="color: var(--gris)" :disabled="pagina === 1" aria-label="Página anterior" title="Página anterior" @click="irAPagina(pagina - 1)">‹</button>
                <template v-for="(numero, indice) in botonesPagina" :key="numero + '-' + indice">
                    <span v-if="numero === '…'" class="etiquetaGris px-1" aria-hidden="true">…</span>
                    <button
                        v-else
                        type="button"
                        class="btn btn-sm rounded-pill"
                        :class="numero === pagina ? 'botonAmarillo' : 'botonCelesteBorde'"
                        style="min-width: 36px"
                        :aria-current="numero === pagina ? 'page' : null"
                        :aria-label="'Página ' + numero"
                        @click="irAPagina(numero)"
                    >{{ numero }}</button>
                </template>
                <button type="button" class="btn btn-sm border-0" style="color: var(--gris)" :disabled="pagina === totalPaginas" aria-label="Página siguiente" title="Página siguiente" @click="irAPagina(pagina + 1)">›</button>
            </div>
        </nav>
        <div v-else-if="items.length > paso" ref="barra" class="d-flex flex-wrap justify-content-center align-items-center gap-2 mt-3">
            <small class="etiquetaGris">Mostrando {{ mostrados }} de {{ items.length }}</small>
            <button v-if="mostrados < items.length" type="button" class="btn botonCelesteBorde" @click="verMas">Ver más</button>
            <button v-if="limite > paso" type="button" class="btn botonCelesteBorde" @click="verMenos">Ver menos</button>
        </div>
    `

}
