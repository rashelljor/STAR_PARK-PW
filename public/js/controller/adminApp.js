import { auth, db } from '../config/firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import HeaderAdmin from '../components/HeaderAdmin.js'
import { crear, actualizar, eliminar, listar, escuchar, obtenerDocumento, guardarDocumento } from '../services/adminService.js'
import { CONTENIDO_INICIAL, ATRACCIONES_INICIALES, SERVICIOS_INICIALES, PRODUCTOS_INICIALES } from '../utils/contenidoInicial.js'
import { notificar, confirmar, notificarAlCargar } from '../utils/notificaciones.js'

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

    // En tablet y celular el menú lateral se abre con el botón ☰.
    const sidebar = document.getElementById('adminSidebar')
    const botonMenu = document.getElementById('adminMenuBoton')
    const alternarMenu = abrir => {
        sidebar.classList.toggle('abierto', abrir)
        botonMenu.setAttribute('aria-expanded', String(abrir))
    }
    botonMenu.onclick = () => alternarMenu(!sidebar.classList.contains('abierto'))
    document.getElementById('adminSidebarFondo').onclick = () => alternarMenu(false)
    document.addEventListener('keydown', evento => { if (evento.key === 'Escape') alternarMenu(false) })

    // "Cerrar sesión" está en la barra superior y en el menú lateral, siempre visible.
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

