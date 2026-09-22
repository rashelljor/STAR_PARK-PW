// authService.js - Inicio de sesión y registro para las vistas Vue de
// Login y Registro. Usa las mismas claves de localStorage que
// controller/auth.js ('starparkUsuarios', 'starparkSesion'), que sigue
// activo tal cual en el panel administrativo (admin.html), para que una
// cuenta creada desde cualquiera de los dos lados funcione en el otro.

const CLAVE_USUARIOS = 'starparkUsuarios'
const CLAVE_SESION = 'starparkSesion'

function obtenerUsuarios() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_USUARIOS)) || []
    } catch {
        return []
    }
}

function guardarUsuarios(usuarios) {
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios))
}

// Devuelve { ok: true } o { ok: false, mensaje }.
export function iniciarSesion(usuario, contrasena) {
    const usuarios = obtenerUsuarios()

    const encontrado = usuarios.find(u =>
        u.correo.toLowerCase() === usuario.toLowerCase() ||
        u.nombreUsuario.toLowerCase() === usuario.toLowerCase()
    )

    if (!encontrado || encontrado.contrasena !== contrasena) {
        return { ok: false, mensaje: 'El nombre de usuario, correo o la contraseña son incorrectos.' }
    }

    localStorage.setItem(CLAVE_SESION, encontrado.nombreUsuario)
    return { ok: true }
}

// Devuelve { ok: true } o { ok: false, campo, mensaje } cuando el correo o el
// nombre de usuario ya están en uso (el resto de la validación es de formulario).
export function registrarUsuario(datos) {
    const usuarios = obtenerUsuarios()

    if (usuarios.some(u => u.correo.toLowerCase() === datos.correo.toLowerCase())) {
        return { ok: false, campo: 'correo', mensaje: 'Ya existe una cuenta registrada con este correo electrónico.' }
    }

    if (usuarios.some(u => u.nombreUsuario.toLowerCase() === datos.nombreUsuario.toLowerCase())) {
        return { ok: false, campo: 'nombreUsuario', mensaje: 'Este nombre de usuario ya está en uso.' }
    }

    usuarios.push(datos)
    guardarUsuarios(usuarios)
    return { ok: true }
}
