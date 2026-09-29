import { auth, db } from '../config/firebaseConfig.js'
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const formulario = document.getElementById('formLogin')
const errorGeneral = document.getElementById('errorGeneral')
const boton = formulario?.querySelector('button[type="submit"]')

function mostrarError(mensaje) {
    if (errorGeneral) errorGeneral.textContent = mensaje
}

function mensajeError(error) {
    if (error.code === 'auth/invalid-credential') 
    return 'El correo o la contraseña son incorrectos.'
    return 'No se pudo iniciar sesión. Intenta nuevamente.'
}

async function esAdministrador(usuario) {
    const perfil = await getDoc(doc(db, 'usuarios', usuario.uid))
    return perfil.exists() && perfil.data().rol === 'admin'
}

formulario?.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    mostrarError('')
    boton.disabled = true

    const correo = document.getElementById('usuario').value.trim()
    const contrasena = document.getElementById('contrasena').value

    if (!correo || !contrasena) {
        mostrarError('Ingresa tu correo y contraseña.')
        boton.disabled = false
        return
    }

    if (!correo.includes('@')) {
        mostrarError('Ingresa tu correo electrónico de administrador.')
        boton.disabled = false
        return
    }

    try {
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
