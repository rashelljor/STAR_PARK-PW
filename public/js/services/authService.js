import { auth, db } from '../config/firebaseConfig.js'
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import {
    doc,
    getDoc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

function mensajeAuth(error) {
    const mensajes = {
        'auth/invalid-credential': 'El correo o la contraseña son incorrectos.',
        'auth/email-already-in-use': 'Ya existe una cuenta con este correo electrónico.',
        'auth/invalid-email': 'Ingresa un correo electrónico válido.',
        'auth/weak-password': 'La contraseña no cumple los requisitos mínimos.'
    }
    return mensajes[error.code] || 'No se pudo completar la operación. Intenta nuevamente.'
}

// El login solo acepta correo (no nombre de usuario): resolver un nombre de
// usuario a su correo requeriría leer la colección "usuarios" antes de estar
// autenticado, y las reglas de Firestore no lo permiten (con razón: esa
// colección tiene datos privados de cada cliente).
export async function iniciarSesion(correoOUsuario, contrasena) {
    const correo = correoOUsuario.trim()

    if (!correo.includes('@')) {
        return { ok: false, mensaje: 'Inicia sesión con tu correo electrónico (el nombre de usuario no funciona aquí).' }
    }

    try {
        await signInWithEmailAndPassword(auth, correo, contrasena)
        return { ok: true }
    } catch (error) {
        return { ok: false, mensaje: mensajeAuth(error) }
    }
}

export async function registrarUsuario(datos) {
    try {
        const credencial = await createUserWithEmailAndPassword(auth, datos.correo, datos.contrasena)
        const { contrasena, ...perfil } = datos
        await setDoc(doc(db, 'usuarios', credencial.user.uid), {
            ...perfil,
            uid: credencial.user.uid,
            rol: 'cliente',
            creadoEn: new Date()
        })
        await signOut(auth)
        return { ok: true }
    } catch (error) {
        return { ok: false, campo: 'general', mensaje: mensajeAuth(error) }
    }
}

// Espera a que Firebase confirme si hay sesión activa. Al cargar la página,
// auth.currentUser puede ser null por un instante aunque el usuario sí esté
// logueado (la sesión guardada tarda unos milisegundos en restaurarse), así
// que las vistas que necesitan saber "¿hay usuario o no?" antes de actuar
// (carrito, reservas...) deben usar esto en vez de leer auth.currentUser directo.
export function esperarUsuario() {
    return new Promise(resolve => {
        const cancelar = onAuthStateChanged(auth, usuario => {
            cancelar()
            resolve(usuario)
        })
    })
}

// Perfil guardado en Firestore (nombreCompleto, nombreUsuario, etc.) del
// usuario indicado. Usado por el Header para saludar por su nombre.
export async function obtenerPerfil(uid) {
    const snapshot = await getDoc(doc(db, 'usuarios', uid))
    return snapshot.exists() ? snapshot.data() : null
}

export async function cerrarSesion() {
    await signOut(auth)
}

export { auth, db, mensajeAuth }
