// reservas.js - Administra reservas, clientes y productos.

let cuerpoTabla = document.getElementById('cuerpoTabla')
let tablaClientes = document.getElementById('tablaClientes')
let tablaProductos = document.getElementById('tablaProductos')
let contenedorAlertas = document.getElementById('alertContainer')

function obtenerReservas() {
    let guardadas = JSON.parse(localStorage.getItem('starparkReservas'))

    if (!guardadas) {
        guardadas = JSON.parse(localStorage.getItem('reservas')) || []
        if (guardadas.length > 0) {
            localStorage.setItem('starparkReservas', JSON.stringify(guardadas))
        }
    }

    return guardadas || []
}

function guardarReservas() {
    localStorage.setItem('starparkReservas', JSON.stringify(reservasGuardadas))
    localStorage.setItem('reservas', JSON.stringify(reservasGuardadas))
}

function obtenerClientes() {
    let clientes = JSON.parse(localStorage.getItem('starparkClientes'))

    if (!clientes || clientes.length === 0) {
        clientes = [
            { nombre: 'Fabricio', correo: '123@gmail.com', telefono: '987654321' },
            { nombre: 'Jose', correo: '321@gmail.com', telefono: '933454523' },
            { nombre: 'Ana Torres', correo: 'ana@gmail.com', telefono: '998877665' }
        ]
        localStorage.setItem('starparkClientes', JSON.stringify(clientes))
    }

    return clientes
}

function guardarClientes(clientes) {
    localStorage.setItem('starparkClientes', JSON.stringify(clientes))
}

function obtenerProductos() {
    let productos = JSON.parse(localStorage.getItem('starparkProductos'))

    if (!productos || productos.length === 0) {
        productos = [
            { nombre: 'Exploradores Espaciales', descripcion: '3 tickets para ingresar a Aventura Espacial', categoria: 'promociones', precio: 45, duracion: '20 minutos', imagen: '', estado: 'Activo' },
            { nombre: 'Astronautas en Marte', descripcion: '2 tickets para Misión Marciana', categoria: 'promociones', precio: 40, duracion: '30 minutos', imagen: '', estado: 'Activo' },
            { nombre: 'Piloto de Estrellas', descripcion: 'Acceso completo al parque', categoria: 'promociones', precio: 60, duracion: 'todo el tiempo', imagen: '', estado: 'Activo' },
            { nombre: 'Misión Marciana', descripcion: '15 minutos', categoria: 'botin', precio: 15, duracion: '15 minutos', imagen: '', estado: 'Activo' },
            { nombre: 'Misión Marciana', descripcion: '30 minutos', categoria: 'botin', precio: 25, duracion: '30 minutos', imagen: '', estado: 'Activo' },
            { nombre: 'Aventura Espacial', descripcion: '20 minutos', categoria: 'botin', precio: 20, duracion: '20 minutos', imagen: '', estado: 'Activo' },
            { nombre: 'Aventura Espacial', descripcion: '30 minutos', categoria: 'botin', precio: 25, duracion: '30 minutos', imagen: '', estado: 'Activo' },
            { nombre: 'Aventura Ilimitada', descripcion: '1 hora', categoria: 'botin', precio: 45, duracion: '1 hora', imagen: '', estado: 'Activo' },
            { nombre: 'Cumpleaños Espacial', descripcion: 'Evento completo', categoria: 'botin', precio: 1200, duracion: 'evento completo', imagen: '', estado: 'Activo' }
        ]
        localStorage.setItem('starparkProductos', JSON.stringify(productos))
    }

    return productos
}

function guardarProductos(productos) {
    localStorage.setItem('starparkProductos', JSON.stringify(productos))
}

let reservasGuardadas = obtenerReservas()
let clientesGuardados = obtenerClientes()
let productosGuardados = obtenerProductos()

function mostrarAlerta(mensaje, tipo) {
    contenedorAlertas.innerHTML = '<div class="alert alert-' + tipo + '" role="alert">' + mensaje + '</div>'
}

