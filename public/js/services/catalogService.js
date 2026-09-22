// catalogService.js - Catálogo de productos para las vistas Vue de la tienda.
//
// Lee y escribe la misma clave de localStorage ('starparkProductos') que usa
// services/productService.js (el CRUD del panel de administración). No se
// importa aquí porque productService.js se carga como <script> clásico en el
// admin, no como módulo ES; por eso el catálogo inicial está duplicado en
// ambos archivos. Si agregas o cambias un producto, actualízalo en los dos.

const CLAVE_PRODUCTOS = 'starparkProductos'

const IMAGEN_PRODUCTO_POR_DEFECTO = '../assets/img/logostar.png'

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

function leerProductos() {
    let productos = JSON.parse(localStorage.getItem(CLAVE_PRODUCTOS))

    if (!productos || productos.length === 0) {
        productos = PRODUCTOS_INICIALES.map(producto => ({ ...producto }))
        localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos))
    }

    return productos
}

export function getProducts() {
    return leerProductos()
}

export function getActiveProducts() {
    return leerProductos().filter(producto => (producto.estado || 'Activo') === 'Activo')
}

export function getProductsByCategory(categoria) {
    return getActiveProducts().filter(producto => producto.categoria === categoria)
}

export function getProductById(id) {
    return leerProductos().find(producto => producto.id === id)
}

// Búsqueda simple por nombre o descripción, usada por el buscador de la tienda.
export function searchProducts(termino) {
    const texto = (termino || '').trim().toLowerCase()

    if (!texto) return []

    return getActiveProducts().filter(producto => {
        const nombre = producto.nombre?.toLowerCase() || ''
        const descripcion = producto.descripcion?.toLowerCase() || ''
        return nombre.includes(texto) || descripcion.includes(texto)
    })
}

export function getImagenPorDefecto() {
    return IMAGEN_PRODUCTO_POR_DEFECTO
}
