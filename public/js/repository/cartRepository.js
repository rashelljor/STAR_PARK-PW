import { auth, db } from '../config/firebaseConfig.js'
import { collection, deleteDoc, doc, getDocs, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

function carritoRef() {
    if (!auth.currentUser) throw new Error('Debes iniciar sesión para usar el carrito.')
    return collection(db, 'usuarios', auth.currentUser.uid, 'carrito')
}

// Una línea por producto: { id, nombre, precio, cantidad }. Antes se guardaba
// un documento por unidad; esas filas antiguas se agrupan aquí al leer.
export async function leerCarrito() {
    const snapshot = await getDocs(carritoRef())
    const lineas = new Map()
    snapshot.docs.forEach(documento => {
        const item = documento.data()
        const id = item.id || documento.id
        const linea = lineas.get(id) || { id, nombre: item.nombre, precio: Number(item.precio) || 0, cantidad: 0 }
        // Productos del bazar: guardan su categoría, el stock que había al agregarlos
        // y el color elegido (cada color es una línea; productoId es el del catálogo).
        if (item.categoria) linea.categoria = item.categoria
        if (item.stock != null) linea.stock = Number(item.stock)
        if (item.productoId) linea.productoId = item.productoId
        if (item.color) linea.color = item.color
        linea.cantidad += Number(item.cantidad) || 1
        lineas.set(id, linea)
    })
    return [...lineas.values()]
}

// El id del documento es el de la línea (el producto, o producto + color en el bazar).
export async function guardarCarrito(items) {
    const referencia = carritoRef()
    const actual = await getDocs(referencia)
    const ids = new Set(items.map(item => item.id))
    await Promise.all(actual.docs.filter(documento => !ids.has(documento.id)).map(documento => deleteDoc(documento.ref)))
    await Promise.all(items.map(item => setDoc(doc(referencia, item.id), item)))
    return items
}

export async function vaciarCarrito() {
    const snapshot = await getDocs(carritoRef())
    await Promise.all(snapshot.docs.map(documento => deleteDoc(documento.ref)))
}
