// capacityService.js - Aforo por fecha. Cada reserva deja en "ocupacion/{idReserva}"
// solo la fecha y la cantidad de entradas (sin datos personales), para que
// cualquier visitante pueda ver qué días están libres, casi llenos o agotados.

import { db } from '../config/firebaseConfig.js'
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { AFORO_POR_DEFECTO, UMBRAL_CASI_LLENO } from '../utils/constants.js'

export async function obtenerAforoMaximo() {
    const documento = await getDoc(doc(db, 'configuracion', 'aforo')).catch(() => null)
    return Number(documento?.data()?.maximoPorDia) || AFORO_POR_DEFECTO
}

// Entradas ocupadas por día entre dos fechas AAAA-MM-DD: { '2026-10-20': 35, ... }.
export async function ocupacionEntre(desde, hasta) {
    const snapshot = await getDocs(query(collection(db, 'ocupacion'), where('fecha', '>=', desde), where('fecha', '<=', hasta)))
    const porDia = {}
    snapshot.docs.forEach(documento => {
        const { fecha, entradas } = documento.data()
        porDia[fecha] = (porDia[fecha] || 0) + (Number(entradas) || 0)
    })
    return porDia
}

// Entradas que quedan libres en una fecha. "ignorar" excluye una reserva
// (al editar una reserva no debe contarse a sí misma).
export async function cuposLibres(fecha, ignorar = null) {
    const [maximo, snapshot] = await Promise.all([
        obtenerAforoMaximo(),
        getDocs(query(collection(db, 'ocupacion'), where('fecha', '==', fecha)))
    ])
    const ocupadas = snapshot.docs
        .filter(documento => documento.id !== ignorar)
        .reduce((total, documento) => total + (Number(documento.data().entradas) || 0), 0)
    return Math.max(0, maximo - ocupadas)
}

// 'libre' | 'casiLleno' | 'agotado'
export function estadoAforo(ocupadas, maximo) {
    if (ocupadas >= maximo) return 'agotado'
    if (ocupadas >= maximo * UMBRAL_CASI_LLENO) return 'casiLleno'
    return 'libre'
}
