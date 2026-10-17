// HeaderAdmin.js - Estructura del panel de administración: barra superior
// violeta con la etiqueta fija "Modo Administrador", menú lateral y zona de
// contenido. Es distinta a la del sitio de clientes para no confundirlas.
// Los enlaces (y sus nombres) son los mismos de siempre; adminApp.js marca el
// activo y conecta el botón del menú y "Cerrar sesión".

const ENLACES = [
    { pagina: 'control', href: 'control.html', icono: '📊', texto: 'Panel de Control' },
    { pagina: 'catalogo', href: 'gestion_catalogo.html', icono: '🛒', texto: 'Gestión de Catálogo y Promociones' },
    { pagina: 'reservas', href: 'gestion_reservas_ventas.html', icono: '🎟️', texto: 'Administración de Reservas y Ventas' },
    { pagina: 'contenido', href: 'contenido.html', icono: '📝', texto: 'Contenido Institucional' },
    { pagina: 'usuarios', href: 'usuario.html', icono: '👥', texto: 'Control de Usuarios' },
    { pagina: 'perfil', href: 'perfil.html', icono: '⚙️', texto: 'Perfil y Configuración' }
]

export default {

    template: `
        <div class="adminLayout">
            <header class="adminBarra">
                <button type="button" class="adminMenuBoton" id="adminMenuBoton" aria-controls="adminSidebar" aria-expanded="false" aria-label="Abrir menú del panel">☰</button>
                <img src="../../assets/img/logostar.png" alt="Star Park" class="adminLogo">
                <span class="adminModo" role="status">🛠️ Modo Administrador</span>
                <div class="adminBarraAcciones">
                    <span class="adminCorreo" id="adminCorreo"></span>
                    <a class="btn btn-sm adminBotonSitio" href="../users/index.html" target="_blank" rel="noopener">Ver sitio de clientes ↗</a>
                    <button type="button" class="btn btn-sm adminBotonSalir" data-cerrar-sesion>Cerrar sesión</button>
                </div>
            </header>

            <aside class="adminSidebar" id="adminSidebar" aria-label="Secciones del panel">
                <nav>
                    <ul>
                        ${ENLACES.map(enlace => `
                            <li><a href="${enlace.href}" data-pagina="${enlace.pagina}"><span aria-hidden="true">${enlace.icono}</span>${enlace.texto}</a></li>`).join('')}
                    </ul>
                </nav>
                <div>
                    <a href="../users/index.html" target="_blank" rel="noopener"><span aria-hidden="true">🌐</span>Ver sitio de clientes ↗</a>
                    <button type="button" class="adminSidebarSalir w-100" data-cerrar-sesion>🚪 Cerrar sesión</button>
                </div>
            </aside>
            <div class="adminSidebarFondo" id="adminSidebarFondo"></div>

            <main class="adminContenido" id="adminContent"></main>
        </div>
    `

}
