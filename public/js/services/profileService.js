// profileService.js - Datos de "Mi perfil" del cliente con sesión iniciada.
//   - Perfil (usuarios/<uid>): datos personales, favoritos y preferencias.
//   - Tarjetas guardadas (usuarios/<uid>/tarjetas): solo marca, últimos 4,
//     titular y vencimiento; nunca el número completo ni el CVV.
//   - Opiniones: sus reseñas de la colección "resenas".
//   - Preguntas: colección "preguntas", que el admin responde desde el panel.

import { auth, db } from '../config/firebaseConfig.js'
import {
    addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { marcaTarjeta, esNumeroTarjetaValido, soloDigitos } from './paymentService.js'
import { milisegundos } from '../utils/formatters.js'

function uid() {
    if (!auth.currentUser) throw new Error('Debes iniciar sesión.')
    return auth.currentUser.uid
}

const leer = snapshot => snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
const recientesPrimero = campo => (a, b) => milisegundos(b[campo]) - milisegundos(a[campo])

// Solo datos personales: rol, correo y nombre de usuario no se tocan aquí.
export function actualizarPerfil({ nombreCompleto, telefono, tipoDocumento, numeroDocumento, region }) {
    return updateDoc(doc(db, 'usuarios', uid()), { nombreCompleto, telefono, tipoDocumento, numeroDocumento, region, actualizadoEn: serverTimestamp() })
}

export function guardarPreferencias(preferencias) {
    return updateDoc(doc(db, 'usuarios', uid()), preferencias)
}

// Favoritos: ids de atracciones (los juegos del parque) en el perfil.
export async function obtenerAtracciones() {
    return leer(await getDocs(collection(db, 'atracciones'))).sort((a, b) => (a.orden || 0) - (b.orden || 0))
}

export function marcarFavorito(atraccionId, favorito) {
    return updateDoc(doc(db, 'usuarios', uid()), { favoritos: favorito ? arrayUnion(atraccionId) : arrayRemove(atraccionId) })
}

// --- Tarjetas ---

function tarjetasRef() {
    return collection(db, 'usuarios', uid(), 'tarjetas')
}

export async function obtenerTarjetas() {
    return leer(await getDocs(tarjetasRef())).sort(recientesPrimero('creadaEn'))
}

// "MM/AA" no vencido.
export function vencimientoValido(vencimiento) {
    const [mes, anio] = String(vencimiento).split('/').map(Number)
    if (!mes || mes > 12 || anio === undefined || isNaN(anio)) return false
    const hoy = new Date()
    return 2000 + anio > hoy.getFullYear() || (2000 + anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1)
}

export function erroresDatosTarjeta({ numero, titular, vencimiento }, nueva) {
    const errores = []
    if (nueva && !esNumeroTarjetaValido(numero)) errores.push('El número de tarjeta no es válido. Revísalo dígito por dígito.')
    if (String(titular).trim().length < 3) errores.push('Escribe el nombre del titular tal como aparece en la tarjeta.')
    if (!vencimientoValido(vencimiento)) errores.push('Escribe un vencimiento vigente como MM/AA.')
    return errores
}

// Del número solo se guardan la marca y los últimos 4 dígitos.
export function agregarTarjeta({ numero, titular, vencimiento, alias }) {
    const digitos = soloDigitos(numero)
    return addDoc(tarjetasRef(), {
        marca: marcaTarjeta(digitos) || 'Tarjeta',
        ultimos4: digitos.slice(-4),
        titular: titular.trim().toUpperCase(),
        vencimiento,
        alias: alias.trim(),
        creadaEn: serverTimestamp()
    })
}

export function editarTarjeta(id, { titular, vencimiento, alias }) {
    return updateDoc(doc(tarjetasRef(), id), { titular: titular.trim().toUpperCase(), vencimiento, alias: alias.trim() })
}

export function eliminarTarjeta(id) {
    return deleteDoc(doc(tarjetasRef(), id))
}

// --- Opiniones y preguntas ---

export async function obtenerMisResenas() {
    return leer(await getDocs(query(collection(db, 'resenas'), where('uid', '==', uid())))).sort(recientesPrimero('fecha'))
}

export async function obtenerMisPreguntas() {
    return leer(await getDocs(query(collection(db, 'preguntas'), where('uid', '==', uid())))).sort(recientesPrimero('fecha'))
}

export function enviarPregunta(pregunta, { nombre, correo }) {
    return addDoc(collection(db, 'preguntas'), { uid: uid(), nombre, correo, pregunta: pregunta.trim(), estado: 'pendiente', fecha: serverTimestamp() })
}

export function eliminarPregunta(id) {
    return deleteDoc(doc(db, 'preguntas', id))
}
