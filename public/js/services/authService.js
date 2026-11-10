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
    setDoc,
    updateDoc,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

function mensajeAuth(error) {
    const mensajes = {
        // Firebase (con la protección contra enumeración de correos activa) no
        // distingue si falló el correo o la contraseña, a propósito: así nadie
        // puede averiguar qué correos tienen cuenta. Por eso es un solo mensaje.
        'auth/invalid-credential': 'El usuario o la contraseña son incorrectos. Revisa que el correo o nombre de usuario esté bien escrito y que la contraseña respete mayúsculas. Si aún no tienes cuenta, créala en "Crear cuenta".',
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

// Firebase Auth solo inicia sesión con correo. Para entrar con el nombre de
// usuario, la colección "nombresUsuario" guarda nombre → { uid, correo }: se
// lee un documento conociendo el nombre exacto, sin poder listar la colección
// ni leer "usuarios" (que tiene datos privados). El id va en minúsculas, así
// que "MariaJose" y "mariajose" son el mismo usuario.
function claveNombreUsuario(nombreUsuario) {
    return String(nombreUsuario || '').trim().toLowerCase()
}

async function correoDeNombreUsuario(nombreUsuario) {
    const entrada = await getDoc(doc(db, 'nombresUsuario', claveNombreUsuario(nombreUsuario)))
    return entrada.exists() ? entrada.data().correo : null
}

// Registra el nombre de usuario de una cuenta que no lo tiene en "nombresUsuario"
// (cuentas creadas antes del login por nombre). Si otro ya lo usa, las reglas lo
// rechazan y esa cuenta sigue entrando solo con su correo.
export async function asegurarNombreUsuario(uid, perfil) {
    const clave = claveNombreUsuario(perfil?.nombreUsuario)
    if (!clave || !perfil.correo) return
    const entrada = await getDoc(doc(db, 'nombresUsuario', clave))
    if (!entrada.exists()) await setDoc(doc(db, 'nombresUsuario', clave), { uid, correo: perfil.correo })
}

// Acepta el correo o el nombre de usuario. Devuelve también el correo usado,
// para quien necesite iniciar sesión por su cuenta (login del panel).
export async function resolverCorreo(correoOUsuario) {
    const texto = correoOUsuario.trim()
    if (texto.includes('@')) return { ok: true, correo: texto }
    try {
        const correo = await correoDeNombreUsuario(texto)
        return correo ? { ok: true, correo } : { ok: false, mensaje: 'No existe una cuenta con el nombre de usuario "' + texto + '". Revisa cómo lo escribiste o entra con tu correo.' }
    } catch (error) {
        console.error(error)
        return { ok: false, mensaje: mensajeAuth(error) }
    }
}

export async function iniciarSesion(correoOUsuario, contrasena) {
    const resuelto = await resolverCorreo(correoOUsuario)
    if (!resuelto.ok) return resuelto

    try {
        const credencial = await signInWithEmailAndPassword(auth, resuelto.correo, contrasena)
        const perfil = await obtenerPerfil(credencial.user.uid)
        // El admin eliminó el perfil, pero la cuenta de acceso (Authentication) sigue.
        if (!perfil) {
            await signOut(auth)
            return { ok: false, mensaje: 'El perfil de esta cuenta fue eliminado. Para volver a usarla, regístrate en "Crear cuenta" con este mismo correo y tu contraseña de siempre.' }
        }
        asegurarNombreUsuario(credencial.user.uid, perfil)
            .catch(error => console.warn('No se pudo registrar el nombre de usuario:', error))
        return { ok: true }
    } catch (error) {
        return { ok: false, mensaje: mensajeAuth(error) }
    }
}

// Perfil y nombre de usuario se guardan juntos (o ninguno).
function guardarPerfilNuevo(uid, datos) {
    const { contrasena, ...perfil } = datos
    const lote = writeBatch(db)
    lote.set(doc(db, 'usuarios', uid), { ...perfil, uid, rol: 'cliente', creadoEn: new Date() })
    lote.set(doc(db, 'nombresUsuario', claveNombreUsuario(datos.nombreUsuario)), { uid, correo: datos.correo })
    return lote.commit()
}

// El panel admin solo puede borrar el perfil (Firestore): la cuenta de acceso
// de Authentication no se borra desde el navegador. Si el correo ya está en uso
// y la contraseña es la de esa cuenta sin perfil, se le vuelve a crear el perfil.
async function recuperarCuentaSinPerfil(datos) {
    try {
        const credencial = await signInWithEmailAndPassword(auth, datos.correo, datos.contrasena)
        if (await obtenerPerfil(credencial.user.uid)) {
            await signOut(auth)
            return false
        }
        await guardarPerfilNuevo(credencial.user.uid, datos)
        return true
    } catch {
        if (auth.currentUser) await signOut(auth).catch(() => {})
        return false
    }
}

export async function registrarUsuario(datos) {
    // Se revisa antes de crear la cuenta, para no dejar una cuenta a medias.
    try {
        if (await correoDeNombreUsuario(datos.nombreUsuario)) {
            return { ok: false, campo: 'nombreUsuario', mensaje: 'El nombre de usuario "' + datos.nombreUsuario + '" ya está en uso. Elige otro.' }
        }
    } catch (error) {
        return { ok: false, campo: 'general', mensaje: mensajeAuth(error) }
    }

    try {
        const credencial = await createUserWithEmailAndPassword(auth, datos.correo, datos.contrasena)
        await guardarPerfilNuevo(credencial.user.uid, datos)
        // Firebase ya deja la sesión iniciada al crear la cuenta; se mantiene
        // para que el cliente no tenga que volver a escribir sus datos.
        return { ok: true }
    } catch (error) {
        if (error.code === 'auth/email-already-in-use' && await recuperarCuentaSinPerfil(datos)) return { ok: true, recuperada: true }
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

// Foto de perfil (data URL ya recortada por imageService) del usuario con sesión.
// Con '' se quita la foto.
export function guardarFotoPerfil(foto) {
    return updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { foto })
}

export async function cerrarSesion() {
    await signOut(auth)
}

export { auth, db, mensajeAuth }
