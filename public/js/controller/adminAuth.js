import { auth, db } from '../config/firebaseConfig.js'
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { mensajeAuth, resolverCorreo } from '../services/authService.js'
import { notificar, notificarAlCargar } from '../utils/notificaciones.js'

const formulario = document.getElementById('formLogin')
const boton = formulario?.querySelector('button[type="submit"]')

// Mientras el formulario procesa un inicio de sesión, la redirección la hace
// el propio formulario (para dejar antes el mensaje de bienvenida).
let iniciandoSesion = false

function mostrarError(mensaje) {
    notificar(mensaje, 'error')
}

async function esAdministrador(usuario) {
    const perfil = await getDoc(doc(db, 'usuarios', usuario.uid))
    return perfil.exists() && perfil.data().rol === 'admin'
}

formulario?.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    boton.disabled = true

    const usuario = document.getElementById('usuario').value.trim()
    const contrasena = document.getElementById('contrasena').value

    if (!usuario || !contrasena) {
        mostrarError('Ingresa tu correo o nombre de usuario y tu contraseña.')
        boton.disabled = false
        return
    }

    const resuelto = await resolverCorreo(usuario)
    if (!resuelto.ok) {
        mostrarError(resuelto.mensaje)
        boton.disabled = false
        return
    }

    iniciandoSesion = true
    try {
        const credencial = await signInWithEmailAndPassword(auth, resuelto.correo, contrasena)
        if (!await esAdministrador(credencial.user)) {
            await signOut(auth)
            mostrarError('Esta cuenta no tiene permisos de administrador.')
            return
        }
        notificarAlCargar('Bienvenido al panel de administración.', 'exito')
        window.location.href = 'control.html'
    } catch (error) {
        // Las cuentas de administrador no se crean desde el sitio: sin sugerir "Crear cuenta".
        mostrarError(error.code === 'auth/invalid-credential'
            ? 'El usuario o la contraseña son incorrectos. Revisa que la contraseña respete mayúsculas y minúsculas.'
            : mensajeAuth(error))
    } finally {
        iniciandoSesion = false
        boton.disabled = false
    }
})

onAuthStateChanged(auth, async (usuario) => {
    if (iniciandoSesion) return
    if (usuario && await esAdministrador(usuario)) {
        window.location.href = 'control.html'
    }
})
