import { auth, db } from '../config/firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import { doc, getDoc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import HeaderAdmin from '../components/HeaderAdmin.js'
import { crear, actualizar, eliminar, listar, escuchar, obtenerDocumento, guardarDocumento } from '../services/adminService.js'
import { CONTENIDO_INICIAL, ATRACCIONES_INICIALES, SERVICIOS_INICIALES, PRODUCTOS_INICIALES } from '../utils/contenidoInicial.js'
import { notificar, confirmar, notificarAlCargar } from '../utils/notificaciones.js'
import { aNumero, fechaLegible, formatearPrecio } from '../utils/formatters.js'
import { AFORO_POR_DEFECTO, CONDICIONES_CUPON, CUPONES_INICIALES, PAQUETES_EVENTO, PREFIJO_QR } from '../utils/constants.js'
import { estadoAforo } from '../services/capacityService.js'
import { coloresDe } from '../services/catalogService.js'
import { enviarCorreo } from '../services/mailService.js'
import { totalesCompras } from '../services/purchaseService.js'
import { prepararImagen, indicacionImagen, formatosAceptados } from '../services/imageService.js'
import { obtenerPerfil, asegurarNombreUsuario } from '../services/authService.js'

const pagina = document.body.dataset.adminPage
const app = document.getElementById('adminApp')

const vistas = {
    control: panelControl,
    catalogo: panelCatalogo,
    reservas: panelReservas,
    contenido: panelContenido,
    usuarios: panelUsuarios,
    perfil: panelPerfil
}

