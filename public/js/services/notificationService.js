// notificationService.js - Bandeja de entrada del cliente (usuarios/<uid>/notificaciones).
// Cada notificación: { tipo, titulo, mensaje, leida, fecha, visibleDesde }.
// "visibleDesde" permite programar un aviso: el reembolso de una cancelación se
// guarda al cancelar, pero aparece en la bandeja recién a los 10 segundos.
// También muestra el aviso nativo del navegador si el cliente lo permitió.

import { auth, db } from '../config/firebaseConfig.js'
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { milisegundos } from '../utils/formatters.js'

function bandeja(uid = auth.currentUser.uid) {
    return collection(db, 'usuarios', uid, 'notificaciones')
}

// Referencia para una notificación nueva (se usa dentro de un lote, p. ej. al cancelar).
export function nuevaNotificacion(uid) {
    return doc(bandeja(uid))
}

export function datosNotificacion({ tipo = 'info', titulo, mensaje, visibleDesde = null }) {
    return { tipo, titulo, mensaje, leida: false, fecha: serverTimestamp(), visibleDesde }
}

// El admin la usa para responder preguntas de un cliente.
export function enviarNotificacion(uid, datos) {
    return setDoc(nuevaNotificacion(uid), datosNotificacion(datos))
}

export function esVisible(notificacion, ahora = Date.now()) {
    return !notificacion.visibleDesde || milisegundos(notificacion.visibleDesde) <= ahora
}

// Escucha la bandeja en tiempo real. callback recibe solo las ya visibles, las
// más recientes primero; cuando una programada llega a su hora, se vuelve a
// llamar sin esperar a Firestore. Devuelve la función para dejar de escuchar.
export function escucharNotificaciones(uid, callback, alFallar = console.error) {
    let todas = []
    let temporizador = null
    const publicar = () => {
        clearTimeout(temporizador)
        const ahora = Date.now()
        const visibles = todas.filter(item => esVisible(item, ahora))
            .sort((a, b) => milisegundos(b.visibleDesde || b.fecha) - milisegundos(a.visibleDesde || a.fecha))
        callback(visibles)
        const proxima = Math.min(...todas.filter(item => !esVisible(item, ahora)).map(item => milisegundos(item.visibleDesde)))
        if (Number.isFinite(proxima)) temporizador = setTimeout(publicar, proxima - ahora + 50)
    }
    const detener = onSnapshot(bandeja(uid), snapshot => {
        todas = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
        publicar()
    }, alFallar)
    return () => { clearTimeout(temporizador); detener() }
}

export function marcarLeida(id) {
    return updateDoc(doc(bandeja(), id), { leida: true })
}

export function marcarTodasLeidas(notificaciones) {
    const lote = writeBatch(db)
    notificaciones.filter(item => !item.leida).forEach(item => lote.update(doc(bandeja(), item.id), { leida: true }))
    return lote.commit()
}

export function eliminarNotificacion(id) {
    return deleteDoc(doc(bandeja(), id))
}

// Avisos del navegador (fuera de la página). Requieren permiso del cliente.
export function avisosNavegador() {
    if (!('Notification' in window)) return 'no-disponible'
    return Notification.permission
}

export async function pedirAvisosNavegador() {
    if (!('Notification' in window)) return 'no-disponible'
    return Notification.requestPermission()
}

export function mostrarAvisoNavegador(titulo, mensaje) {
    if (avisosNavegador() !== 'granted') return
    try {
        new Notification(titulo + ' — Star Park', { body: mensaje, icon: '../../assets/img/logostar.png' })
    } catch {
        // Algunos navegadores móviles solo permiten avisos desde un service worker.
    }
}
