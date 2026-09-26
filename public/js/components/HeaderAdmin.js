// Header.js - Menú de navegación compartido por todas las vistas de usuario.
// Idéntico al header que antes estaba repetido en cada página de public/html/users.

export default {

    template: `
        <header class="bg-dark">
            <nav class="navbar navbar-dark">
                <div class="container-fluid gap-3">
                    <img src="../../assets/img/logostar.png" alt="Star Park Logo" height="48">
                    <ul class="navbar-nav flex-row gap-5">
                        <li class="nav-item">
                            <a class="nav-link" href="control.html">Panel de Control</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="gestion_catalogo.html">Gestión de Catálogo y Promociones</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="gestion_reservas_ventas.html">Administración de Reservas y Ventas</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="contenido.html">Contenido Institucional</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="usuario.html">Control de Usuarios</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="perfil.html">Perfil y Configuración</a>
                        </li>
                    </ul>
                </div>
            </nav>
        </header>
    `

}
