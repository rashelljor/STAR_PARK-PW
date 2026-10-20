// app.js - Punto de entrada único cargado por cada página de public/html/users.
// Lee <body data-page="..."> para saber qué vista montar dentro de <div id="app">.

import { createApp } from 'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.esm-browser.js'
// Se importa en todas las páginas para mostrar los mensajes que deja la página anterior
// (bienvenida, cierre de sesión...) y el aviso de conexión perdida.
import './utils/notificaciones.js'
// Aplica el modo claro si el visitante lo eligió antes (el oscuro es el original).
import './utils/tema.js'

const vistas = {
    inicio: () => import('./views/indexView.js'),
    tienda: () => import('./views/tiendaView.js'),
    carrito: () => import('./views/carritoView.js'),
    reservas: () => import('./views/reservasView.js'),
    miscompras: () => import('./views/comprasView.js'),
    pago: () => import('./views/pagoView.js'),
    eventos: () => import('./views/eventosView.js'),
    login: () => import('./views/loginView.js'),
    registro: () => import('./views/registroView.js'),
    perfil: () => import('./views/perfilView.js')
}

async function iniciar() {
    const contenedor = document.getElementById('app')
    const pagina = document.body.dataset.page
    const cargarVista = vistas[pagina]

    if (!contenedor) return

    if (!cargarVista) {
        console.error('Página desconocida: "' + pagina + '". Verifica el atributo data-page del <body>.')
        contenedor.textContent = 'No se pudo cargar esta página.'
        return
    }

    try {
        const { default: Vista } = await cargarVista()
        createApp(Vista).mount('#app')
    } catch (error) {
        console.error(error)
        contenedor.textContent = 'Ocurrió un error al cargar la página.'
    }
}

iniciar()
