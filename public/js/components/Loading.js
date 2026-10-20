// Loading.js - Estado de carga reutilizable: tarjetas "esqueleto" con la misma
// forma de las tarjetas reales (placeholders de Bootstrap), así la página no salta
// al llegar los datos. El mensaje queda disponible para lectores de pantalla.

export default {

    props: {
        message: {
            type: String,
            default: 'Cargando...'
        },
        // Cantidad de tarjetas esqueleto.
        cards: {
            type: Number,
            default: 3
        }
    },

    template: `
        <div class="grilla3col placeholder-glow" role="status" aria-live="polite">
            <span class="visually-hidden">{{ message }}</span>
            <div v-for="n in cards" :key="n" class="tarjetaAtraccion glass" aria-hidden="true">
                <span class="placeholder w-100" style="height: 200px"></span>
                <div class="tarjetaCuerpo">
                    <span class="placeholder col-8 rounded"></span>
                    <span class="placeholder col-12 rounded"></span>
                    <span class="placeholder col-4 rounded"></span>
                    <span class="placeholder col-12 rounded mt-2" style="height: 40px"></span>
                </div>
            </div>
        </div>
    `

}