// Los totales se guardan como texto ("S/ 50.00"); se convierten a número para sumarlos.
function montoDe(total) {
    return Number(String(total || '').replace(/[^\d.]/g, '')) || 0
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
        <div class="glass p-4 mt-4"><h2>Ventas y aforo</h2><p>Las alertas y notificaciones estarán disponibles en una próxima actualización.</p><canvas id="graficoVentas" height="100"></canvas></div>`

    const escribir = (id, valor, detalle) => {
        document.getElementById('kpi' + id).textContent = valor
        document.getElementById('kpi' + id + 'Detalle').textContent = detalle
    }

    Promise.all([listar('reservas'), listar('transacciones'), listar('usuarios'), listar('productos')]).then(([reservas, ventas, usuarios, productos]) => {
        const pendientes = reservas.filter(reserva => !reserva.pagado).length
        const ingresos = ventas.reduce((suma, venta) => suma + montoDe(venta.total), 0)
        const clientes = usuarios.filter(usuario => usuario.rol !== 'admin').length
        const promociones = productos.filter(producto => producto.categoria === 'promociones').length

        escribir('Reservas', reservas.length, pendientes + (pendientes === 1 ? ' pendiente de pago' : ' pendientes de pago'))
        escribir('Ventas', ventas.length, 'S/ ' + ingresos.toFixed(2) + ' en ingresos')
        escribir('Clientes', clientes, (usuarios.length - clientes) + ' administradores')
        escribir('Productos', productos.length, promociones + ' promociones activas')
    }).catch(errorDeCarga)
}

function panelCatalogo(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Gestión de catálogo y promociones</h1><form id="formCatalogo" class="glass p-4 mb-4"><input type="hidden" name="id"><div class="row g-2"><div class="col-md-3"><input class="form-control" name="nombre" placeholder="Nombre" required></div><div class="col-md-3"><input class="form-control" name="descripcion" placeholder="Descripción" required></div><div class="col-md-2"><select class="form-select" name="categoria"><option value="promociones">Promoción</option><option value="botin">Botín (ticket individual)</option></select></div><div class="col-md-2"><input class="form-control" name="precio" type="number" min="0" step="0.01" placeholder="Precio" required></div><div class="col-md-2"><input class="form-control" name="imagen" placeholder="URL de imagen"></div></div><div class="mt-3 d-flex flex-wrap gap-2"><button class="btn btn-warning" id="guardarCatalogo">Agregar producto</button> <button type="button" class="btn btn-outline-light" id="limpiarCatalogo">Limpiar</button></div></form><div class="glass p-4"><div class="table-responsive"><table class="table table-dark"><thead><tr><th>Nombre</th><th>Tipo</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tablaCatalogo"></tbody></table></div><button type="button" class="btn btn-outline-info btn-sm d-none" id="importarCatalogo">Importar los productos actuales de la tienda</button></div>`
    const formulario = document.getElementById('formCatalogo')
    const tabla = document.getElementById('tablaCatalogo')
    const importar = document.getElementById('importarCatalogo')
    // El botón dice qué va a pasar: agregar uno nuevo o guardar el que se está editando.
    const botonGuardar = document.getElementById('guardarCatalogo')
    const modoEdicion = editando => { botonGuardar.textContent = editando ? 'Guardar cambios' : 'Agregar producto' }
    // reset() no vacía los input hidden: sin esto, tras editar un producto, el
    // siguiente "nuevo" sobrescribía al editado.
    formulario.addEventListener('reset', () => { formulario.elements.id.value = ''; modoEdicion(false) })
    importar.onclick = async () => { try { await Promise.all(PRODUCTOS_INICIALES.map(({ id, ...producto }) => crear('productos', producto))); await cargar(); notificar('Productos importados al catálogo.', 'exito') } catch (fallo) { console.error(fallo); notificar('No se pudieron importar los productos: ' + fallo.message, 'error') } }
    const cargar = () => listar('productos').then(productos => { importar.classList.toggle('d-none', productos.length > 0); tabla.innerHTML = productos.map(producto => `<tr><td>${escapar(producto.nombre)}</td><td>${escapar(producto.categoria)}</td><td>S/ ${Number(producto.precio || 0).toFixed(2)}</td><td>${escapar(producto.estado || 'Activo')}</td><td><div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-outline-info" data-edit="${producto.id}">Editar</button> ${botonAccion('productos', producto.id)} <a class="btn btn-sm btn-outline-warning" href="../users/tienda.html#producto-${producto.id}" target="_blank" rel="noopener" title="Abre la tienda en una pestaña nueva, en este producto">Ver en tienda ↗</a></div></td></tr>`).join('') }).catch(errorDeCarga)
    formulario.addEventListener('submit', async evento => { evento.preventDefault(); const datos = Object.fromEntries(new FormData(formulario)); datos.precio = Number(datos.precio); datos.estado = 'Activo'; const id = datos.id; delete datos.id; try { id ? await actualizar('productos', id, datos) : await crear('productos', datos); formulario.reset(); await cargar(); notificar(id ? 'Producto actualizado.' : 'Producto agregado al catálogo.', 'exito') } catch (fallo) { console.error(fallo); notificar('No se pudo guardar el producto: ' + fallo.message, 'error') } })
    document.getElementById('limpiarCatalogo').onclick = () => formulario.reset()
    tabla.addEventListener('click', async evento => { const boton = evento.target.closest('[data-delete], [data-edit]'); if (!boton) return; if (boton.dataset.delete) { if (!await confirmar('¿Eliminar este producto del catálogo?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return; try { await eliminar(boton.dataset.delete, boton.dataset.id); notificar('Producto eliminado.', 'exito') } catch (fallo) { console.error(fallo); notificar('No se pudo eliminar el producto: ' + fallo.message, 'error') } } else { const producto = (await listar('productos')).find(item => item.id === boton.dataset.edit); Object.entries(producto).forEach(([clave, valor]) => { if (formulario.elements[clave]) formulario.elements[clave].value = valor }); modoEdicion(true); formulario.scrollIntoView({ behavior: 'smooth' }) } await cargar() })
    cargar()
}

function panelReservas(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Administración de reservas y ventas</h1><div class="glass p-4"><div class="table-responsive"><table class="table table-dark"><thead><tr><th>Cliente</th><th>Correo</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Validación</th></tr></thead><tbody id="tablaReservas"></tbody></table></div></div>`
    Promise.all([listar('reservas'), listar('transacciones')]).then(([reservas, transacciones]) => { document.getElementById('tablaReservas').innerHTML = reservas.map(reserva => `<tr><td>${escapar(reserva.nombre)}</td><td>${escapar(reserva.correo)}</td><td>${escapar(reserva.fecha)}</td><td>${escapar(reserva.total)}</td><td>${escapar(reserva.estado || 'pendiente')}</td><td>${transacciones.some(item => item.reservaId === reserva.id) ? 'Validada' : 'Pendiente'}</td></tr>`).join('') }).catch(errorDeCarga)
}

// Contenido institucional: edita en tiempo real lo que se ve en users/index.html.
// Atracciones y servicios son listas (agregar / editar / eliminar); ubicación,
// horarios y contacto son campos fijos que solo se editan.

const CAMPOS_ATRACCION = [
    { name: 'nombre', label: 'Nombre', mayus: true },
    { name: 'etiqueta', label: 'Etiqueta (ej. INFANTIL)', mayus: true },
    { name: 'descripcion', label: 'Descripción', area: true },
    { name: 'imagen', label: 'URL de imagen', requerido: false }
]

const CAMPOS_SERVICIO = [
    { name: 'nombre', label: 'Nombre', mayus: true },
    { name: 'descripcion', label: 'Descripción (una línea por viñeta si quieres una lista)', area: true },
    { name: 'imagen', label: 'URL de imagen', requerido: false }
]

// Botones con roles distintos para no confundirlos:
//  "+ Nueva atracción" (celeste, borde): solo abre el formulario vacío.
//  "Añadir a la lista" / "Guardar cambios" (amarillo, sólido): guarda en Firestore.
function seccionLista(contenedor, { coleccion, titulo, nuevo, campos, iniciales, subtitulo }) {
    const campoHtml = campo => {
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

    const abrirFormulario = item => {
        formulario.reset()
        formulario.elements.id.value = item ? item.id : ''
        if (item) campos.forEach(campo => { formulario.elements[campo.name].value = item[campo.name] || '' })
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
            <h2 class="h4 text-white mb-3">UBICACIÓN Y HORARIOS</h2>
            <form id="formContenido">
                <label class="text-white w-100 mb-3">Ubicación<textarea class="form-control" name="ubicacion" rows="2" required></textarea></label>
                <label class="text-white w-100 mb-3">Horario<textarea class="form-control" name="horarios" rows="2" required></textarea></label>
                <label class="text-white w-100 mb-3">Contacto<textarea class="form-control" name="contacto" rows="2" required></textarea></label>
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
    const cargar = () => listar('usuarios').then(usuarios => { tabla.innerHTML = usuarios.map(filaUsuario).join('') }).catch(errorDeCarga)
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
    tabla.addEventListener('click', async evento => { const boton = evento.target.closest('[data-delete]'); if (!boton || !await confirmar('¿Eliminar este perfil?', { textoConfirmar: 'Eliminar', tipo: 'error' })) return; try { await eliminar('usuarios', boton.dataset.id); notificar('Perfil eliminado.', 'exito') } catch (fallo) { console.error(fallo); notificar('No se pudo eliminar el perfil: ' + fallo.message, 'error') } cargar() })
    cargar()
}

function panelPerfil(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Perfil y configuración</h1><div class="glass p-4"><p class="text-white" id="correoAdmin"></p><button class="btn btn-warning" id="cerrarSesion">Cerrar sesión</button></div>`
    document.getElementById('correoAdmin').textContent = auth.currentUser.email
    document.getElementById('cerrarSesion').onclick = cerrarSesionAdmin
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
