import { auth, db } from '../config/firebaseConfig.js'
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { MILLAS_POR_CANJE, MILLAS_POR_SOL, RANGOS_ASTRONAUTA, SOLES_POR_CANJE } from '../utils/constants.js'
import { aNumero } from '../utils/formatters.js'

export async function obtenerCompras() {
    if (!auth.currentUser) return []
    const snapshot = await getDocs(query(collection(db, 'transacciones'), where('uid', '==', auth.currentUser.uid)))
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}

// Contador de fidelidad del cliente (colección "fidelidad"): millas y compras
// pagadas. Las reglas de Firestore lo usan para validar canjes y cupones, y
// solo avanza junto con un pago. Sin documento todavía, todo vale 0.
export async function obtenerFidelidad() {
    const vacio = { millasGanadas: 0, millasUsadas: 0, compras: 0 }
    if (!auth.currentUser) return vacio
    const documento = await getDoc(doc(db, 'fidelidad', auth.currentUser.uid))
    return documento.exists() ? { ...vacio, ...documento.data() } : vacio
}

// Totales de un grupo de compras; el panel de admin los usa para recalcular el contador.
export function totalesCompras(compras) {
    return {
        millasGanadas: compras.reduce((total, compra) => total + (compra.millasGanadas ?? Math.floor(aNumero(compra.total)) * MILLAS_POR_SOL), 0),
        millasUsadas: compras.reduce((total, compra) => total + (Number(compra.millasUsadas) || 0), 0),
        compras: compras.length
    }
}

// Millas espaciales: se calculan desde las compras (que el cliente no puede
// modificar). Las compras anteriores al programa también suman: 1 milla por
// cada S/ 1 de su total.
export function resumenMillas(compras) {
    const { millasGanadas: ganadas, millasUsadas: usadas } = totalesCompras(compras)
    const disponibles = Math.max(0, ganadas - usadas)
    const indice = RANGOS_ASTRONAUTA.findLastIndex(rango => ganadas >= rango.desde)
    const rango = RANGOS_ASTRONAUTA[indice]
    const siguiente = RANGOS_ASTRONAUTA[indice + 1] || null
    return {
        ganadas,
        usadas,
        disponibles,
        rango,
        siguiente,
        // Porcentaje de avance hacia el siguiente rango (100 en el último).
        avance: siguiente ? Math.round((ganadas - rango.desde) * 100 / (siguiente.desde - rango.desde)) : 100,
        // Canjes posibles ahora mismo (cada uno vale S/ 5).
        canjes: Math.floor(disponibles / MILLAS_POR_CANJE),
        solesPorCanje: SOLES_POR_CANJE
    }
}