function mostrarReservas() {
    cuerpoTabla.innerHTML = ''

    if (reservasGuardadas.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#d9dfe8; padding:20px;">No hay reservas aún.</td></tr>'
        mostrarAlerta('No hay reservas aún.', 'info')
        return
    }

    reservasGuardadas.forEach((reserva, indice) => {
        let estadoPago = '<span class="amarillo">Pagado</span>'

        if (!reserva.pagado) {
            estadoPago = '<button class="botonPagar" onclick="pagarReserva(' + indice + ')">Pagar</button>'
        }

        cuerpoTabla.innerHTML += `
            <tr>
                <td>${indice + 1}</td>
                <td>${reserva.nombre}</td>
                <td>${reserva.correo}</td>
                <td>${reserva.telefono}</td>
                <td>${reserva.fecha}</td>
                <td class="amarillo">${reserva.total}</td>
                <td>${reserva.fechaRegistro}</td>
                <td>
                    ${estadoPago}
                    <button class="botonEditar" onclick="editarReserva(${indice})">Editar</button>
                    <button class="botonEliminar" onclick="eliminarReserva(${indice})">Quitar</button>
                </td>
            </tr>
        `
    })
}

function pagarReserva(indice) {
    let reserva = reservasGuardadas[indice]
    let comprasGuardadas = JSON.parse(localStorage.getItem('compras')) || []

    comprasGuardadas.push({
        nombre: reserva.nombre,
        items: reserva.items,
        total: reserva.total,
        fecha: reserva.fechaRegistro
    })

    localStorage.setItem('compras', JSON.stringify(comprasGuardadas))
    reserva.pagado = true
    guardarReservas()
    mostrarReservas()
    alert('Pago confirmado. Revisa Mis Compras.')
}

function editarReserva(indice) {
    let reserva = reservasGuardadas[indice]
    let nombre = prompt('Nombre completo', reserva.nombre)
    let correo = prompt('Correo', reserva.correo)
    let telefono = prompt('Teléfono', reserva.telefono)
    let fecha = prompt('Fecha de visita', reserva.fecha)

    if (nombre === null || correo === null || telefono === null || fecha === null) {
        return
    }

    reserva.nombre = nombre.trim()
    reserva.correo = correo.trim()
    reserva.telefono = telefono.trim()
    reserva.fecha = fecha.trim()
    guardarReservas()
    mostrarReservas()
    mostrarAlerta('Reserva actualizada correctamente.', 'success')
}

function eliminarReserva(indice) {
    reservasGuardadas.splice(indice, 1)
    guardarReservas()
    mostrarReservas()
    mostrarAlerta('Reserva eliminada correctamente.', 'success')
}

function mostrarClientes() {
    tablaClientes.innerHTML = ''

    if (clientesGuardados.length === 0) {
        tablaClientes.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#d9dfe8; padding:20px;">No hay clientes registrados.</td></tr>'
        return
    }

    clientesGuardados.forEach((cliente, indice) => {
        tablaClientes.innerHTML += `
            <tr>
                <td>${cliente.nombre}</td>
                <td>${cliente.correo}</td>
                <td>${cliente.telefono}</td>
                <td>
                    <button class="botonEditar" onclick="editarCliente(${indice})">Editar</button>
                    <button class="botonEliminar" onclick="eliminarCliente(${indice})">Eliminar</button>
                </td>
            </tr>
        `
    })
}

function guardarCliente() {
    let nombre = document.getElementById('clienteNombre').value.trim()
    let correo = document.getElementById('clienteCorreo').value.trim()
    let telefono = document.getElementById('clienteTelefono').value.trim()
    let indice = Number(document.getElementById('clienteIndex').value)

    if (!nombre || !correo || !telefono) {
        alert('Completa los datos del cliente.')
        return
    }

    if (indice >= 0) {
        clientesGuardados[indice] = { nombre, correo, telefono }
    } else {
        clientesGuardados.push({ nombre, correo, telefono })
    }

    guardarClientes(clientesGuardados)
    limpiarCliente()
    mostrarClientes()
}

function editarCliente(indice) {
    let cliente = clientesGuardados[indice]
    document.getElementById('clienteNombre').value = cliente.nombre
    document.getElementById('clienteCorreo').value = cliente.correo
    document.getElementById('clienteTelefono').value = cliente.telefono
    document.getElementById('clienteIndex').value = indice
}

