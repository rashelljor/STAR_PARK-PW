// Footer.js - Pie de página compartido por todas las vistas de usuario.
// Los datos de contacto viven en Inicio (Contacto galáctico); aquí solo queda
// el botón flotante de WhatsApp, con el número de "Contenido institucional".

import { db } from '../config/firebaseConfig.js'
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { CONTENIDO_INICIAL } from '../utils/contenidoInicial.js'

// Número peruano de 9 dígitos → formato internacional para wa.me (51 + número).
export function enlaceWhatsapp(numero, mensaje = 'Hola Star Park, quisiera más información.') {
    const digitos = String(numero || '').replace(/\D/g, '')
    if (digitos.length < 9) return ''
    const internacional = digitos.length === 9 ? '51' + digitos : digitos
    return 'https://wa.me/' + internacional + '?text=' + encodeURIComponent(mensaje)
}

export default {

    data() {
        return { contenido: { ...CONTENIDO_INICIAL } }
    },

    computed: {
        whatsapp() {
            return enlaceWhatsapp(this.contenido.whatsapp || this.contenido.contacto)
        }
    },

    async mounted() {
        const guardado = await getDoc(doc(db, 'contenido', 'institucional')).catch(() => null)
        if (guardado?.exists()) this.contenido = { ...CONTENIDO_INICIAL, ...guardado.data() }
    },

    template: `
        <footer class="bg-dark text-light">
            <div class="container d-flex justify-content-between align-items-center py-4 flex-column flex-lg-row gap-3">
                <div>
                    <p class="fw-bold mb-1">STAR PARK</p>
                    <p class="mb-0">©2026 FAMILY PARK S.A.C.</p>
                </div>
                <div class="d-flex flex-wrap justify-content-center gap-3">
                    <p class="mb-0">Protocolo de Seguridad y Privacidad</p>
                    <p class="mb-0">Términos de Uso</p>
                </div>
            </div>

            <!-- Botón flotante de WhatsApp (verde del sitio). -->
            <a v-if="whatsapp" :href="whatsapp" target="_blank" rel="noopener"
                class="btn rounded-circle position-fixed bottom-0 end-0 m-3 d-flex align-items-center justify-content-center shadow"
                style="width: 58px; height: 58px; background: var(--verde); color: #11131b; z-index: 1040"
                aria-label="Escríbenos por WhatsApp" title="Escríbenos por WhatsApp">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.28l5.68-1.49a11.3 11.3 0 0 0 5.77 1.47h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02z"/></svg>
            </a>
        </footer>
    `

}
