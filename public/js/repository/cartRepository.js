import { auth, db } from '../config/firebaseConfig.js'
import { collection, deleteDoc, doc, getDocs, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

function carritoRef() {
    if (!auth.currentUser) throw new Error('Debes iniciar sesión para usar el carrito.')
    return collection(db, 'usuarios', auth.currentUser.uid, 'carrito')
}

export async function leerCarrito() {
    const snapshot = await getDocs(carritoRef())
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}

export async function guardarCarrito(items) {
    const referencia = carritoRef()
    const actual = await getDocs(referencia)
    await Promise.all(actual.docs.map(documento => deleteDoc(documento.ref)))
    await Promise.all(items.map(item => setDoc(doc(referencia), item)))
    return items
}

export async function vaciarCarrito() {
    const snapshot = await getDocs(carritoRef())
    await Promise.all(snapshot.docs.map(documento => deleteDoc(documento.ref)))
}