function eliminarCliente(indice) {
    clientesGuardados.splice(indice, 1)
    guardarClientes(clientesGuardados)
    limpiarCliente()
    mostrarClientes()
}

function limpiarCliente() {
    document.getElementById('clienteNombre').value = ''
    document.getElementById('clienteCorreo').value = ''
    document.getElementById('clienteTelefono').value = ''
    document.getElementById('clienteIndex').value = '-1'
}

function mostrarProductos() {
    tablaProductos.innerHTML = ''

    if (productosGuardados.length === 0) {
        tablaProductos.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#d9dfe8; padding:20px;">No hay productos registrados.</td></tr>'
        return
    }

    productosGuardados.forEach((producto, indice) => {
        let estado = producto.estado || 'Activo'
        let botonEstado = '<button class="botonEstado" onclick="cambiarEstadoProducto(' + indice + ')">' + (estado === 'Activo' ? 'Desactivar' : 'Activar') + '</button>'

        tablaProductos.innerHTML += `
            <tr>
                <td>${producto.nombre}</td>
                <td>${producto.categoria}</td>
                <td>S/ ${Number(producto.precio).toFixed(2)}</td>
                <td>${estado}</td>
                <td>
                    <button class="botonEditar" onclick="editarProducto(${indice})">Editar</button>
                    ${botonEstado}
                    <button class="botonEliminar" onclick="eliminarProducto(${indice})">Eliminar</button>
                </td>
            </tr>
        `
    })
}

function guardarProducto() {
    let nombre = document.getElementById('productoNombre').value.trim()
    let descripcion = document.getElementById('productoDescripcion').value.trim()
    let categoria = document.getElementById('productoCategoria').value
    let precio = Number(document.getElementById('productoPrecio').value)
    let duracion = document.getElementById('productoDuracion').value.trim()
    let imagen = document.getElementById('productoImagen').value.trim()
    let indice = Number(document.getElementById('productoIndex').value)

    if (!nombre || !descripcion || !precio || !duracion) {
        alert('Completa todos los campos del producto.')
        return
    }

    let producto = {
        nombre,
        descripcion,
        categoria,
        precio,
        duracion,
        imagen,
        estado: 'Activo'
    }

    if (indice >= 0) {
        producto.estado = productosGuardados[indice].estado || 'Activo'
        productosGuardados[indice] = producto
    } else {
        productosGuardados.push(producto)
    }

    guardarProductos(productosGuardados)
    limpiarProducto()
    mostrarProductos()
}

function editarProducto(indice) {
    let producto = productosGuardados[indice]
    document.getElementById('productoNombre').value = producto.nombre
    document.getElementById('productoDescripcion').value = producto.descripcion
    document.getElementById('productoCategoria').value = producto.categoria
    document.getElementById('productoPrecio').value = producto.precio
    document.getElementById('productoDuracion').value = producto.duracion
    document.getElementById('productoImagen').value = producto.imagen || ''
    document.getElementById('productoIndex').value = indice
}

function cambiarEstadoProducto(indice) {
    productosGuardados[indice].estado = (productosGuardados[indice].estado === 'Activo') ? 'Inactivo' : 'Activo'
    guardarProductos(productosGuardados)
    mostrarProductos()
}

function eliminarProducto(indice) {
    productosGuardados.splice(indice, 1)
    guardarProductos(productosGuardados)
    limpiarProducto()
    mostrarProductos()
}

function limpiarProducto() {
    document.getElementById('productoNombre').value = ''
    document.getElementById('productoDescripcion').value = ''
    document.getElementById('productoCategoria').value = 'promociones'
    document.getElementById('productoPrecio').value = ''
    document.getElementById('productoDuracion').value = ''
    document.getElementById('productoImagen').value = ''
    document.getElementById('productoIndex').value = '-1'
}

if (document.getElementById('guardarCliente')) {
    document.getElementById('guardarCliente').addEventListener('click', guardarCliente)
    document.getElementById('limpiarCliente').addEventListener('click', limpiarCliente)
}

if (document.getElementById('guardarProducto')) {
    document.getElementById('guardarProducto').addEventListener('click', guardarProducto)
    document.getElementById('limpiarProducto').addEventListener('click', limpiarProducto)
}

mostrarReservas()
mostrarClientes()
mostrarProductos()