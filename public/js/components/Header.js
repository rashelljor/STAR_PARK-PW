// Header.js - Menú de navegación compartido por todas las vistas de usuario.
// Escritorio (≥ 992px): barra completa con submenús al pasar el mouse.
// Tablet y celular: menú hamburguesa con botones grandes que se cierra al elegir una opción.

import { auth, obtenerPerfil, cerrarSesion } from '../services/authService.js'
import { obtenerCarrito, contarUnidades, EVENTO_CARRITO } from '../services/cartService.js'
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import { notificar, confirmar, notificarAlCargar } from '../utils/notificaciones.js'
import { temaActual, alternarTema } from '../utils/tema.js'

// Secciones del inicio que se marcan en el menú según la que se está viendo.
const SECCIONES_INICIO = ['atracciones', 'servicios', 'base-operaciones']

export default {

    data() {
        return {
            nombre: '',
            esAdmin: false,
            cantidadCarrito: 0,
            rebote: false,
            pagina: document.body.dataset.page,
            seccionActiva: '',
            tema: temaActual()
        }
    },

    mounted() {
        this.detenerEscucha = onAuthStateChanged(auth, async usuario => {
            if (!usuario) {
                this.nombre = ''
                this.esAdmin = false
                this.cantidadCarrito = 0
                return
            }
            const perfil = await obtenerPerfil(usuario.uid).catch(() => null)
            this.nombre = perfil?.nombreCompleto?.trim().split(' ')[0] || 'Astronauta'
            this.esAdmin = perfil?.rol === 'admin'
            this.cantidadCarrito = contarUnidades(await obtenerCarrito().catch(() => []))
        })

        this.alCambiarCarrito = evento => {
            this.cantidadCarrito = evento.detail.cantidad
            if (!evento.detail.agregado) return
            // Reinicia la animación aunque se agreguen varios productos seguidos.
            this.rebote = false
            requestAnimationFrame(() => { this.rebote = true })
        }
        window.addEventListener(EVENTO_CARRITO, this.alCambiarCarrito)

        if (this.pagina === 'inicio') this.observarSecciones()
    },

    unmounted() {
        this.detenerEscucha?.()
        this.observador?.disconnect()
        window.removeEventListener(EVENTO_CARRITO, this.alCambiarCarrito)
    },

    methods: {
        // Marca en el menú la sección del inicio que ocupa el centro de la pantalla.
        observarSecciones() {
            this.observador = new IntersectionObserver(entradas => {
                entradas.forEach(entrada => {
                    if (entrada.isIntersecting) this.seccionActiva = entrada.target.id
                    else if (this.seccionActiva === entrada.target.id) this.seccionActiva = ''
                })
            }, { rootMargin: '-45% 0px -45% 0px' })

            SECCIONES_INICIO.forEach(id => {
                const seccion = document.getElementById(id)
                if (seccion) this.observador.observe(seccion)
            })
        },

        // Cierra el menú hamburguesa al elegir una opción. Hace falta sobre todo
        // en enlaces a secciones de la misma página, que no recargan nada.
        cerrarMenu() {
            const menu = this.$refs.menu
            if (menu?.classList.contains('show')) window.bootstrap?.Collapse.getOrCreateInstance(menu, { toggle: false }).hide()
        },

        claseEnlace(pagina, seccion = '') {
            const activo = seccion ? this.seccionActiva === seccion : this.pagina === pagina && !(pagina === 'inicio' && this.seccionActiva)
            return activo ? 'active' : ''
        },

        cambiarTema() {
            this.tema = alternarTema()
        },

        async salir() {
            this.cerrarMenu()
            if (!await confirmar('¿Quieres cerrar tu sesión?', { textoConfirmar: 'Cerrar sesión' })) return

            try {
                await cerrarSesion()
                notificarAlCargar('Cerraste sesión. ¡Vuelve pronto, astronauta!', 'exito')
                window.location.href = 'index.html'
            } catch (error) {
                console.error(error)
                notificar('No se pudo cerrar la sesión. Intenta nuevamente.', 'error')
            }
        }
    },

    template: `
        <header class="sticky-top">
            <!-- Accesibilidad: con teclado, el primer Tab permite saltar el menú. -->
            <a class="visually-hidden-focusable btn botonAmarillo position-absolute m-2" style="z-index: 1100" href="#contenido">Saltar al contenido</a>
            <nav class="navbar navbar-expand-lg navbar-dark barraSitio" aria-label="Menú principal">
                <div class="container-fluid gap-2 px-3 px-lg-4">
                    <a class="navbar-brand me-0" href="index.html">
                        <img src="../../assets/img/logostar.png" alt="Star Park, ir al inicio">
                    </a>

                    <!-- En celular el carrito queda siempre a la vista, junto al botón del menú. -->
                    <div class="d-flex align-items-center gap-2 d-lg-none">
                        <a class="btn botonAmarillo botonCarrito d-inline-flex align-items-center px-3" href="carrito.html" :aria-label="'Ver mi carrito, ' + cantidadCarrito + ' productos'">
                            <img src="../../assets/img/iconcarrito.png" alt="" class="icono-boton">
                            <span v-if="cantidadCarrito" class="contadorCarrito" :class="{ rebote }">{{ cantidadCarrito }}</span>
                        </a>
                        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuSitio" aria-controls="menuSitio" aria-expanded="false" aria-label="Abrir menú">
                            <span class="navbar-toggler-icon"></span>
                        </button>
                    </div>

                    <div class="collapse navbar-collapse" id="menuSitio" ref="menu" @click="$event.target.closest('a') && cerrarMenu()">
                        <ul class="navbar-nav mx-lg-auto gap-lg-2">
                            <li class="nav-item dropdown">
                                <div class="d-flex align-items-center">
                                    <a class="nav-link" :class="claseEnlace('inicio')" :aria-current="pagina === 'inicio' ? 'page' : null" href="index.html">Inicio</a>
                                    <button class="btn btn-link dropdown-toggle text-light p-0 ms-1" type="button"
                                        data-bs-toggle="dropdown" aria-expanded="false" aria-label="Mostrar secciones de Inicio"></button>
                                </div>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" :class="claseEnlace('', 'atracciones')" href="index.html#atracciones">Atracciones</a></li>
                                    <li><a class="dropdown-item" :class="claseEnlace('', 'servicios')" href="index.html#servicios">Servicios</a></li>
                                    <li><a class="dropdown-item" :class="claseEnlace('', 'base-operaciones')" href="index.html#base-operaciones">Ubicación y Horarios</a></li>
                                </ul>
                            </li>
                            <li class="nav-item dropdown">
                                <div class="d-flex align-items-center">
                                    <a class="nav-link" :class="claseEnlace('tienda')" :aria-current="pagina === 'tienda' ? 'page' : null" href="tienda.html">Tienda</a>
                                    <button type="button" class="btn btn-link dropdown-toggle text-light p-0 ms-1"
                                        data-bs-toggle="dropdown" aria-expanded="false" aria-label="Mostrar secciones de Tienda"></button>
                                </div>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="tienda.html#promociones">Promociones</a></li>
                                    <li><a class="dropdown-item" href="tienda.html#botin">Catálogo</a></li>
                                    <li><a class="dropdown-item" href="tienda.html#bazar">Bazar</a></li>
                                </ul>
                            </li>
                            <!-- Cumpleaños no va en el menú: se llega desde el aside de la tienda y el inicio. -->
                            <li class="nav-item">
                                <a class="nav-link" :class="claseEnlace('reservas')" :aria-current="pagina === 'reservas' ? 'page' : null" href="reservas.html">Mis Reservas</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" :class="claseEnlace('miscompras')" :aria-current="pagina === 'miscompras' ? 'page' : null" href="miscompras.html">Mis Compras</a>
                            </li>
                            <!-- Acceso directo al panel, solo para cuentas con rol de administrador. -->
                            <li v-if="esAdmin" class="nav-item">
                                <a class="nav-link celeste" href="../admin/control.html">⚙️ Panel admin</a>
                            </li>
                        </ul>

                        <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-2 gap-lg-3 accionesUsuario">
                            <button type="button" class="btn btn-outline-light rounded-pill" @click="cambiarTema"
                                :aria-label="tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'" :aria-pressed="tema === 'light'">
                                {{ tema === 'light' ? '🌙' : '☀️' }}<span class="d-lg-none ms-2">{{ tema === 'light' ? 'Modo oscuro' : 'Modo claro' }}</span>
                            </button>
                            <a class="btn botonAmarillo botonCarrito d-none d-lg-inline-flex align-items-center gap-2" href="carrito.html">
                                <img src="../../assets/img/iconcarrito.png" alt="" class="icono-boton">Ver mi carrito
                                <span v-if="cantidadCarrito" class="contadorCarrito" :class="{ rebote }" :aria-label="cantidadCarrito + ' productos'">{{ cantidadCarrito }}</span>
                            </a>

                            <!-- Con sesión: saludo + cerrar sesión. Sin sesión: enlace a login. -->
                            <template v-if="nombre">
                                <span class="saludoUsuario">Hola, {{ nombre }}</span>
                                <button type="button" class="btn btn-outline-light rounded-pill" @click="salir">Cerrar sesión</button>
                            </template>
                            <a v-else class="btn botonAmarillo" :class="{ active: pagina === 'login' }" href="login.html">👤 Iniciar sesión</a>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    `

}
