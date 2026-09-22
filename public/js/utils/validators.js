// validators.js - Reglas de validación reutilizadas por los formularios de autenticación.
// Mismas reglas que usaba controller/auth.js, expuestas como funciones puras
// para que las vistas de Login y Registro las puedan importar.

export function esCorreoValido(correo) {
    return typeof correo === 'string' && correo.includes('@')
}

// Al menos 8 caracteres, con una minúscula, una mayúscula y un número.
export function esContrasenaValida(contrasena) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(contrasena || '')
}

// Solo alfanumérico, con guiones simples entre bloques.
export function esNombreUsuarioValido(nombreUsuario) {
    return /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/.test(nombreUsuario || '')
}

// Teléfono peruano: 9 dígitos.
export function esTelefonoValido(telefono) {
    return /^\d{9}$/.test(telefono || '')
}
