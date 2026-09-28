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

// Búsqueda simple por nombre o descripción, usada por el buscador de la tienda.
export async function searchProducts(termino) {
    const texto = (termino || '').trim().toLowerCase()

    if (!texto) return []

    return (await getActiveProducts()).filter(producto => {
        const nombre = producto.nombre?.toLowerCase() || ''
        const descripcion = producto.descripcion?.toLowerCase() || ''
        return nombre.includes(texto) || descripcion.includes(texto)
    })
}

export function getImagenPorDefecto() {
    return IMAGEN_PRODUCTO_POR_DEFECTO
}
