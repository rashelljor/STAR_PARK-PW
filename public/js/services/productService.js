// productService.js
// Fuente única del catálogo de productos y promociones.
// La tienda (tienda.js) lee de aquí para dibujar las tarjetas, y el panel de
// administración (gestion_catalogo.html) usa las mismas funciones para el CRUD.
// Todo se guarda en localStorage bajo la clave 'starparkProductos'.

const CLAVE_PRODUCTOS = 'starparkProductos'

// Imagen usada cuando un producto no tiene una ruta de imagen válida.
const IMAGEN_PRODUCTO_POR_DEFECTO = '../assets/img/logostar.png'

// Catálogo inicial: mismos productos que se mostraban antes en tienda.html,
// ahora con un id estable para que el carrito nunca confunda un producto con otro.
const PRODUCTOS_INICIALES = [
    {
        id: 'promo-exploradores',
        nombre: 'Exploradores Espaciales',
        descripcion: '3 tickets para ingresar a "Aventura espacial" por 20 minutos',
        categoria: 'promociones',
        precio: 45,
        duracion: '20 minutos',
        imagen: '../assets/img/vis02.png',
        alt: 'Niños en el trampolín, Aventura Espacial',
        estado: 'Activo'
    },
    {
        id: 'promo-astronautas',
        nombre: 'Astronautas en Marte',
        descripcion: '2 tickets para ingresar a "Misión Marciana" por 30 minutos',
        categoria: 'promociones',
        precio: 40,
        duracion: '30 minutos',
        imagen: '../assets/img/vis03.png',
        alt: 'área de tobogán y columpios, Misión Marciana',
        estado: 'Activo'
    },
    {
        id: 'promo-piloto',
        nombre: 'Piloto de Estrellas',
        descripcion: '1 Ticket para ingresar a todos los juegos del parque por todo el tiempo que desees',
        categoria: 'promociones',
        precio: 60,
        duracion: 'todo el tiempo',
        imagen: '../assets/img/vis04.png',
        alt: 'Niño en la cabina de control de la nave, Aventura Espacial',
        estado: 'Activo'
    },
    {
        id: 'botin-marciana-15',
        nombre: 'Misión Marciana',
        descripcion: '15 minutos',
        categoria: 'botin',
        precio: 15,
        duracion: '15 minutos',
        imagen: '../assets/img/misionmarciana01.png',
        alt: 'Piscina de pelotas y sensores, Misión Marciana',
        estado: 'Activo'
    },
    {
        id: 'botin-marciana-30',
        nombre: 'Misión Marciana',
        descripcion: '30 minutos',
        categoria: 'botin',
        precio: 25,
        duracion: '30 minutos',
        imagen: '../assets/img/misionmarciana02.png',
        alt: 'Bloques armables, piscina de pelotas y árbol para escalar, Misión Marciana',
        estado: 'Activo'
    },
    {
        id: 'botin-espacial-20',
        nombre: 'Aventura Espacial',
        descripcion: '20 minutos',
        categoria: 'botin',
        precio: 20,
        duracion: '20 minutos',
        imagen: '../assets/img/aventuraespacial02.png',
        alt: 'Entrada y área de espera para padres, Aventura Espacial',
        estado: 'Activo'
    },
    {
        id: 'botin-espacial-30',
        nombre: 'Aventura Espacial',
        descripcion: '30 minutos',
        categoria: 'botin',
        precio: 25,
        duracion: '30 minutos',
        imagen: '../assets/img/aventuraespacial01.png',
        alt: 'Área de juegos, Aventura Espacial',
        estado: 'Activo'
    },
    {
        id: 'botin-ilimitada',
        nombre: 'Aventura Ilimitada',
        descripcion: '1 hora',
        categoria: 'botin',
        precio: 45,
        duracion: '1 hora',
        imagen: '../assets/img/vis05.png',
        alt: 'Entrada del parque, Star Park',
        estado: 'Activo'
    },
    {
        id: 'botin-cumple',
        nombre: 'Cumpleaños Espacial',
        descripcion: 'Evento completo',
        categoria: 'botin',
        precio: 1200,
        duracion: 'evento completo',
        imagen: '../assets/img/cumpleaños.png',
        alt: 'Cumpleaños Espaciales, ejemplo de decoración y animación',
        estado: 'Activo'
    }
]

// ---------- Acceso a los datos ----------

function generarIdProducto() {
    return 'prod-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
}

function obtenerProductos() {
    let productos = JSON.parse(localStorage.getItem(CLAVE_PRODUCTOS))

    if (!productos || productos.length === 0) {
        productos = PRODUCTOS_INICIALES.map(producto => ({ ...producto }))
        localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos))
    }

    return productos
}

function guardarProductos(productos) {
    localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos))
}

// Productos activos, tal como deben verse en la tienda.
function obtenerProductosActivos() {
    return obtenerProductos().filter(producto => (producto.estado || 'Activo') === 'Activo')
}

// Productos activos de una categoría concreta ('promociones' o 'botin').
function obtenerProductosPorCategoria(categoria) {
    return obtenerProductosActivos().filter(producto => producto.categoria === categoria)
}

function obtenerProductoPorId(id) {
    return obtenerProductos().find(producto => producto.id === id)
}

// ---------- CRUD usado por el panel de administración ----------

let tablaProductos = document.getElementById('tablaProductos')
let productosGuardados = obtenerProductos()

function mostrarProductos() {
    if (!tablaProductos) return

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
        id: indice >= 0 ? productosGuardados[indice].id : generarIdProducto(),
        nombre,
        descripcion,
        categoria,
        precio,
        duracion,
        imagen: imagen || IMAGEN_PRODUCTO_POR_DEFECTO,
        alt: nombre,
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

if (document.getElementById('guardarProducto')) {
    document.getElementById('guardarProducto').addEventListener('click', guardarProducto)
    document.getElementById('limpiarProducto').addEventListener('click', limpiarProducto)
}

mostrarProductos()
