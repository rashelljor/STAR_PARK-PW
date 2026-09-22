// Loading.js - Mensaje de carga reutilizable (usa la etiqueta gris ya existente,
// no agrega ninguna clase CSS nueva).

export default {

    props: {
        message: {
            type: String,
            default: 'Cargando...'
        }
    },

    template: `<p class="etiquetaGris text-center p-4">{{ message }}</p>`

}
