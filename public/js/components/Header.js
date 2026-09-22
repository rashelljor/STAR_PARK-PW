// Header.js - Menú de navegación compartido por todas las vistas de usuario.
// Idéntico al header que antes estaba repetido en cada página de public/html/users.

export default {

    template: `
        <header class="bg-dark">
            <nav class="navbar navbar-dark">
                <div class="container-fluid gap-3">
                    <a href="index.html">
                        <img src="../assets/img/logostar.png" alt="Star Park Logo" height="48">
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
                    <div>
                        <!-- Enlace directo al carrito. -->
                        <a class="btn btn-primary rounded-pill botonAmarillo d-inline-flex align-items-center gap-2" href="carrito.html"><img src="../assets/img/iconcarrito.png" alt="Carrito" class="icono-boton">Ver mi carrito</a>
                        <!-- Enlace directo al log in. -->
                        <a class="btn btn-primary rounded-pill botonAmarillo" href="login.html">👤 Iniciar sesión</a>
                    </div>
                </div>
            </nav>
        </header>
    `

}
