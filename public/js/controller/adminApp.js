import { auth, db } from '../config/firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import HeaderAdmin from '../components/HeaderAdmin.js'
import { crear, actualizar, eliminar, listar, escuchar, obtenerDocumento, guardarDocumento } from '../services/adminService.js'
import { CONTENIDO_INICIAL, ATRACCIONES_INICIALES, SERVICIOS_INICIALES } from '../utils/contenidoInicial.js'

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

function mostrarShell() {
    app.innerHTML = HeaderAdmin.template + '<main class="container py-4" id="adminContent"></main>'
    document.getElementById('adminContent').innerHTML = '<p class="text-white">Cargando panel...</p>'
    const contenido = vistas[pagina]
    if (contenido) contenido(document.getElementById('adminContent'))
}

function botonAccion(coleccion, id, texto = 'Eliminar') {
    return `<button class="btn btn-sm btn-outline-danger" data-delete="${coleccion}" data-id="${id}">${texto}</button>`
}

function panelControl(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Panel de control</h1><p class="text-white-50">Resumen operativo de Star Park</p><div class="row g-3" id="metricas"><div class="col-md-3"><div class="glass p-4"><h2 id="mReservas">-</h2><p>Reservas</p></div></div><div class="col-md-3"><div class="glass p-4"><h2 id="mVentas">-</h2><p>Transacciones</p></div></div><div class="col-md-3"><div class="glass p-4"><h2 id="mUsuarios">-</h2><p>Clientes</p></div></div><div class="col-md-3"><div class="glass p-4"><h2 id="mProductos">-</h2><p>Productos</p></div></div></div><div class="glass p-4 mt-4"><h2>Ventas y aforo</h2><p>Las alertas y notificaciones estarán disponibles en una próxima actualización.</p><canvas id="graficoVentas" height="100"></canvas></div>`
    Promise.all([listar('reservas'), listar('transacciones'), listar('usuarios'), listar('productos')]).then(([reservas, ventas, usuarios, productos]) => {
        document.getElementById('mReservas').textContent = reservas.length
        document.getElementById('mVentas').textContent = ventas.length
        document.getElementById('mUsuarios').textContent = usuarios.length
        document.getElementById('mProductos').textContent = productos.length
    }).catch(error => console.error(error))
}

function panelCatalogo(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Gestión de catálogo y promociones</h1><form id="formCatalogo" class="glass p-4 mb-4"><input type="hidden" name="id"><div class="row g-2"><div class="col-md-3"><input class="form-control" name="nombre" placeholder="Nombre" required></div><div class="col-md-3"><input class="form-control" name="descripcion" placeholder="Descripción" required></div><div class="col-md-2"><select class="form-select" name="categoria"><option value="atraccion">Atracción</option><option value="tarifa">Tarifa</option><option value="pase">Pase especial</option><option value="promocion">Promoción</option></select></div><div class="col-md-2"><input class="form-control" name="precio" type="number" min="0" step="0.01" placeholder="Precio" required></div><div class="col-md-2"><input class="form-control" name="imagen" placeholder="URL de imagen"></div></div><div class="mt-3"><button class="btn btn-warning">Guardar</button> <button type="button" class="btn btn-outline-light" id="limpiarCatalogo">Limpiar</button></div></form><div class="glass p-4"><table class="table table-dark"><thead><tr><th>Nombre</th><th>Tipo</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tablaCatalogo"></tbody></table></div>`
    const formulario = document.getElementById('formCatalogo')
    const tabla = document.getElementById('tablaCatalogo')
    const cargar = () => listar('productos').then(productos => { tabla.innerHTML = productos.map(producto => `<tr><td>${escapar(producto.nombre)}</td><td>${escapar(producto.categoria)}</td><td>S/ ${Number(producto.precio || 0).toFixed(2)}</td><td>${escapar(producto.estado || 'Activo')}</td><td><button class="btn btn-sm btn-outline-info" data-edit="${producto.id}">Editar</button> ${botonAccion('productos', producto.id)}</td></tr>`).join('') })
    formulario.addEventListener('submit', async evento => { evento.preventDefault(); const datos = Object.fromEntries(new FormData(formulario)); datos.precio = Number(datos.precio); datos.estado = 'Activo'; const id = datos.id; delete datos.id; id ? await actualizar('productos', id, datos) : await crear('productos', datos); formulario.reset(); await cargar() })
    document.getElementById('limpiarCatalogo').onclick = () => formulario.reset()
    tabla.addEventListener('click', async evento => { const boton = evento.target.closest('[data-delete], [data-edit]'); if (!boton) return; if (boton.dataset.delete) { if (confirm('¿Eliminar este registro?')) await eliminar(boton.dataset.delete, boton.dataset.id) } else { const producto = (await listar('productos')).find(item => item.id === boton.dataset.edit); Object.entries(producto).forEach(([clave, valor]) => { if (formulario.elements[clave]) formulario.elements[clave].value = valor }) } await cargar() })
    cargar()
}

