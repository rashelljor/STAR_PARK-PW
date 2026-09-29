// Loading.js - Mensaje de carga reutilizable (usa la etiqueta gris ya existente en el CSS).

export default {

    props: {
        message: {
            type: String,
            default: 'Cargando...'
        }
    },

    template: `<p class="etiqueta glass text-center p-4">{{ message }}</p>`

}