function escapar(valor = '') {
    return String(valor).replace(/[&<>'"]/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter])
}

// Aviso común cuando una sección del panel no logra leer sus datos de Firestore.
function errorDeCarga(fallo) {
    console.error(fallo)
    notificar('No se pudieron cargar los datos de esta sección. Recarga la página para intentarlo de nuevo.', 'error')
}

function mostrarShell() {
    app.innerHTML = HeaderAdmin.template
    document.getElementById('adminContent').innerHTML = '<p class="text-white">Cargando panel...</p>'
    document.getElementById('adminCorreo').textContent = auth.currentUser.email

    // Marca la sección actual en el menú lateral.
    const activo = document.querySelector(`.adminSidebar a[data-pagina="${pagina}"]`)
    activo?.classList.add('active')
    activo?.setAttribute('aria-current', 'page')

    // Botón ☰: en tablet y celular abre el menú lateral encima del contenido; en
    // computadora lo guarda o lo muestra, y el panel recuerda la elección.
    const sidebar = document.getElementById('adminSidebar')
    const botonMenu = document.getElementById('adminMenuBoton')
    const layout = app.querySelector('.adminLayout')
    const esCelular = window.matchMedia('(max-width: 800px)')
    const actualizarBotonMenu = () => {
        const visible = esCelular.matches ? sidebar.classList.contains('abierto') : !layout.classList.contains('menuGuardado')
        const texto = (visible ? 'Ocultar' : 'Mostrar') + ' menú del panel'
        botonMenu.setAttribute('aria-expanded', String(visible))
        botonMenu.setAttribute('aria-label', texto)
        botonMenu.title = texto
    }
    const alternarMenu = abrir => {
        sidebar.classList.toggle('abierto', abrir)
        actualizarBotonMenu()
    }
    try { layout.classList.toggle('menuGuardado', localStorage.getItem('adminMenuGuardado') === '1') } catch { /* sin almacenamiento: menú visible */ }
    actualizarBotonMenu()
    esCelular.addEventListener('change', actualizarBotonMenu)
    botonMenu.onclick = () => {
        if (esCelular.matches) return alternarMenu(!sidebar.classList.contains('abierto'))
        const guardado = layout.classList.toggle('menuGuardado')
        try { localStorage.setItem('adminMenuGuardado', guardado ? '1' : '0') } catch { /* la elección dura solo esta página */ }
        actualizarBotonMenu()
    }
    document.getElementById('adminSidebarFondo').onclick = () => alternarMenu(false)
    document.addEventListener('keydown', evento => { if (evento.key === 'Escape') alternarMenu(false) })

    // "Cerrar sesión" está en la barra superior, siempre visible.
    document.querySelectorAll('[data-cerrar-sesion]').forEach(boton => { boton.onclick = cerrarSesionAdmin })

    const contenido = vistas[pagina]
    if (contenido) contenido(document.getElementById('adminContent'))
}

async function cerrarSesionAdmin() {
    if (!await confirmar('¿Quieres cerrar la sesión de administrador?', { textoConfirmar: 'Cerrar sesión' })) return
    cerrandoSesion = true
    try {
        await signOut(auth)
        notificarAlCargar('Cerraste la sesión de administrador.', 'exito')
        window.location.href = 'admin.html'
    } catch (fallo) {
        cerrandoSesion = false
        console.error(fallo)
        notificar('No se pudo cerrar la sesión: ' + fallo.message, 'error')
    }
}

// Selector de imagen para los formularios del panel: el archivo se recorta al
// tamaño del tipo y queda en el campo oculto "imagen", que se guarda con el resto.
function campoImagen(tipo, etiqueta = 'Imagen') {
    return `<span class="text-white d-block">${etiqueta}</span>
        <div class="d-flex flex-wrap align-items-center gap-3">
            <img data-vista-imagen alt="Vista previa" class="d-none" style="width:64px;height:48px;object-fit:cover;border-radius:6px">
            <div class="flex-grow-1">
                <input type="hidden" name="imagen">
                <input class="form-control" type="file" accept="${formatosAceptados()}" data-archivo-imagen aria-label="${etiqueta}">
                <small class="text-white-50 d-block mt-1">${indicacionImagen(tipo)}</small>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger d-none" data-quitar-imagen>Quitar imagen</button>
        </div>`
}

// Activa el selector dentro del formulario. Devuelve mostrar(valor), para
// cargar la imagen de un elemento al editarlo; reset() la deja vacía.
function activarCampoImagen(formulario, tipo) {
    const oculto = formulario.elements.imagen
    const archivo = formulario.querySelector('[data-archivo-imagen]')
    const vista = formulario.querySelector('[data-vista-imagen]')
    const quitar = formulario.querySelector('[data-quitar-imagen]')
    const mostrar = valor => {
        oculto.value = valor || ''
        vista.src = valor || ''
        vista.classList.toggle('d-none', !valor)
        quitar.classList.toggle('d-none', !valor)
    }
    archivo.addEventListener('change', async () => {
        const elegido = archivo.files[0]
        if (!elegido) return
        try {
            mostrar(await prepararImagen(elegido, tipo))
        } catch (fallo) {
            notificar(fallo.message, 'error')
        }
        archivo.value = ''
    })
    quitar.onclick = () => mostrar('')
    // reset() no vacía los input hidden ni la vista previa.
    formulario.addEventListener('reset', () => mostrar(''))
    return mostrar
}

function botonAccion(coleccion, id, texto = 'Eliminar') {
    return `<button class="btn btn-sm btn-outline-danger" data-delete="${coleccion}" data-id="${id}">${texto}</button>`
}

// Tarjetas grandes del panel de control: ícono, título, cifra y un detalle debajo.
const KPIS = [
    { id: 'Reservas', icono: '🎟️', titulo: 'Reservas', color: 'celeste' },
    { id: 'Ventas', icono: '💳', titulo: 'Ventas', color: 'verde' },
    { id: 'Clientes', icono: '👥', titulo: 'Clientes', color: 'violeta' },
    { id: 'Productos', icono: '🛒', titulo: 'Productos', color: 'amarillo' }
]

// Fecha local AAAA-MM-DD (toISOString usa UTC y en Perú adelanta el día desde las 7 p. m.).
function fechaLocal(fecha = new Date()) {
    return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('-')
}

// Colores del sitio leídos de global.css, para que los gráficos usen la misma paleta.
function colorCss(variable) {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
}

// Carga una librería clásica (no módulo) desde un CDN una sola vez.
const scriptsCargados = {}
// El contador de fidelidad (millas y compras de cada cliente) avanza con cada
// pago, pero las compras anteriores a él no se contaron. Al abrir el panel se
// recalcula desde las transacciones y se corrige el que no coincida.
async function sincronizarFidelidad(ventas) {
    const porCliente = {}
    ventas.forEach(venta => { (porCliente[venta.uid] ||= []).push(venta) })
    const guardados = await listar('fidelidad')
    await Promise.all(Object.entries(porCliente).map(([uid, compras]) => {
        const esperado = totalesCompras(compras)
        const actual = guardados.find(item => item.id === uid)
        const igual = actual && ['millasGanadas', 'millasUsadas', 'compras'].every(campo => actual[campo] === esperado[campo])
        return igual ? null : guardarDocumento('fidelidad', uid, esperado)
    }))
}

// Marca la entrada como usada y entrega los productos del bazar. Las reservas
// nuevas ya apartaron su stock al reservar; solo a las del sistema anterior se
// les descuenta aquí, en la misma transacción. Devuelve lo que se entrega.
async function validarYDescontarStock(reserva) {
    const porProducto = {}
    ;(reserva.items || []).filter(item => item.categoria === 'bazar').forEach(item => {
        const id = item.productoId || item.id
        porProducto[id] = (porProducto[id] || 0) + (Number(item.cantidad) || 1)
    })
    const entregados = (reserva.items || []).filter(item => item.categoria === 'bazar').map(item => (Number(item.cantidad) || 1) + ' × ' + item.nombre + (item.color ? ' (' + item.color + ')' : ''))

    await runTransaction(db, async transaccion => {
        const referenciaReserva = doc(db, 'reservas', reserva.id)
        const actual = await transaccion.get(referenciaReserva)
        if (actual.data()?.estado === 'usada') throw new Error('Esta entrada ya fue validada.')
        // Todas las lecturas van antes de las escrituras.
        const productos = await Promise.all(Object.keys(porProducto).map(id => transaccion.get(doc(db, 'productos', id))))
        transaccion.update(referenciaReserva, { estado: 'usada', usadaEn: serverTimestamp(), validadaPor: auth.currentUser.email, actualizadoEn: serverTimestamp() })
        if (reserva.apartado) return
        productos.filter(producto => producto.exists()).forEach(producto => {
            const stock = Math.max(0, (Number(producto.data().stock) || 0) - porProducto[producto.id])
            transaccion.update(producto.ref, { stock, actualizadoEn: serverTimestamp() })
        })
    })
    return entregados
}

function cargarScript(url) {
    scriptsCargados[url] ||= new Promise((resolver, rechazar) => {
        const script = document.createElement('script')
        script.src = url
        script.onload = resolver
        script.onerror = () => rechazar(new Error('No se pudo cargar ' + url))
        document.head.appendChild(script)
    })
    return scriptsCargados[url]
}

function panelControl(elemento) {
    elemento.innerHTML = `
        <h1 class="text-white">Panel de control</h1>
        <p class="text-white-50">Resumen operativo de Star Park</p>
        <div class="kpiGrilla">
            ${KPIS.map(kpi => `
                <article class="kpiTarjeta kpi-${kpi.color}">
                    <span class="kpiIcono" aria-hidden="true">${kpi.icono}</span>
                    <div>
                        <h2 class="kpiTitulo">${kpi.titulo}</h2>
                        <p class="kpiValor" id="kpi${kpi.id}">–</p>
                        <p class="kpiDetalle" id="kpi${kpi.id}Detalle">Cargando...</p>
                    </div>
                </article>`).join('')}
        </div>
        <div class="glass p-4 mt-4">
            <h2 class="h4 text-white">Alertas</h2>
            <ul class="mb-0" id="alertasPanel"><li>Cargando...</li></ul>
        </div>
        <div class="row g-4 mt-0">
            <div class="col-12 col-xl-8"><div class="glass p-4 h-100"><h2 class="h4 text-white">Ingresos de los últimos 14 días</h2><canvas id="graficoVentas" height="120" role="img" aria-label="Gráfico de ingresos por día"></canvas></div></div>
            <div class="col-12 col-xl-4"><div class="glass p-4 h-100"><h2 class="h4 text-white">Reservas por estado</h2><canvas id="graficoEstados" role="img" aria-label="Gráfico de reservas pagadas, pendientes y usadas"></canvas></div></div>
            <div class="col-12 col-xl-6"><div class="glass p-4 h-100"><h2 class="h4 text-white">Productos más vendidos</h2><canvas id="graficoProductos" height="160" role="img" aria-label="Gráfico de productos más vendidos"></canvas></div></div>
            <div class="col-12 col-xl-6"><div class="glass p-4 h-100"><h2 class="h4 text-white">Aforo de los próximos 14 días</h2><canvas id="graficoAforo" height="160" role="img" aria-label="Gráfico de ocupación por día"></canvas></div></div>
        </div>
        <form class="glass p-4 mt-4" id="formAforo">
            <h2 class="h4 text-white">Configuración de aforo</h2>
            <p class="text-white-50">Personas (entradas) que el parque puede recibir por día. Los días se pintan "casi llenos" desde el 80 %.</p>
            <div class="d-flex flex-wrap gap-2 align-items-end">
                <label class="text-white">Aforo máximo por día<input class="form-control" name="maximoPorDia" type="number" min="1" max="5000" required></label>
                <button class="btn btn-warning">Guardar aforo</button>
            </div>
        </form>`

    const escribir = (id, valor, detalle) => {
        document.getElementById('kpi' + id).textContent = valor
        document.getElementById('kpi' + id + 'Detalle').textContent = detalle
    }

    const formAforo = document.getElementById('formAforo')
    formAforo.addEventListener('submit', async evento => {
        evento.preventDefault()
        try {
            await guardarDocumento('configuracion', 'aforo', { maximoPorDia: Number(formAforo.elements.maximoPorDia.value) })
            notificar('Aforo actualizado. El calendario de reservas ya usa el nuevo máximo.', 'exito')
            panelControl(elemento)
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo guardar el aforo: ' + fallo.message, 'error')
        }
    })

    Promise.all([listar('reservas'), listar('transacciones'), listar('usuarios'), listar('productos'), listar('ocupacion'), listar('eventos'), obtenerDocumento('configuracion', 'aforo')])
        .then(([reservas, ventas, usuarios, productos, ocupacion, eventos, configAforo]) => {
            const pendientes = reservas.filter(reserva => !reserva.pagado).length
            const ingresos = ventas.reduce((suma, venta) => suma + aNumero(venta.total), 0)
            const clientes = usuarios.filter(usuario => usuario.rol !== 'admin').length
            const promociones = productos.filter(producto => producto.categoria === 'promociones').length
            const aforo = Number(configAforo?.maximoPorDia) || AFORO_POR_DEFECTO
            formAforo.elements.maximoPorDia.value = aforo

            sincronizarFidelidad(ventas).catch(fallo => console.error('No se pudo sincronizar la fidelidad:', fallo))

            escribir('Reservas', reservas.length, pendientes + (pendientes === 1 ? ' pendiente de pago' : ' pendientes de pago'))
            escribir('Ventas', ventas.length, formatearPrecio(ingresos) + ' en ingresos')
            escribir('Clientes', clientes, (usuarios.length - clientes) + ' administradores')
            escribir('Productos', productos.length, promociones + ' promociones activas')

            // Próximos 14 días: ocupación por fecha.
            const dias = Array.from({ length: 14 }, (_, i) => { const fecha = new Date(); fecha.setDate(fecha.getDate() + i); return fechaLocal(fecha) })
            const ocupadasPorDia = {}
            ocupacion.forEach(item => { ocupadasPorDia[item.fecha] = (ocupadasPorDia[item.fecha] || 0) + (Number(item.entradas) || 0) })

            // Alertas: aforo, eventos por confirmar y reservas pendientes de pago para hoy.
            const hoy = fechaLocal()
            const alertas = []
            dias.forEach(dia => {
                const estado = estadoAforo(ocupadasPorDia[dia] || 0, aforo)
                if (estado === 'agotado') alertas.push(`🔴 <strong>${dia}</strong>: aforo agotado (${ocupadasPorDia[dia]} de ${aforo}).`)
                else if (estado === 'casiLleno') alertas.push(`🟡 <strong>${dia}</strong>: casi lleno (${ocupadasPorDia[dia]} de ${aforo}).`)
            })
            const eventosPendientes = eventos.filter(item => item.estado === 'pendiente').length
            if (eventosPendientes) alertas.push(`🎂 ${eventosPendientes} ${eventosPendientes === 1 ? 'solicitud de evento espera' : 'solicitudes de evento esperan'} confirmación. <a class="link-warning" href="gestion_reservas_ventas.html#eventos">Revisar</a>`)
            const sinPagarHoy = reservas.filter(reserva => !reserva.pagado && reserva.fecha === hoy).length
            if (sinPagarHoy) alertas.push(`💳 ${sinPagarHoy} ${sinPagarHoy === 1 ? 'reserva para hoy sigue' : 'reservas para hoy siguen'} sin pagar.`)
            document.getElementById('alertasPanel').innerHTML = alertas.length ? alertas.map(texto => `<li class="text-white">${texto}</li>`).join('') : '<li class="text-white">✅ Todo en orden: sin alertas para los próximos 14 días.</li>'

            dibujarGraficos({ reservas, ventas, dias, ocupadasPorDia, aforo })
        }).catch(errorDeCarga)
}

async function dibujarGraficos({ reservas, ventas, dias, ocupadasPorDia, aforo }) {
    const { default: Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/auto/+esm')
    const [celeste, amarillo, verde, rojo, gris, borde] = ['--celeste', '--amarillo', '--verde', '--rojo', '--gris', '--borde'].map(colorCss)
    // Azul del panel (admin.css, .kpi-violeta) en lugar del violeta del sitio.
    const azul = '#5b8cff'
    Chart.defaults.color = gris
    Chart.defaults.borderColor = borde
    Chart.defaults.font.family = colorCss('--fuente') || 'Sora, sans-serif'
    const etiquetaSoles = { callbacks: { label: contexto => formatearPrecio(contexto.parsed.y ?? contexto.parsed.x) } }

    // Ingresos por día (fecha del pago).
    const ultimos = Array.from({ length: 14 }, (_, i) => { const fecha = new Date(); fecha.setDate(fecha.getDate() - 13 + i); return fechaLocal(fecha) })
    const ingresosPorDia = Object.fromEntries(ultimos.map(dia => [dia, 0]))
    ventas.forEach(venta => {
        const fecha = venta.fecha?.toDate ? fechaLocal(venta.fecha.toDate()) : null
        if (fecha in ingresosPorDia) ingresosPorDia[fecha] += aNumero(venta.total)
    })
    new Chart(document.getElementById('graficoVentas'), {
        type: 'bar',
        data: { labels: ultimos.map(dia => dia.slice(5)), datasets: [{ label: 'Ingresos', data: Object.values(ingresosPorDia), backgroundColor: celeste, borderRadius: 6 }] },
        options: { plugins: { legend: { display: false }, tooltip: etiquetaSoles }, scales: { y: { beginAtZero: true, ticks: { callback: valor => 'S/ ' + valor } } } }
    })

    const usadas = reservas.filter(reserva => reserva.estado === 'usada').length
    const pagadas = reservas.filter(reserva => reserva.pagado).length - usadas
    new Chart(document.getElementById('graficoEstados'), {
        type: 'doughnut',
        data: { labels: ['Pagadas', 'Pendientes', 'Entrada usada'], datasets: [{ data: [pagadas, reservas.length - pagadas - usadas, usadas], backgroundColor: [verde, amarillo, azul], borderColor: colorCss('--superficie') }] },
        options: { plugins: { legend: { position: 'bottom' } } }
    })

    // Unidades vendidas por producto (solo compras pagadas).
    const unidades = {}
    ventas.forEach(venta => (venta.items || []).forEach(item => { unidades[item.nombre] = (unidades[item.nombre] || 0) + (Number(item.cantidad) || 1) }))
    const top = Object.entries(unidades).sort((a, b) => b[1] - a[1]).slice(0, 6)
    new Chart(document.getElementById('graficoProductos'), {
        type: 'bar',
        data: { labels: top.map(([nombre]) => nombre), datasets: [{ label: 'Unidades vendidas', data: top.map(([, cantidad]) => cantidad), backgroundColor: amarillo, borderRadius: 6 }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
    })

    const ocupadas = dias.map(dia => ocupadasPorDia[dia] || 0)
    new Chart(document.getElementById('graficoAforo'), {
        type: 'bar',
        data: {
            labels: dias.map(dia => dia.slice(5)),
            datasets: [
                { label: 'Entradas reservadas', data: ocupadas, backgroundColor: ocupadas.map(valor => ({ libre: verde, casiLleno: amarillo, agotado: rojo })[estadoAforo(valor, aforo)]), borderRadius: 6 },
                { type: 'line', label: 'Aforo máximo', data: dias.map(() => aforo), borderColor: rojo, borderDash: [6, 6], pointRadius: 0 }
            ]
        },
        options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    })
}

// Promociones y botín son servicios (entradas al parque); el bazar vende productos
// físicos, los únicos con stock y colores.
const CATEGORIAS_PRODUCTO = {
    promociones: 'Servicio · Promoción',
    botin: 'Servicio · Botín (ticket individual)',
    bazar: 'Producto · Bazar'
}

function panelCatalogo(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Gestión de catálogo y promociones</h1>
        <form id="formCatalogo" class="glass p-4 mb-4">
            <input type="hidden" name="id">
            <div class="row g-2">
                <div class="col-md-4"><input class="form-control" name="nombre" placeholder="Nombre" required></div>
                <div class="col-md-4"><input class="form-control" name="descripcion" placeholder="Descripción" required></div>
                <div class="col-md-2"><select class="form-select" name="categoria" aria-label="Categoría">${Object.entries(CATEGORIAS_PRODUCTO).map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('')}</select></div>
                <div class="col-md-2"><input class="form-control" name="precio" type="number" min="0" step="0.01" placeholder="Precio" required></div>
            </div>
            <div class="mt-2">${campoImagen('producto', 'Imagen del producto')}</div>
            <div class="row g-2 mt-1 d-none" id="camposBazar">
                <div class="col-md-3"><label class="text-white w-100">Stock (unidades)<input class="form-control" name="stock" type="number" min="0" step="1"></label></div>
                <div class="col-md-9">
                    <span class="text-white d-block">Colores disponibles <small class="text-white-50">(el cliente elige uno en la tienda)</small></span>
                    <div class="d-flex flex-wrap align-items-center gap-2 mt-1" id="listaColores"></div>
                </div>
            </div>
            <div class="mt-3 d-flex flex-wrap gap-2"><button class="btn btn-warning" id="guardarCatalogo">Agregar producto</button> <button type="button" class="btn btn-outline-light" id="limpiarCatalogo">Limpiar</button></div>
        </form>
        <div class="glass p-4"><div class="table-responsive"><table class="table table-dark"><thead><tr><th>Nombre</th><th>Tipo</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tablaCatalogo"></tbody></table></div><button type="button" class="btn btn-outline-info btn-sm d-none" id="importarCatalogo">Importar los productos actuales de la tienda</button></div>`
    const formulario = document.getElementById('formCatalogo')
    const tabla = document.getElementById('tablaCatalogo')
    const importar = document.getElementById('importarCatalogo')
    // Stock y colores solo se piden para el bazar.
    const camposBazar = document.getElementById('camposBazar')
    const alternarBazar = () => {
        const esBazar = formulario.elements.categoria.value === 'bazar'
        camposBazar.classList.toggle('d-none', !esBazar)
        formulario.elements.stock.required = esBazar
    }
    formulario.elements.categoria.addEventListener('change', alternarBazar)
    const mostrarImagen = activarCampoImagen(formulario, 'producto')
    // Colores: un selector por color, con ✕ para quitarlo y un botón para agregar otro.
    const listaColores = document.getElementById('listaColores')
    const dibujarColores = colores => {
        listaColores.innerHTML = colores.map((color, indice) => `<span class="d-inline-flex align-items-center gap-1">
                <input type="color" class="form-control form-control-color rounded-circle p-1" value="${escapar(color)}" aria-label="Color ${indice + 1}" data-color>
                <button type="button" class="btn btn-sm btn-outline-danger py-0 px-1" data-quitar-color="${indice}" aria-label="Quitar color ${indice + 1}">✕</button>
            </span>`).join('') + '<button type="button" class="btn btn-sm btn-outline-info" data-agregar-color>+ Agregar color</button>'
    }
    const coloresDelFormulario = () => [...new Set([...listaColores.querySelectorAll('[data-color]')].map(campo => campo.value.toLowerCase()))]
    listaColores.addEventListener('click', evento => {
        const boton = evento.target.closest('button')
        if (!boton) return
        const colores = coloresDelFormulario()
        if (boton.dataset.agregarColor !== undefined) colores.push('#ffffff')
        else colores.splice(Number(boton.dataset.quitarColor), 1)
        dibujarColores(colores)
    })
    dibujarColores([])
    // El botón dice qué va a pasar: agregar uno nuevo o guardar el que se está editando.
    const botonGuardar = document.getElementById('guardarCatalogo')
    const modoEdicion = editando => { botonGuardar.textContent = editando ? 'Guardar cambios' : 'Agregar producto' }
    // reset() no vacía los input hidden: sin esto, tras editar un producto, el
    // siguiente "nuevo" sobrescribía al editado.
    formulario.addEventListener('reset', () => { formulario.elements.id.value = ''; modoEdicion(false); dibujarColores([]); setTimeout(alternarBazar) })
    importar.onclick = async () => { try { await Promise.all(PRODUCTOS_INICIALES.map(({ id, ...producto }) => crear('productos', producto))); await cargar(); notificar('Productos importados al catálogo.', 'exito') } catch (fallo) { console.error(fallo); notificar('No se pudieron importar los productos: ' + fallo.message, 'error') } }
    const circulo = color => `<span class="d-inline-block rounded-circle align-middle border border-light" style="width: 14px; height: 14px; background: ${escapar(color)}" title="${escapar(color)}"></span>`
    const tipoDe = producto => escapar(CATEGORIAS_PRODUCTO[producto.categoria] || producto.categoria) + (producto.categoria === 'bazar' ? `<div class="small text-white-50 d-flex flex-wrap align-items-center gap-1">Stock: ${Number(producto.stock) || 0}${coloresDe(producto).length ? ' · ' + coloresDe(producto).map(circulo).join('') : ''}</div>` : '')
    const cargar = () => listar('productos').then(productos => { importar.classList.toggle('d-none', productos.length > 0); tabla.innerHTML = productos.map(producto => `<tr><td>${escapar(producto.nombre)}</td><td>${tipoDe(producto)}</td><td>S/ ${Number(producto.precio || 0).toFixed(2)}</td><td>${escapar(producto.estado || 'Activo')}</td><td><div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-outline-info" data-edit="${producto.id}">Editar</button> ${botonAccion('productos', producto.id)} <a class="btn btn-sm btn-outline-warning" href="../users/tienda.html#producto-${producto.id}" target="_blank" rel="noopener" title="Abre la tienda en una pestaña nueva, en este producto">Ver en tienda ↗</a></div></td></tr>`).join('') }).catch(errorDeCarga)
    formulario.addEventListener('submit', async evento => {
        evento.preventDefault()
        const datos = Object.fromEntries(new FormData(formulario))
        datos.precio = Number(datos.precio)
        datos.estado = 'Activo'
        if (datos.categoria === 'bazar') {
            datos.stock = Math.max(0, Math.floor(Number(datos.stock) || 0))
            datos.colores = coloresDelFormulario()
        } else {
            delete datos.stock
            delete datos.colores
        }
        const id = datos.id
        delete datos.id
        try { id ? await actualizar('productos', id, datos) : await crear('productos', datos); formulario.reset(); await cargar(); notificar(id ? 'Producto actualizado.' : 'Producto agregado al catálogo.', 'exito') } catch (fallo) { console.error(fallo); notificar('No se pudo guardar el producto: ' + fallo.message, 'error') }
    })
    document.getElementById('limpiarCatalogo').onclick = () => formulario.reset()
    tabla.addEventListener('click', async evento => { const boton = evento.target.closest('[data-delete], [data-edit]'); if (!boton) return; if (boton.dataset.delete) { if (!await confirmar('¿Eliminar este producto del catálogo?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return; try { await eliminar(boton.dataset.delete, boton.dataset.id); notificar('Producto eliminado.', 'exito') } catch (fallo) { console.error(fallo); notificar('No se pudo eliminar el producto: ' + fallo.message, 'error') } } else { const producto = (await listar('productos')).find(item => item.id === boton.dataset.edit); formulario.reset(); Object.entries(producto).forEach(([clave, valor]) => { if (formulario.elements[clave]) formulario.elements[clave].value = valor }); formulario.elements.id.value = producto.id; mostrarImagen(producto.imagen); dibujarColores(coloresDe(producto)); alternarBazar(); modoEdicion(true); formulario.scrollIntoView({ behavior: 'smooth' }) } await cargar() })
    cargar()

    const paquetes = document.createElement('section')
    paquetes.className = 'glass p-4 mt-4'
    elemento.appendChild(paquetes)
    seccionPaquetes(paquetes)

    const cupones = document.createElement('section')
    cupones.className = 'glass p-4 mt-4'
    elemento.appendChild(cupones)
    seccionCupones(cupones)
}

// Paquetes de cumpleaños (colección "paquetes"). Mientras no haya ninguno guardado,
// el sitio usa los de constants.js; al editar o borrar el primero, se guardan
// todos para que la página de cumpleaños no pierda los demás.
function seccionPaquetes(contenedor) {
    contenedor.innerHTML = `
        <h2 class="h4 text-white">🎂 Paquetes de cumpleaños</h2>
        <p class="text-white-50">Se muestran en la página de cumpleaños y en el costado de la tienda. El precio es referencial, por niño.</p>
        <form class="formularioLista p-3 mb-4" id="formPaquete">
            <input type="hidden" name="id">
            <div class="row g-2">
                <div class="col-md-3"><label class="text-white w-100">Nombre<input class="form-control" name="nombre" required></label></div>
                <div class="col-md-2"><label class="text-white w-100">Precio por niño<input class="form-control" name="precioPorNino" type="number" min="0" step="0.01" required></label></div>
                <div class="col-md-7"><label class="text-white w-100">Qué incluye<input class="form-control" name="detalle" required></label></div>
            </div>
            <div class="mt-3 d-flex flex-wrap gap-2">
                <button class="btn btn-warning" data-guardar>Agregar paquete</button>
                <button type="button" class="btn btn-outline-light" data-limpiar>Limpiar</button>
            </div>
        </form>
        <div class="table-responsive"><table class="table table-dark"><thead><tr><th>Paquete</th><th>Precio por niño</th><th>Incluye</th><th>Acciones</th></tr></thead><tbody id="tablaPaquetes"></tbody></table></div>
        <p class="small text-white-50 d-none" id="paquetesPorDefecto">Estos son los paquetes por defecto del sitio. Al guardar un cambio quedarán guardados en Firestore.</p>`

    const formulario = contenedor.querySelector('#formPaquete')
    const tabla = contenedor.querySelector('#tablaPaquetes')
    const avisoPorDefecto = contenedor.querySelector('#paquetesPorDefecto')
    const botonGuardar = formulario.querySelector('[data-guardar]')
    let lista = []
    let porDefecto = false

    const modoEdicion = editando => { botonGuardar.textContent = editando ? 'Guardar cambios' : 'Agregar paquete' }
    formulario.addEventListener('reset', () => { formulario.elements.id.value = ''; modoEdicion(false) })
    formulario.querySelector('[data-limpiar]').onclick = () => formulario.reset()

    const cargar = () => listar('paquetes').then(paquetes => {
        porDefecto = !paquetes.length
        lista = (porDefecto ? PAQUETES_EVENTO : paquetes).slice().sort((a, b) => Number(a.precioPorNino) - Number(b.precioPorNino))
        avisoPorDefecto.classList.toggle('d-none', !porDefecto)
        tabla.innerHTML = lista.length ? lista.map(paquete => `<tr>
            <td><strong>${escapar(paquete.nombre)}</strong></td>
            <td>${formatearPrecio(paquete.precioPorNino)}</td>
            <td>${escapar(paquete.detalle)}</td>
            <td><div class="d-flex flex-wrap gap-2">
                <button class="btn btn-sm btn-outline-info" data-editar="${escapar(paquete.id)}">Editar</button>
                <button class="btn btn-sm btn-outline-danger" data-borrar="${escapar(paquete.id)}">Eliminar</button>
            </div></td></tr>`).join('') : '<tr><td colspan="4">Aún no hay paquetes.</td></tr>'
    }).catch(errorDeCarga)

    // Guarda en Firestore los paquetes por defecto (con su id actual) antes del primer cambio.
    const guardarPorDefecto = async () => {
        if (!porDefecto) return
        await Promise.all(PAQUETES_EVENTO.map(({ id, ...paquete }) => guardarDocumento('paquetes', id, paquete)))
        porDefecto = false
    }

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault()
        const datos = Object.fromEntries(new FormData(formulario))
        const paquete = { nombre: datos.nombre.trim(), precioPorNino: Number(datos.precioPorNino), detalle: datos.detalle.trim() }
        try {
            await guardarPorDefecto()
            if (datos.id) await actualizar('paquetes', datos.id, paquete)
            else await crear('paquetes', paquete)
            formulario.reset()
            notificar(datos.id ? 'Paquete actualizado.' : 'Paquete ' + paquete.nombre + ' agregado.', 'exito')
            cargar()
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo guardar el paquete: ' + fallo.message, 'error')
        }
    })

    tabla.addEventListener('click', async evento => {
        const boton = evento.target.closest('button')
        if (!boton) return
        const paquete = lista.find(item => item.id === (boton.dataset.editar || boton.dataset.borrar))
        if (!paquete) return
        if (boton.dataset.editar) {
            formulario.reset()
            ;['id', 'nombre', 'precioPorNino', 'detalle'].forEach(campo => { formulario.elements[campo].value = paquete[campo] ?? '' })
            modoEdicion(true)
            formulario.scrollIntoView({ behavior: 'smooth' })
            return
        }
        if (lista.length === 1) {
            notificar('Debe quedar al menos un paquete de cumpleaños.', 'advertencia')
            return
        }
        if (!await confirmar('¿Eliminar el ' + paquete.nombre + '?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return
        try {
            await guardarPorDefecto()
            await eliminar('paquetes', paquete.id)
            notificar('Paquete eliminado.', 'exito')
            cargar()
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo eliminar el paquete: ' + fallo.message, 'error')
        }
    })

    cargar()
}

// Cupones de descuento: el id del documento es el código en mayúsculas
// (así el cliente lo busca directo y no se repiten códigos).
function seccionCupones(contenedor) {
    contenedor.innerHTML = `
        <h2 class="h4 text-white">Cupones de descuento</h2>
        <p class="text-white-50">El cliente los aplica en su carrito. La condición se valida al aplicarlo; los usos se cuentan al pagar.</p>
        <form class="formularioLista p-3 mb-4" id="formCupon">
            <div class="row g-2">
                <div class="col-md-2"><label class="text-white w-100">Código<input class="form-control text-uppercase" name="codigo" required pattern="[A-Za-z0-9]{3,20}" title="3 a 20 letras o números"></label></div>
                <div class="col-md-3"><label class="text-white w-100">Descripción<input class="form-control" name="descripcion" required></label></div>
                <div class="col-md-1"><label class="text-white w-100">% Desc.<input class="form-control" name="descuento" type="number" min="1" max="90" required></label></div>
                <div class="col-md-2"><label class="text-white w-100">Condición<select class="form-select" name="condicion">${Object.entries(CONDICIONES_CUPON).map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('')}</select></label></div>
                <div class="col-md-2"><label class="text-white w-100">Vence (opcional)<input class="form-control" name="vencimiento" type="date"></label></div>
                <div class="col-md-2"><label class="text-white w-100">Usos máx. (0 = sin límite)<input class="form-control" name="usosMaximos" type="number" min="0" value="0"></label></div>
            </div>
            <div class="mt-3 d-flex flex-wrap gap-2">
                <button class="btn btn-warning" data-guardar>Agregar cupón</button>
                <button type="button" class="btn btn-outline-light" data-limpiar>Limpiar</button>
            </div>
        </form>
        <div class="table-responsive"><table class="table table-dark"><thead><tr><th>Código</th><th>Descuento</th><th>Condición</th><th>Vence</th><th>Usos</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tablaCupones"></tbody></table></div>
        <button type="button" class="btn btn-outline-info btn-sm d-none" id="importarCupones">Crear los 3 cupones sugeridos (primera compra, más de 3 juegos y cliente frecuente)</button>`

    const formulario = contenedor.querySelector('#formCupon')
    const tabla = contenedor.querySelector('#tablaCupones')
    const importar = contenedor.querySelector('#importarCupones')
    const botonGuardar = formulario.querySelector('[data-guardar]')
    let lista = []

    const modoEdicion = editando => {
        botonGuardar.textContent = editando ? 'Guardar cambios' : 'Agregar cupón'
        formulario.elements.codigo.readOnly = editando
    }
    formulario.addEventListener('reset', () => modoEdicion(false))
    formulario.querySelector('[data-limpiar]').onclick = () => formulario.reset()

    const cargar = () => listar('cupones', 'codigo').then(cupones => {
        lista = cupones
        importar.classList.toggle('d-none', cupones.length > 0)
        tabla.innerHTML = cupones.length ? cupones.map(cupon => `<tr>
            <td><strong>${escapar(cupon.id)}</strong><div class="small text-white-50">${escapar(cupon.descripcion)}</div></td>
            <td>${escapar(cupon.descuento)} %</td>
            <td>${escapar(CONDICIONES_CUPON[cupon.condicion] || cupon.condicion)}</td>
            <td>${escapar(cupon.vencimiento || '—')}</td>
            <td>${cupon.usos || 0}${cupon.usosMaximos ? ' / ' + cupon.usosMaximos : ''}</td>
            <td>${cupon.activo ? 'Activo' : 'Pausado'}</td>
            <td><div class="d-flex flex-wrap gap-2">
                <button class="btn btn-sm btn-outline-info" data-editar="${escapar(cupon.id)}">Editar</button>
                <button class="btn btn-sm btn-outline-warning" data-alternar="${escapar(cupon.id)}">${cupon.activo ? 'Pausar' : 'Activar'}</button>
                <button class="btn btn-sm btn-outline-danger" data-borrar="${escapar(cupon.id)}">Eliminar</button>
            </div></td></tr>`).join('') : '<tr><td colspan="7">Aún no hay cupones.</td></tr>'
    }).catch(errorDeCarga)

    importar.onclick = async () => {
        try {
            await Promise.all(CUPONES_INICIALES.map(({ codigo, ...cupon }) => guardarDocumento('cupones', codigo, { ...cupon, usos: 0 })))
            notificar('Se crearon los cupones BIENVENIDO15, MISION10 y FRECUENTE20.', 'exito')
            cargar()
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudieron crear los cupones: ' + fallo.message, 'error')
        }
    }

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault()
        const datos = Object.fromEntries(new FormData(formulario))
        const codigo = datos.codigo.trim().toUpperCase()
        const editando = formulario.elements.codigo.readOnly
        if (!editando && lista.some(cupon => cupon.id === codigo)) {
            notificar('Ya existe un cupón con el código ' + codigo + '.', 'advertencia')
            return
        }
        const cupon = {
            codigo,
            descripcion: datos.descripcion.trim(),
            descuento: Number(datos.descuento),
            condicion: datos.condicion,
            vencimiento: datos.vencimiento || null,
            usosMaximos: Number(datos.usosMaximos) || 0
        }
        try {
            await guardarDocumento('cupones', codigo, editando ? cupon : { ...cupon, usos: 0, activo: true })
            formulario.reset()
            notificar(editando ? 'Cupón actualizado.' : 'Cupón ' + codigo + ' creado.', 'exito')
            cargar()
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo guardar el cupón: ' + fallo.message, 'error')
        }
    })

    tabla.addEventListener('click', async evento => {
        const boton = evento.target.closest('button')
        if (!boton) return
        const cupon = lista.find(item => item.id === (boton.dataset.editar || boton.dataset.alternar || boton.dataset.borrar))
        if (!cupon) return
        try {
            if (boton.dataset.editar) {
                ['descripcion', 'descuento', 'condicion', 'usosMaximos'].forEach(campo => { formulario.elements[campo].value = cupon[campo] ?? '' })
                formulario.elements.codigo.value = cupon.id
                formulario.elements.vencimiento.value = cupon.vencimiento || ''
                modoEdicion(true)
                formulario.scrollIntoView({ behavior: 'smooth' })
                return
            }
            if (boton.dataset.alternar) {
                await actualizar('cupones', cupon.id, { activo: !cupon.activo })
                notificar('Cupón ' + cupon.id + (cupon.activo ? ' pausado.' : ' activado.'), 'exito')
            } else {
                if (!await confirmar('¿Eliminar el cupón ' + cupon.id + '?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return
                await eliminar('cupones', cupon.id)
                notificar('Cupón eliminado.', 'exito')
            }
            cargar()
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo completar la acción: ' + fallo.message, 'error')
        }
    })

    cargar()
}

const ESTADOS_RESERVA = { pendiente: 'Pendiente de pago', pagado: 'Pagada', usada: 'Entrada usada' }
const ESTADOS_EVENTO = { pendiente: 'Pendiente', confirmado: 'Confirmado', rechazado: 'Rechazado' }

function panelReservas(elemento) {
    elemento.innerHTML = `
        <h1 class="text-white">Administración de reservas y ventas</h1>

        <section class="glass p-4 mb-4" aria-labelledby="tituloValidar">
            <h2 class="h4 text-white" id="tituloValidar">🎟️ Validar entrada</h2>
            <p class="text-white-50">Escanea el código QR de la entrada del cliente o escribe su código de 8 caracteres.</p>
            <div class="row g-3">
                <div class="col-12 col-lg-6">
                    <div id="lectorQR" class="rounded overflow-hidden" style="max-width: 420px"></div>
                    <div class="d-flex flex-wrap gap-2 mt-2">
                        <button type="button" class="btn btn-warning" id="iniciarCamara">📷 Escanear con la cámara</button>
                        <button type="button" class="btn btn-outline-light d-none" id="detenerCamara">Detener cámara</button>
                    </div>
                </div>
                <div class="col-12 col-lg-6">
                    <form class="d-flex gap-2" id="formCodigo">
                        <label class="visually-hidden" for="codigoEntrada">Código de entrada</label>
                        <input class="form-control text-uppercase" id="codigoEntrada" placeholder="Ej. 7F3KQ9ZD" autocomplete="off" required>
                        <button class="btn btn-outline-info text-nowrap">Validar</button>
                    </form>
                    <div id="resultadoValidacion" class="mt-3" aria-live="assertive"></div>
                </div>
            </div>
        </section>

        <section class="glass p-4 mb-4">
            <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2">
                <h2 class="h4 text-white m-0">Reservas</h2>
                <select class="form-select w-auto" id="filtroReservas" aria-label="Filtrar reservas por estado">
                    <option value="">Todas</option>
                    <option value="pendiente">Pendientes de pago</option>
                    <option value="pagado">Pagadas</option>
                    <option value="usada">Entrada usada</option>
                </select>
            </div>
            <div class="table-responsive"><table class="table table-dark"><thead><tr><th>Código</th><th>Cliente</th><th>Correo</th><th>Visita</th><th>Entradas</th><th>Total</th><th>Estado</th><th>Pago</th></tr></thead><tbody id="tablaReservas"><tr><td colspan="8">Cargando...</td></tr></tbody></table></div>
        </section>

        <section class="glass p-4" id="eventos">
            <h2 class="h4 text-white">🎂 Solicitudes de cumpleaños y eventos</h2>
            <div class="table-responsive"><table class="table table-dark"><thead><tr><th>Evento</th><th>Fecha</th><th>Niños</th><th>Paquete</th><th>Contacto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tablaEventos"><tr><td colspan="7">Cargando...</td></tr></tbody></table></div>
        </section>`

    let reservas = []
    let transacciones = []
    const tabla = document.getElementById('tablaReservas')
    const filtro = document.getElementById('filtroReservas')
    const resultado = document.getElementById('resultadoValidacion')

    const codigoDe = id => id.slice(-8).toUpperCase()
    const dibujarReservas = () => {
        const visibles = reservas
            .filter(reserva => !filtro.value || (reserva.estado || 'pendiente') === filtro.value)
            .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
        tabla.innerHTML = visibles.length ? visibles.map(reserva => {
            const pago = transacciones.find(item => item.reservaId === reserva.id)
            return `<tr>
                <td><code>${codigoDe(reserva.id)}</code></td>
                <td>${escapar(reserva.nombre)}</td>
                <td>${escapar(reserva.correo)}</td>
                <td>${escapar(reserva.fecha)}</td>
                <td>${reserva.entradas || (reserva.items || []).length}</td>
                <td>${formatearPrecio(reserva.total)}${reserva.cupon ? `<div class="small text-white-50">Cupón ${escapar(reserva.cupon)}</div>` : ''}</td>
                <td>${escapar(ESTADOS_RESERVA[reserva.estado] || reserva.estado || 'Pendiente de pago')}${reserva.usadaEn ? `<div class="small text-white-50">${escapar(fechaLegible(reserva.usadaEn))}</div>` : ''}</td>
                <td>${pago ? `${escapar(pago.tarjeta ? pago.tarjeta.marca + ' •••• ' + pago.tarjeta.ultimos4 : 'Validada')}${pago.codigoAutorizacion ? `<div class="small text-white-50">Aut. ${escapar(pago.codigoAutorizacion)}</div>` : ''}` : '—'}</td>
            </tr>`
        }).join('') : '<tr><td colspan="8">No hay reservas con este filtro.</td></tr>'
    }
    filtro.onchange = dibujarReservas

    const cargarReservas = () => Promise.all([listar('reservas'), listar('transacciones')]).then(([lista, pagos]) => {
        reservas = lista
        transacciones = pagos
        dibujarReservas()
    }).catch(errorDeCarga)

    // Muestra el resultado de la validación en una tarjeta con el color del mensaje.
    const mostrarResultado = (tipo, titulo, detalle) => {
        resultado.innerHTML = `<div class="mensajeCaja mensaje-${tipo} mw-100 text-start p-3"><h3 class="mensajeTitulo h5 text-start">${titulo}</h3><div class="mensajeTexto">${detalle}</div></div>`
    }

    // Valida por id completo (QR) o por los últimos 8 caracteres (código escrito).
    let validando = false
    const validarEntrada = async texto => {
        if (validando) return
        validando = true
        try {
            const limpio = String(texto || '').trim().replace(PREFIJO_QR, '')
            await cargarReservas()
            const reserva = reservas.find(item => item.id === limpio) || reservas.find(item => codigoDe(item.id) === limpio.toUpperCase())
            if (!reserva) return mostrarResultado('error', '✕ Entrada no encontrada', `No existe una reserva con el código <strong>${escapar(limpio)}</strong>.`)

            const datos = `<strong>${escapar(reserva.nombre)}</strong> · ${reserva.entradas || (reserva.items || []).length} entrada(s) · visita ${escapar(reserva.fecha)} · código ${codigoDe(reserva.id)}`
            if (!reserva.pagado) return mostrarResultado('error', '✕ Entrada no pagada', datos + '<br>La reserva sigue pendiente de pago.')
            if (reserva.estado === 'usada') return mostrarResultado('advertencia', '! Entrada ya usada', datos + '<br>Se usó el ' + escapar(fechaLegible(reserva.usadaEn)) + '.')

            const hoy = fechaLocal()
            if (reserva.fecha !== hoy && !await confirmar('Esta entrada es para el ' + reserva.fecha + ' (hoy es ' + hoy + '). ¿Dejar pasar de todos modos?', { textoConfirmar: 'Validar igual' })) {
                return mostrarResultado('advertencia', '! Fecha distinta', datos + '<br>No se validó.')
            }

            const entregados = await validarYDescontarStock(reserva)
            mostrarResultado('exito', '✓ Entrada válida — puede pasar', datos + (entregados.length ? '<br>Entregar del bazar: ' + entregados.map(escapar).join(', ') + '. Stock actualizado.' : ''))
            cargarReservas()
        } catch (fallo) {
            console.error(fallo)
            mostrarResultado('error', '✕ No se pudo validar', escapar(fallo.message))
        } finally {
            validando = false
        }
    }

    document.getElementById('formCodigo').addEventListener('submit', evento => {
        evento.preventDefault()
        const campo = document.getElementById('codigoEntrada')
        validarEntrada(campo.value)
        campo.value = ''
    })

    // Lector de QR con la cámara (html5-qrcode). Tras leer un código hace una pausa
    // breve para no validar la misma entrada varias veces seguidas.
    let lector = null
    const botonIniciar = document.getElementById('iniciarCamara')
    const botonDetener = document.getElementById('detenerCamara')
    const detener = async () => {
        if (lector?.isScanning) await lector.stop().catch(console.error)
        botonIniciar.classList.remove('d-none')
        botonDetener.classList.add('d-none')
    }
    botonIniciar.onclick = async () => {
        try {
            await cargarScript('https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js')
            lector ||= new window.Html5Qrcode('lectorQR')
            let ultimo = ''
            await lector.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, texto => {
                if (texto === ultimo) return
                ultimo = texto
                setTimeout(() => { ultimo = '' }, 4000)
                validarEntrada(texto)
            })
            botonIniciar.classList.add('d-none')
            botonDetener.classList.remove('d-none')
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo abrir la cámara. Revisa los permisos del navegador o escribe el código a mano.', 'error')
        }
    }
    botonDetener.onclick = detener
    window.addEventListener('pagehide', detener)

    // Eventos: el admin confirma o rechaza; el cliente ve el estado en su página.
    const tablaEventos = document.getElementById('tablaEventos')
    let eventos = []
    const cargarEventos = () => listar('eventos', 'fecha').then(lista => {
        eventos = lista
        tablaEventos.innerHTML = lista.length ? lista.map(evento => `<tr>
            <td><strong>${escapar(evento.cumpleanero)}</strong>${evento.edad ? ` (${escapar(evento.edad)} años)` : ''}${evento.comentarios ? `<div class="small text-white-50">${escapar(evento.comentarios)}</div>` : ''}</td>
            <td>${escapar(evento.fecha)} ${escapar(evento.hora)}</td>
            <td>${escapar(evento.ninos)}</td>
            <td>${escapar(evento.paquete)}<div class="small text-white-50">Est. ${formatearPrecio(evento.estimado)}</div></td>
            <td>${escapar(evento.nombre)}<div class="small"><a class="link-info" href="tel:${escapar(evento.telefono)}">${escapar(evento.telefono)}</a> · <a class="link-info" href="mailto:${escapar(evento.correo)}">${escapar(evento.correo)}</a></div></td>
            <td>${escapar(ESTADOS_EVENTO[evento.estado] || evento.estado)}</td>
            <td><div class="d-flex flex-wrap gap-2">
                ${evento.estado !== 'confirmado' ? `<button class="btn btn-sm btn-outline-success" data-estado="confirmado" data-id="${evento.id}">Confirmar</button>` : ''}
                ${evento.estado !== 'rechazado' ? `<button class="btn btn-sm btn-outline-warning" data-estado="rechazado" data-id="${evento.id}">Rechazar</button>` : ''}
                <button class="btn btn-sm btn-outline-danger" data-borrar="${evento.id}">Eliminar</button>
            </div></td></tr>`).join('') : '<tr><td colspan="7">Aún no hay solicitudes.</td></tr>'
    }).catch(errorDeCarga)

    tablaEventos.addEventListener('click', async evento => {
        const boton = evento.target.closest('button')
        if (!boton) return
        const solicitud = eventos.find(item => item.id === (boton.dataset.id || boton.dataset.borrar))
        try {
            if (boton.dataset.estado) {
                await actualizar('eventos', solicitud.id, { estado: boton.dataset.estado })
                const confirmado = boton.dataset.estado === 'confirmado'
                enviarCorreo({
                    para: solicitud.correo,
                    nombre: solicitud.nombre,
                    asunto: (confirmado ? 'Evento confirmado' : 'Sobre tu solicitud de evento') + ' — Star Park',
                    mensaje: confirmado
                        ? '¡Tu ' + solicitud.paquete + ' para ' + solicitud.cumpleanero + ' el ' + solicitud.fecha + ' a las ' + solicitud.hora + ' está confirmado! Te esperamos.'
                        : 'Lamentamos informarte que no tenemos disponibilidad para tu evento del ' + solicitud.fecha + '. Escríbenos para buscar otra fecha.'
                })
                notificar('Solicitud marcada como "' + ESTADOS_EVENTO[boton.dataset.estado] + '".', 'exito')
            } else if (boton.dataset.borrar) {
                if (!await confirmar('¿Eliminar esta solicitud?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return
                await eliminar('eventos', solicitud.id)
                notificar('Solicitud eliminada.', 'exito')
            }
            cargarEventos()
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo completar la acción: ' + fallo.message, 'error')
        }
    })

    cargarReservas()
    cargarEventos()
    if (window.location.hash === '#eventos') document.getElementById('eventos').scrollIntoView()
}

// Contenido institucional: edita en tiempo real lo que se ve en users/index.html.
// Atracciones y servicios son listas (agregar / editar / eliminar); ubicación,
// horarios y contacto son campos fijos que solo se editan.

const CAMPOS_ATRACCION = [
    { name: 'nombre', label: 'Nombre', mayus: true },
    { name: 'etiqueta', label: 'Etiqueta (ej. INFANTIL)', mayus: true },
    { name: 'descripcion', label: 'Descripción', area: true },
    { name: 'imagen', label: 'Imagen de la atracción', imagen: 'atraccion' }
]

const CAMPOS_SERVICIO = [
    { name: 'nombre', label: 'Nombre', mayus: true },
    { name: 'descripcion', label: 'Descripción (una línea por viñeta si quieres una lista)', area: true },
    { name: 'imagen', label: 'Imagen del servicio', imagen: 'servicio' }
]

// Botones con roles distintos para no confundirlos:
//  "+ Nueva atracción" (celeste, borde): solo abre el formulario vacío.
//  "Añadir a la lista" / "Guardar cambios" (amarillo, sólido): guarda en Firestore.
function seccionLista(contenedor, { coleccion, titulo, nuevo, campos, iniciales, subtitulo }) {
    const campoHtml = campo => {
        if (campo.imagen) return `<div class="col-12">${campoImagen(campo.imagen, campo.label)}</div>`
        const atributos = `class="form-control" name="${campo.name}" ${campo.requerido === false ? '' : 'required'} ${campo.mayus ? 'data-mayus' : ''}`
        const control = campo.area ? `<textarea ${atributos} rows="3"></textarea>` : `<input ${atributos}>`
        return `<div class="col-12 col-md-6"><label class="text-white w-100">${campo.label}${control}</label></div>`
    }

    contenedor.innerHTML = `
        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
            <h2 class="h4 text-white m-0">${titulo}</h2>
            <button type="button" class="btn btn-outline-info" data-nuevo>+ ${nuevo}</button>
        </div>
        <form class="formularioLista p-3 mb-4 d-none" data-form>
            <h3 class="h6 text-white mb-3" data-titulo-form></h3>
            <input type="hidden" name="id">
            <div class="row g-3">${campos.map(campoHtml).join('')}</div>
            <div class="mt-3 d-flex flex-wrap gap-2 align-items-center">
                <button class="btn btn-warning" data-guardar></button>
                <button type="button" class="btn btn-outline-light" data-cancelar>Cancelar</button>
            </div>
        </form>
        <div data-lista><p class="text-white-50">Cargando...</p></div>`

    const formulario = contenedor.querySelector('[data-form]')
    const lista = contenedor.querySelector('[data-lista]')
    let items = []
    const campoDeImagen = campos.find(campo => campo.imagen)
    const mostrarImagen = campoDeImagen ? activarCampoImagen(formulario, campoDeImagen.imagen) : null

    const abrirFormulario = item => {
        formulario.reset()
        formulario.elements.id.value = item ? item.id : ''
        if (item) campos.forEach(campo => { formulario.elements[campo.name].value = item[campo.name] || '' })
        mostrarImagen?.(item?.imagen)
        formulario.querySelector('[data-titulo-form]').textContent = item ? 'Editando: ' + item.nombre : nuevo
        formulario.querySelector('[data-guardar]').textContent = item ? 'Guardar cambios' : 'Añadir a la lista'
        formulario.classList.remove('d-none')
        formulario.elements.nombre.focus()
    }
    const cerrarFormulario = () => { formulario.reset(); formulario.classList.add('d-none') }

    const dibujar = () => {
        if (!items.length) {
            lista.innerHTML = `<p class="text-white-50">Aún no hay elementos. Lo que agregues aparecerá en el index.</p><button type="button" class="btn btn-outline-info btn-sm" data-importar>Importar los ${iniciales.length} actuales del index</button>`
            return
        }
        lista.innerHTML = items.map(item => `
            <div class="d-flex align-items-center gap-3 border-bottom py-2">
                ${item.imagen ? `<img src="${escapar(item.imagen)}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:6px">` : ''}
                <div class="flex-grow-1 text-white">
                    <strong>${escapar(item.nombre)}</strong>${subtitulo && item[subtitulo] ? ` <span class="badge text-bg-info">${escapar(item[subtitulo])}</span>` : ''}
                    <div class="small text-white-50">${escapar((item.descripcion || '').split('\n').join(' · '))}</div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-info" data-edit="${item.id}">Editar</button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-delete="${item.id}">Borrar</button>
            </div>`).join('')
    }

    escuchar(coleccion, docs => {
        items = docs.sort((a, b) => (a.orden || 0) - (b.orden || 0))
        dibujar()
    }, errorDeCarga)

    contenedor.querySelector('[data-nuevo]').onclick = () => abrirFormulario(null)
    contenedor.querySelector('[data-cancelar]').onclick = cerrarFormulario

    // Nombre y etiqueta siempre en mayúsculas, mientras se escribe.
    formulario.addEventListener('input', evento => {
        const campo = evento.target
        if (!('mayus' in campo.dataset)) return
        const posicion = campo.selectionStart
        campo.value = campo.value.toLocaleUpperCase('es')
        campo.setSelectionRange(posicion, posicion)
    })

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault()
        const datos = Object.fromEntries(new FormData(formulario))
        const id = datos.id
        delete datos.id
        campos.forEach(campo => {
            datos[campo.name] = String(datos[campo.name] || '').trim()
            if (campo.mayus) datos[campo.name] = datos[campo.name].toLocaleUpperCase('es')
        })
        try {
            if (id) await actualizar(coleccion, id, datos)
            else await crear(coleccion, { ...datos, orden: Date.now() })
            cerrarFormulario()
            notificar(id ? 'Cambios guardados. Ya se ven en el index.' : 'Se añadió a la lista. Ya se ve en el index.', 'exito')
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo guardar: ' + fallo.message, 'error')
        }
    })

    lista.addEventListener('click', async evento => {
        const boton = evento.target.closest('button')
        if (!boton) return
        try {
            if (boton.dataset.edit) abrirFormulario(items.find(item => item.id === boton.dataset.edit))
            else if (boton.dataset.delete) {
                if (!await confirmar('¿Borrar este elemento del index?', { textoConfirmar: 'Borrar', tipo: 'error' })) return
                await eliminar(coleccion, boton.dataset.delete)
                notificar('Elemento borrado del index.', 'exito')
            }
            else if (boton.hasAttribute('data-importar')) {
                const base = Date.now()
                await Promise.all(iniciales.map((item, indice) => crear(coleccion, { ...item, orden: base + indice })))
                notificar('Elementos importados. Ya se ven en el index.', 'exito')
            }
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo completar la acción: ' + fallo.message, 'error')
        }
    })
}

function panelContenido(elemento) {
    elemento.innerHTML = `
        <h1 class="text-white">Contenido institucional</h1>
        <p class="text-white-50">Los cambios se reflejan al instante en el index.</p>
        <section class="glass p-4 mb-4" id="seccionAtracciones"></section>
        <section class="glass p-4 mb-4" id="seccionServicios"></section>
        <section class="glass p-4 mb-4">
            <h2 class="h4 text-white mb-3">UBICACIÓN, HORARIOS Y CONTACTO</h2>
            <form id="formContenido">
                <label class="text-white w-100 mb-3">Ubicación<textarea class="form-control" name="ubicacion" rows="2" required></textarea></label>
                <label class="text-white w-100 mb-3">Horario<textarea class="form-control" name="horarios" rows="2" required></textarea></label>
                <label class="text-white w-100 mb-3">Teléfono de contacto<input class="form-control" name="contacto" type="tel" placeholder="064 123456 o 987654321"></label>
                <label class="text-white w-100 mb-3">WhatsApp (9 dígitos; si se deja vacío se usa el teléfono)<input class="form-control" name="whatsapp" type="tel" inputmode="numeric" pattern="\\d{9}" placeholder="987654321"></label>
                <label class="text-white w-100 mb-3">Correo de contacto<input class="form-control" name="correo" type="email" placeholder="contacto@starpark.pe"></label>
                <button class="btn btn-warning">Guardar cambios</button>
            </form>
        </section>`

    seccionLista(document.getElementById('seccionAtracciones'), {
        coleccion: 'atracciones', titulo: 'ATRACCIONES', nuevo: 'Nueva atracción',
        campos: CAMPOS_ATRACCION, iniciales: ATRACCIONES_INICIALES, subtitulo: 'etiqueta'
    })
    seccionLista(document.getElementById('seccionServicios'), {
        coleccion: 'servicios', titulo: 'SERVICIOS', nuevo: 'Nuevo servicio',
        campos: CAMPOS_SERVICIO, iniciales: SERVICIOS_INICIALES
    })

    const formulario = document.getElementById('formContenido')
    obtenerDocumento('contenido', 'institucional').then(guardado => {
        const valores = { ...CONTENIDO_INICIAL, ...guardado }
        Object.keys(CONTENIDO_INICIAL).forEach(clave => { formulario.elements[clave].value = valores[clave] })
    }).catch(errorDeCarga)

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault()
        const datos = Object.fromEntries(new FormData(formulario))
        try {
            await guardarDocumento('contenido', 'institucional', datos)
            notificar('Guardado. Ya se ve en el index.', 'exito')
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo guardar: ' + fallo.message, 'error')
        }
    })
}

function panelUsuarios(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Control de usuarios y roles</h1><div class="glass p-4"><div class="table-responsive"><table class="table table-dark"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr></thead><tbody id="tablaUsuarios"></tbody></table></div></div>`
    const tabla = document.getElementById('tablaUsuarios')
    // El selector funciona en ambos sentidos (admin ↔ cliente), salvo en la fila del
    // propio administrador: no puede quitarse su rol (también lo impiden las reglas de Firestore).
    const filaUsuario = usuario => {
        const esPropio = usuario.id === auth.currentUser.uid
        const selector = `<select class="form-select form-select-sm" data-role="${usuario.id}" ${esPropio ? 'disabled title="No puedes cambiar tu propio rol"' : ''} aria-label="Rol de ${escapar(usuario.correo)}"><option value="admin" ${usuario.rol === 'admin' ? 'selected' : ''}>admin</option><option value="cliente" ${usuario.rol !== 'admin' ? 'selected' : ''}>cliente</option></select>`
        return `<tr><td>${escapar(usuario.nombreCompleto || usuario.nombreUsuario)}${esPropio ? ' <span class="badgeTu">tú</span>' : ''}</td><td>${escapar(usuario.correo)}</td><td>${selector}${esPropio ? '<div class="small text-white-50 mt-1">No puedes quitarte tu propio rol.</div>' : ''}</td><td>${usuario.rol === 'admin' ? '' : botonAccion('usuarios', usuario.id)}</td></tr>`
    }
    let lista = []
    const cargar = () => listar('usuarios').then(usuarios => { lista = usuarios; tabla.innerHTML = usuarios.map(filaUsuario).join('') }).catch(errorDeCarga)
    // Las cuentas creadas antes del login por nombre de usuario aún no lo tienen
    // registrado: se completa aquí para que todas puedan entrar con él.
    listar('usuarios').then(usuarios => Promise.allSettled(usuarios.map(usuario => asegurarNombreUsuario(usuario.id, usuario))))
        .catch(fallo => console.error('No se pudieron registrar los nombres de usuario:', fallo))
    // Cambiar un rol da o quita acceso al panel, así que siempre se confirma.
    tabla.addEventListener('change', async evento => {
        if (!evento.target.dataset.role) return
        const nuevoRol = evento.target.value
        if (evento.target.dataset.role === auth.currentUser.uid) { cargar(); return }
        const pregunta = nuevoRol === 'admin'
            ? '¿Dar acceso de administrador a este usuario? Podrá modificar todo el sitio.'
            : '¿Quitar el acceso de administrador a este usuario? Pasará a ser cliente.'
        if (!await confirmar(pregunta, { textoConfirmar: 'Cambiar rol', tipo: 'advertencia' })) { cargar(); return }
        try {
            await actualizar('usuarios', evento.target.dataset.role, { rol: nuevoRol })
            notificar('Rol actualizado a "' + nuevoRol + '".', 'exito')
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo cambiar el rol: ' + fallo.message, 'error')
        }
        cargar()
    })
    tabla.addEventListener('click', async evento => { const boton = evento.target.closest('[data-delete]'); if (!boton || !await confirmar('¿Eliminar este perfil?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return; try { const usuario = lista.find(item => item.id === boton.dataset.id); await eliminar('usuarios', boton.dataset.id); if (usuario?.nombreUsuario) await eliminar('nombresUsuario', usuario.nombreUsuario.trim().toLowerCase()).catch(console.error); notificar('Perfil eliminado.', 'exito') } catch (fallo) { console.error(fallo); notificar('No se pudo eliminar el perfil: ' + fallo.message, 'error') } cargar() })
    cargar()
}

function panelPerfil(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Perfil y configuración</h1>
        <div class="glass p-4">
            <p class="text-white" id="correoAdmin"></p>
            <form class="formularioLista p-3 mb-3" id="formFoto">
                ${campoImagen('perfil', 'Foto de perfil')}
                <button class="btn btn-warning mt-3">Guardar foto</button>
            </form>
            <button class="btn btn-warning" id="cerrarSesion">Cerrar sesión</button>
        </div>`
    document.getElementById('correoAdmin').textContent = auth.currentUser.email
    document.getElementById('cerrarSesion').onclick = cerrarSesionAdmin

    const formulario = document.getElementById('formFoto')
    const mostrarImagen = activarCampoImagen(formulario, 'perfil')
    obtenerPerfil(auth.currentUser.uid).then(perfil => mostrarImagen(perfil?.foto)).catch(errorDeCarga)
    formulario.addEventListener('submit', async evento => {
        evento.preventDefault()
        try {
            await actualizar('usuarios', auth.currentUser.uid, { foto: formulario.elements.imagen.value })
            notificar(formulario.elements.imagen.value ? 'Foto de perfil guardada.' : 'Foto de perfil quitada.', 'exito')
        } catch (fallo) {
            console.error(fallo)
            notificar('No se pudo guardar la foto: ' + fallo.message, 'error')
        }
    })
}

// Durante un cierre de sesión voluntario, la redirección la hace el botón (con su mensaje).
let cerrandoSesion = false

onAuthStateChanged(auth, async usuario => {
    if (cerrandoSesion) return
    if (!usuario) { window.location.href = 'admin.html'; return }
    const perfil = await getDoc(doc(db, 'usuarios', usuario.uid))
    if (!perfil.exists() || perfil.data().rol !== 'admin') {
        await signOut(auth)
        notificarAlCargar('Esta cuenta no tiene permisos de administrador.', 'error')
        window.location.href = 'admin.html'
        return
    }
    mostrarShell()
})
