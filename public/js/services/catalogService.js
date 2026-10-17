// catalogService.js - Catálogo de productos respaldado por Firestore (colección "productos").

import { db } from '../config/firebaseConfig.js'
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const IMAGEN_PRODUCTO_POR_DEFECTO = '../../assets/img/logostar.png'

async function leerProductos() {
    const snapshot = await getDocs(collection(db, 'productos'))
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}

export function getProducts() {
    return leerProductos()
}

export async function getActiveProducts() {
    const snapshot = await getDocs(query(collection(db, 'productos'), where('estado', '==', 'Activo')))
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}

export async function getProductsByCategory(categoria) {
    return (await getActiveProducts()).filter(producto => producto.categoria === categoria)
}

export async function getProductById(id) {
    return (await leerProductos()).find(producto => producto.id === id)
}

// Quita tildes y mayúsculas: "Misión", "MISION" y "mision" se comparan igual.
function normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Búsqueda del buscador de la tienda, sobre los productos ya cargados (no vuelve
// a consultar Firestore en cada tecla). Coincidencia parcial por nombre o
// descripción; con varias palabras ("aventura nave") deben aparecer todas,
// en cualquier orden.
export function searchProducts(termino, productos) {
    const palabras = normalizar(termino).split(/\s+/).filter(Boolean)
    if (!palabras.length) return []

    return productos.filter(producto => {
        const texto = normalizar(producto.nombre + ' ' + producto.descripcion)
        return palabras.every(palabra => texto.includes(palabra))
    })
}

export function getImagenPorDefecto() {
    return IMAGEN_PRODUCTO_POR_DEFECTO
}
