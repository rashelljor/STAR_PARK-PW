import { auth, db } from '../config/firebaseConfig.js'
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

export async function obtenerCompras() {
    if (!auth.currentUser) return []
    const snapshot = await getDocs(query(collection(db, 'transacciones'), where('uid', '==', auth.currentUser.uid)))
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}