function panelReservas(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Administración de reservas y ventas</h1><div class="glass p-4"><table class="table table-dark"><thead><tr><th>Cliente</th><th>Correo</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Validación</th></tr></thead><tbody id="tablaReservas"></tbody></table></div>`
    Promise.all([listar('reservas'), listar('transacciones')]).then(([reservas, transacciones]) => { document.getElementById('tablaReservas').innerHTML = reservas.map(reserva => `<tr><td>${escapar(reserva.nombre)}</td><td>${escapar(reserva.correo)}</td><td>${escapar(reserva.fecha)}</td><td>${escapar(reserva.total)}</td><td>${escapar(reserva.estado || 'pendiente')}</td><td>${transacciones.some(item => item.reservaId === reserva.id) ? 'Validada' : 'Pendiente'}</td></tr>`).join('') })
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

function seccionLista(contenedor, { coleccion, titulo, textoAgregar, campos, iniciales, subtitulo }) {
    const campoHtml = campo => {
        const atributos = `class="form-control" name="${campo.name}" ${campo.requerido === false ? '' : 'required'} ${campo.mayus ? 'data-mayus' : ''}`
        const control = campo.area ? `<textarea ${atributos} rows="3"></textarea>` : `<input ${atributos}>`
        return `<div class="col-12 col-md-6"><label class="text-white w-100">${campo.label}${control}</label></div>`
    }

    contenedor.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h4 text-white m-0">${titulo}</h2>
            <button type="button" class="btn btn-warning" data-nuevo>${textoAgregar}</button>
        </div>
        <form class="border rounded p-3 mb-4 d-none" data-form>
            <input type="hidden" name="id">
            <div class="row g-3">${campos.map(campoHtml).join('')}</div>
            <div class="mt-3 d-flex gap-2 align-items-center">
                <button class="btn btn-warning">Guardar</button>
                <button type="button" class="btn btn-outline-light" data-cancelar>Cancelar</button>
                <span class="text-danger" data-error></span>
            </div>
        </form>
        <div data-lista><p class="text-white-50">Cargando...</p></div>`

    const formulario = contenedor.querySelector('[data-form]')
    const lista = contenedor.querySelector('[data-lista]')
    const error = contenedor.querySelector('[data-error]')
    let items = []

    const abrirFormulario = item => {
        formulario.reset()
        formulario.elements.id.value = item ? item.id : ''
        if (item) campos.forEach(campo => { formulario.elements[campo.name].value = item[campo.name] || '' })
        error.textContent = ''
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
    })

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
        } catch (fallo) {
            console.error(fallo)
            error.textContent = 'No se pudo guardar: ' + fallo.message
        }
    })

    lista.addEventListener('click', async evento => {
        const boton = evento.target.closest('button')
        if (!boton) return
        try {
            if (boton.dataset.edit) abrirFormulario(items.find(item => item.id === boton.dataset.edit))
            else if (boton.dataset.delete) { if (confirm('¿Borrar este elemento del index?')) await eliminar(coleccion, boton.dataset.delete) }
            else if (boton.hasAttribute('data-importar')) {
                const base = Date.now()
                await Promise.all(iniciales.map((item, indice) => crear(coleccion, { ...item, orden: base + indice })))
            }
        } catch (fallo) {
            console.error(fallo)
            alert('No se pudo completar la acción: ' + fallo.message)
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
                <span class="ms-3" id="estadoContenido"></span>
            </form>
        </section>`

    seccionLista(document.getElementById('seccionAtracciones'), {
        coleccion: 'atracciones', titulo: 'ATRACCIONES', textoAgregar: '+ Agregar atracción',
        campos: CAMPOS_ATRACCION, iniciales: ATRACCIONES_INICIALES, subtitulo: 'etiqueta'
    })
    seccionLista(document.getElementById('seccionServicios'), {
        coleccion: 'servicios', titulo: 'SERVICIOS', textoAgregar: '+ Agregar servicio',
        campos: CAMPOS_SERVICIO, iniciales: SERVICIOS_INICIALES
    })

    const formulario = document.getElementById('formContenido')
    const estado = document.getElementById('estadoContenido')
    obtenerDocumento('contenido', 'institucional').then(guardado => {
        const valores = { ...CONTENIDO_INICIAL, ...guardado }
        Object.keys(CONTENIDO_INICIAL).forEach(clave => { formulario.elements[clave].value = valores[clave] })
    }).catch(fallo => console.error(fallo))

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault()
        const datos = Object.fromEntries(new FormData(formulario))
        try {
            await guardarDocumento('contenido', 'institucional', datos)
            estado.className = 'ms-3 text-success'
            estado.textContent = 'Guardado. Ya se ve en el index.'
        } catch (fallo) {
            console.error(fallo)
            estado.className = 'ms-3 text-danger'
            estado.textContent = 'No se pudo guardar: ' + fallo.message
        }
    })
}

function panelUsuarios(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Control de usuarios y roles</h1><div class="glass p-4"><table class="table table-dark"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr></thead><tbody id="tablaUsuarios"></tbody></table></div>`
    const tabla = document.getElementById('tablaUsuarios')
    const cargar = () => listar('usuarios').then(usuarios => { tabla.innerHTML = usuarios.map(usuario => `<tr><td>${escapar(usuario.nombreCompleto || usuario.nombreUsuario)}</td><td>${escapar(usuario.correo)}</td><td><select class="form-select form-select-sm" data-role="${usuario.id}"><option ${usuario.rol === 'admin' ? 'selected' : ''}>admin</option><option ${usuario.rol !== 'admin' ? 'selected' : ''}>cliente</option></select></td><td>${usuario.rol === 'admin' ? '' : botonAccion('usuarios', usuario.id)}</td></tr>`).join('') })
    tabla.addEventListener('change', evento => { if (evento.target.dataset.role) actualizar('usuarios', evento.target.dataset.role, { rol: evento.target.value }) })
    tabla.addEventListener('click', async evento => { const boton = evento.target.closest('[data-delete]'); if (boton && confirm('¿Eliminar este perfil?')) await eliminar('usuarios', boton.dataset.id); cargar() })
    cargar()
}

function panelPerfil(elemento) {
    elemento.innerHTML = `<h1 class="text-white">Perfil y configuración</h1><div class="glass p-4"><p class="text-white" id="correoAdmin"></p><button class="btn btn-warning" id="cerrarSesion">Cerrar sesión</button></div>`
    document.getElementById('correoAdmin').textContent = auth.currentUser.email
    document.getElementById('cerrarSesion').onclick = () => signOut(auth).then(() => { window.location.href = 'admin.html' })
}

onAuthStateChanged(auth, async usuario => {
    if (!usuario) { window.location.href = 'admin.html'; return }
    const perfil = await getDoc(doc(db, 'usuarios', usuario.uid))
    if (!perfil.exists() || perfil.data().rol !== 'admin') { await signOut(auth); window.location.href = 'admin.html'; return }
    mostrarShell()
})
