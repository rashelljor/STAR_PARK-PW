// ResenasAside.js - Panel lateral (offcanvas de Bootstrap) con las reseñas de un
// producto de la tienda: promedio, distribución de estrellas, formulario para
// calificar de 1 a 5 y lista de comentarios. En celular ocupa todo el ancho.

import { guardarResena, eliminarResena, promedioEstrellas } from '../services/reviewService.js'
import { notificar, confirmar } from '../utils/notificaciones.js'
import { fechaLegible } from '../utils/formatters.js'
import VerMas from './VerMas.js'

export function estrellasTexto(valor) {
    const llenas = Math.round(valor)
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas)
}

export default {

    components: { VerMas },

    props: {
        producto: { type: Object, default: null },
        resenas: { type: Array, default: () => [] },
        // { uid, nombre } del cliente con sesión, o null.
        usuario: { type: Object, default: null }
    },

    emits: ['cambio'],

    data() {
        return { estrellas: 0, comentario: '', enviando: false }
    },

    computed: {
        promedio() {
            return promedioEstrellas(this.resenas)
        },

        miResena() {
            return this.usuario ? this.resenas.find(resena => resena.uid === this.usuario.uid) : null
        },

        // Cantidad de reseñas por estrella, de 5 a 1.
        distribucion() {
            return [5, 4, 3, 2, 1].map(valor => {
                const cantidad = this.resenas.filter(resena => Number(resena.estrellas) === valor).length
                return { valor, cantidad, porcentaje: this.resenas.length ? Math.round(cantidad * 100 / this.resenas.length) : 0 }
            })
        }
    },

    watch: {
        // Al abrir otro producto, el formulario muestra la reseña propia (si existe) para editarla.
        producto() {
            this.estrellas = this.miResena?.estrellas || 0
            this.comentario = this.miResena?.comentario || ''
        }
    },

    methods: {
        estrellasTexto,
        fechaLegible,

        abrir() {
            window.bootstrap.Offcanvas.getOrCreateInstance(this.$refs.panel).show()
        },

        async publicar() {
            if (!this.estrellas) {
                notificar('Elige de 1 a 5 estrellas para calificar.', 'advertencia')
                return
            }
            this.enviando = true
            try {
                await guardarResena(this.producto.id, { estrellas: this.estrellas, comentario: this.comentario, nombre: this.usuario.nombre })
                this.$emit('cambio')
                notificar(this.miResena ? 'Actualizamos tu reseña.' : '¡Gracias por tu reseña!', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo publicar tu reseña. Intenta nuevamente.', 'error')
            } finally {
                this.enviando = false
            }
        },

        async borrar(resena) {
            if (!await confirmar('¿Eliminar tu reseña?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return
            try {
                await eliminarResena(resena.id)
                this.estrellas = 0
                this.comentario = ''
                this.$emit('cambio')
                notificar('Reseña eliminada.', 'exito')
            } catch (error) {
                console.error(error)
                notificar('No se pudo eliminar la reseña. Intenta nuevamente.', 'error')
            }
        }
    },

    template: `
        <aside ref="panel" class="offcanvas offcanvas-end glass text-white" tabindex="-1" id="panelResenas" aria-labelledby="tituloResenas">
            <div class="offcanvas-header border-bottom" style="border-color: var(--borde) !important">
                <div>
                    <p class="etiquetaGris mb-1">Reseñas de</p>
                    <h2 class="offcanvas-title h5 text-white" id="tituloResenas">{{ producto?.nombre }}</h2>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Cerrar reseñas"></button>
            </div>

            <div v-if="producto" class="offcanvas-body d-flex flex-column gap-3">
                <!-- Resumen: promedio y distribución. -->
                <div class="d-flex align-items-center gap-3">
                    <p class="display-6 fw-bold text-white mb-0">{{ promedio ? promedio.toFixed(1) : '–' }}</p>
                    <div>
                        <p class="amarillo mb-0 fs-5" :aria-label="'Promedio ' + promedio.toFixed(1) + ' de 5 estrellas'">{{ estrellasTexto(promedio) }}</p>
                        <small class="etiquetaGris">{{ resenas.length }} {{ resenas.length === 1 ? 'reseña' : 'reseñas' }}</small>
                    </div>
                </div>
                <div>
                    <div v-for="fila in distribucion" :key="fila.valor" class="d-flex align-items-center gap-2 mb-1">
                        <small class="text-nowrap" style="width: 2.5rem">{{ fila.valor }} ★</small>
                        <div class="progress flex-grow-1" style="height: 8px; background: var(--tarjeta)" role="progressbar" :aria-label="fila.valor + ' estrellas'" :aria-valuenow="fila.porcentaje" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar" :style="{ width: fila.porcentaje + '%', background: 'var(--amarillo)' }"></div>
                        </div>
                        <small class="etiquetaGris text-end" style="width: 1.5rem">{{ fila.cantidad }}</small>
                    </div>
                </div>

                <!-- Formulario: calificar o editar la reseña propia. -->
                <form v-if="usuario" class="glass p-3" @submit.prevent="publicar">
                    <p class="fw-bold text-white mb-2">{{ miResena ? 'Edita tu reseña' : (producto.id === 'pagina' ? 'Califica nuestra página' : 'Califica este producto') }}</p>
                    <div class="d-flex gap-1 mb-2" role="radiogroup" aria-label="Calificación">
                        <button v-for="valor in 5" :key="valor" type="button" class="btn p-0 fs-3 lh-1 border-0"
                            :style="{ color: valor <= estrellas ? 'var(--amarillo-texto, var(--amarillo))' : 'var(--borde)' }"
                            role="radio" :aria-checked="valor === estrellas" :aria-label="valor + (valor === 1 ? ' estrella' : ' estrellas')"
                            @click="estrellas = valor">★</button>
                    </div>
                    <label class="visually-hidden" for="comentarioResena">Comentario</label>
                    <textarea v-model="comentario" id="comentarioResena" class="form-control mb-2" rows="3" maxlength="500" placeholder="Cuéntanos tu experiencia (opcional)"></textarea>
                    <button type="submit" class="btn botonAmarillo w-100" :disabled="enviando">{{ enviando ? 'Publicando...' : (miResena ? 'Actualizar reseña' : 'Publicar reseña') }}</button>
                </form>
                <a v-else class="btn botonCelesteBorde" href="login.html">Inicia sesión para dejar tu reseña</a>

                <!-- Comentarios. -->
                <p v-if="!resenas.length" class="etiquetaGris">Aún no hay reseñas. ¡Sé el primero en opinar!</p>
                <VerMas :items="resenas" :reiniciar-con="producto" v-slot="{ visibles }">
                <article v-for="resena in visibles" :key="resena.id" class="border-bottom pb-3" style="border-color: var(--borde) !important">
                    <div class="d-flex justify-content-between align-items-start gap-2">
                        <div>
                            <p class="fw-bold text-white mb-0">{{ resena.nombre || 'Astronauta' }}</p>
                            <small class="amarillo" :aria-label="resena.estrellas + ' de 5 estrellas'">{{ estrellasTexto(resena.estrellas) }}</small>
                            <small class="etiquetaGris ms-2">{{ fechaLegible(resena.fecha) }}</small>
                        </div>
                        <button v-if="usuario && resena.uid === usuario.uid" type="button" class="btn btn-sm p-0 border-0" style="color: var(--rojo-texto, var(--rojo))" @click="borrar(resena)">Eliminar</button>
                    </div>
                    <p v-if="resena.comentario" class="mb-0 mt-1">{{ resena.comentario }}</p>
                </article>
                </VerMas>
            </div>
        </aside>
    `

}
