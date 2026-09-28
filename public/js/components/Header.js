// Header.js - Menú de navegación compartido por todas las vistas de usuario.
// Idéntico al header que antes estaba repetido en cada página de public/html/users.
// Además, escucha la sesión: si hay un cliente logueado muestra su nombre y
// el botón para cerrar sesión; si no, muestra "Iniciar sesión".

import { auth, obtenerPerfil, cerrarSesion } from '../services/authService.js'
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'

export default {

    data() {
        return {
            nombre: ''
        }
    },

    mounted() {
        this.detenerEscucha = onAuthStateChanged(auth, async usuario => {
            if (!usuario) {
                this.nombre = ''
                return
            }
            const perfil = await obtenerPerfil(usuario.uid)
            this.nombre = perfil?.nombreCompleto?.trim().split(' ')[0] || 'Astronauta'
        })
    },

    unmounted() {
        this.detenerEscucha?.()
    },

    methods: {
        async salir() {
            await cerrarSesion()
            window.location.href = 'index.html'
        }
    },

    template: `
        <header class="bg-dark">
            <nav class="navbar navbar-dark">
                <div class="container-fluid gap-3">
                    <a href="index.html">
                        <img src="../../assets/img/logostar.png" alt="Star Park Logo" height="48">
                    </a>
                    <ul class="navbar-nav flex-row gap-5">
                        <li class="nav-item dropdown">
                            <div class="d-flex align-items-center">
                                <a class="nav-link" href="index.html">Inicio</a>
                                <button class="btn btn-link dropdown-toggle text-light"
                                    data-bs-toggle="dropdown" aria-expanded="false" aria-label="Mostrar opciones de Inicio"></button>
                            </div>
                            <ul class="dropdown-menu dropdown-menu-dark ">
                                <li><a class="dropdown-item" href="index.html#atracciones">Atracciones</a></li>
                                <li><a class="dropdown-item" href="index.html#servicios">Servicios</a></li>
                                <li><a class="dropdown-item" href="index.html#base-operaciones">Ubicación y Horarios</a></li>
                            </ul>
                        </li>
                        <li class="nav-item dropdown">
                            <div class="d-flex align-items-center">
                                <a class="nav-link" href="tienda.html">Tienda</a>
                                <button type="button" class="btn btn-link dropdown-toggle dropdown-toggle-split text-light p-0 ms-1"
                                    data-bs-toggle="dropdown" aria-expanded="false" aria-label="Mostrar opciones de Tienda"></button>
                            </div>
                            <ul class="dropdown-menu dropdown-menu-dark">
                                <li><a class="dropdown-item" href="tienda.html#promociones">Promociones</a></li>
                                <li><a class="dropdown-item" href="tienda.html#botin">Catálogo</a></li>
                            </ul>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="reservas.html">Mis Reservas</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="miscompras.html">Mis Compras</a>
                        </li>
                    </ul>
                    <div class="d-flex align-items-center gap-3">
                        <!-- Enlace directo al carrito. -->
                        <a class="btn btn-primary rounded-pill botonAmarillo d-inline-flex align-items-center gap-2" href="carrito.html"><img src="../../assets/img/iconcarrito.png" alt="Carrito" class="icono-boton">Ver mi carrito</a>

                        <!-- Con sesión: saludo + cerrar sesión. Sin sesión: enlace a login. -->
                        <template v-if="nombre">
                            <span class="text-white">Hola, {{ nombre }}</span>
                            <button type="button" class="btn btn-outline-light rounded-pill" @click="salir">Cerrar sesión</button>
                        </template>
                        <a v-else class="btn btn-primary rounded-pill botonAmarillo" href="login.html">👤 Iniciar sesión</a>
                    </div>
                </div>
            </nav>
        </header>
    `

}
