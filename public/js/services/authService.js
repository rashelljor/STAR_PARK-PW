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
        // Firebase (con la protección contra enumeración de correos activa) no
        // distingue si falló el correo o la contraseña, a propósito: así nadie
        // puede averiguar qué correos tienen cuenta. Por eso es un solo mensaje.
        'auth/invalid-credential': 'El correo o la contraseña son incorrectos. Revisa que el correo esté bien escrito y que la contraseña respete mayúsculas. Si aún no tienes cuenta, créala en "Crear cuenta".',
        'auth/wrong-password': 'La contraseña es incorrecta. Recuerda que distingue mayúsculas y minúsculas.',
        'auth/user-not-found': 'No existe una cuenta con ese correo. Puedes crearla en "Crear cuenta".',
        'auth/email-already-in-use': 'Ya existe una cuenta con este correo electrónico.',
        'auth/invalid-email': 'Ingresa un correo electrónico válido.',
        'auth/weak-password': 'La contraseña no cumple los requisitos mínimos.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.',
        'auth/user-disabled': 'Esta cuenta está deshabilitada. Comunícate con Star Park.',
        'auth/network-request-failed': 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.'
    }
    return mensajes[error.code] || 'No se pudo completar la operación. Intenta nuevamente.'
}

// Campo del formulario de registro al que corresponde cada error de Firebase,
// para marcarlo en rojo además de mostrar el mensaje.
const CAMPO_ERROR_AUTH = {
    'auth/email-already-in-use': 'correo',
    'auth/invalid-email': 'correo',
    'auth/weak-password': 'contrasena'
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
        // Firebase ya deja la sesión iniciada al crear la cuenta; se mantiene
        // para que el cliente no tenga que volver a escribir sus datos.
        return { ok: true }
    } catch (error) {
        return { ok: false, codigo: error.code, campo: CAMPO_ERROR_AUTH[error.code] || 'general', mensaje: mensajeAuth(error) }
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
