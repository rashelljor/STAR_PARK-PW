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

// Nombres que se usaban antes del selector de colores, convertidos a su código.
const COLORES_POR_NOMBRE = {
    rojo: '#e53935', amarillo: '#fdd835', verde: '#43a047', azul: '#1e88e5', celeste: '#4fc3f7',
    rosado: '#ec407a', rosa: '#ec407a', morado: '#8e24aa', violeta: '#8e24aa', lila: '#ba68c8',
    naranja: '#fb8c00', anaranjado: '#fb8c00', negro: '#212121', blanco: '#ffffff', gris: '#9e9e9e',
    marron: '#6d4c41', cafe: '#6d4c41', dorado: '#d4af37', plateado: '#c0c0c0'
}

// Colores del bazar como lista de códigos (#rrggbb). Antes se guardaban como
// texto separado por comas ("Rojo, azul"); esos nombres se convierten aquí.
export function coloresDe(producto) {
    const colores = Array.isArray(producto?.colores) ? producto.colores : String(producto?.colores || '').split(',')
    return colores
        .map(color => String(color).trim())
        .filter(Boolean)
        .map(color => COLORES_POR_NOMBRE[color.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()] || color)
}
