import { auth, db } from '../config/firebaseConfig.js'
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const formulario = document.getElementById('formLogin')
const errorGeneral = document.getElementById('errorGeneral')
const boton = formulario?.querySelector('button[type="submit"]')

function mostrarError(mensaje) {
    if (errorGeneral) errorGeneral.textContent = mensaje
}

function mensajeError(error) {
    if (error.code === 'auth/invalid-credential') return 'El correo o la contraseña son incorrectos.'
    return 'No se pudo iniciar sesión. Intenta nuevamente.'
}

async function esAdministrador(usuario) {
    const perfil = await getDoc(doc(db, 'usuarios', usuario.uid))
    return perfil.exists() && perfil.data().rol === 'admin'
}

async function obtenerCorreo(identificador) {
    if (identificador.includes('@')) return identificador
    const resultado = await getDocs(query(
        collection(db, 'usuarios'),
        where('nombreUsuario', '==', identificador)
    ))
    return resultado.empty ? identificador : resultado.docs[0].data().correo
}

formulario?.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    mostrarError('')
    boton.disabled = true

    const identificador = document.getElementById('usuario').value.trim()
    const contrasena = document.getElementById('contrasena').value

    if (!identificador || !contrasena) {
        mostrarError('Ingresa tu correo y contraseña.')
        boton.disabled = false
        return
    }

    try {
        const correo = await obtenerCorreo(identificador)
        const credencial = await signInWithEmailAndPassword(auth, correo, contrasena)
        if (!await esAdministrador(credencial.user)) {
            await signOut(auth)
            mostrarError('Esta cuenta no tiene permisos de administrador.')
            return
        }
        window.location.href = 'control.html'
    } catch (error) {
        mostrarError(mensajeError(error))
    } finally {
        boton.disabled = false
    }
})

onAuthStateChanged(auth, async (usuario) => {
    if (usuario && await esAdministrador(usuario)) {
        window.location.href = 'control.html'
    }
})
