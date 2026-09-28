import { auth, db } from '../config/firebaseConfig.js'
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import {
    collection,
    doc,
    getDocs,
    query,
    setDoc,
    where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const usuariosRef = collection(db, 'usuarios')

function mensajeAuth(error) {
    const mensajes = {
        'auth/invalid-credential': 'El correo o la contraseña son incorrectos.',
        'auth/email-already-in-use': 'Ya existe una cuenta con este correo electrónico.',
        'auth/invalid-email': 'Ingresa un correo electrónico válido.',
        'auth/weak-password': 'La contraseña no cumple los requisitos mínimos.'
    }
    return mensajes[error.code] || 'No se pudo completar la operación. Intenta nuevamente.'
}

export async function iniciarSesion(usuario, contrasena) {
    try {
        let correo = usuario.trim()
        const porUsuario = query(usuariosRef, where('nombreUsuario', '==', correo))
        const resultado = await getDocs(porUsuario)
        if (!resultado.empty) correo = resultado.docs[0].data().correo
        await signInWithEmailAndPassword(auth, correo, contrasena)
        return { ok: true }
    } catch (error) {
        return { ok: false, mensaje: mensajeAuth(error) }
    }
}

export async function registrarUsuario(datos) {
    try {
        const existente = await getDocs(query(usuariosRef, where('nombreUsuario', '==', datos.nombreUsuario)))
        if (!existente.empty) {
            return { ok: false, campo: 'nombreUsuario', mensaje: 'Este nombre de usuario ya está en uso.' }
        }

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

export { auth, db, mensajeAuth }
