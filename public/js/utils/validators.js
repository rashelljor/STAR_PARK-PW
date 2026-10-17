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

// Lista de los requisitos que aún no cumple la contraseña, para decirle al
// usuario exactamente qué le falta en vez de repetirle todas las reglas.
// Cada requisito se muestra como una línea de la lista bajo el campo de registro.
export const REQUISITOS_CONTRASENA = [
    { texto: 'Mínimo 8 caracteres', cumple: contrasena => contrasena.length >= 8 },
    { texto: 'Una letra mayúscula', cumple: contrasena => /[A-Z]/.test(contrasena) },
    { texto: 'Una letra minúscula', cumple: contrasena => /[a-z]/.test(contrasena) },
    { texto: 'Un número', cumple: contrasena => /\d/.test(contrasena) }
]

export function requisitosFaltantesContrasena(contrasena = '') {
    return REQUISITOS_CONTRASENA.filter(requisito => !requisito.cumple(contrasena)).map(requisito => requisito.texto.toLowerCase())
}

// Fecha local en formato AAAA-MM-DD. toISOString() usa la hora UTC, que en
// Perú (UTC-5) ya es "mañana" desde las 7 p. m. y bloqueaba reservar para hoy.
function fechaLocal(fecha) {
    return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('-')
}

// Rango de fechas de visita permitido: desde hoy hasta un año después.
export function rangoFechasReserva() {
    const hoy = new Date()
    return {
        minima: fechaLocal(hoy),
        maxima: fechaLocal(new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate()))
    }
}

// Errores de los datos de una reserva (carrito y edición en Mis Reservas).
// Devuelve una lista vacía si todo está bien.
export function erroresDatosReserva({ nombre = '', correo = '', telefono = '', fecha = '' }) {
    const errores = []
    const { minima, maxima } = rangoFechasReserva()

    if (!nombre.trim()) errores.push('Ingresa el nombre de la persona que hace la reserva.')
    if (!esCorreoValido(correo.trim())) errores.push('Ingresa un correo electrónico válido.')
    if (!esTelefonoValido(telefono.replace(/\s/g, ''))) errores.push('Ingresa un teléfono válido de 9 dígitos.')

    if (!fecha) errores.push('Elige la fecha de tu visita.')
    else if (fecha < minima) errores.push('La fecha de visita no puede ser anterior a hoy.')
    else if (fecha > maxima) errores.push('Solo puedes reservar con hasta un año de anticipación.')

    return errores
}

// DNI peruano: 8 dígitos. Carnet de extranjería y pasaporte: 6 a 12 letras o números.
export function esDocumentoValido(tipo, numero) {
    const valor = (numero || '').trim()
    if (tipo === 'DNI') return /^\d{8}$/.test(valor)
    return /^[a-zA-Z0-9]{6,12}$/.test(valor)
}

// Solo alfanumérico, con guiones simples entre bloques.
export function esNombreUsuarioValido(nombreUsuario) {
    return /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/.test(nombreUsuario || '')
}

// Teléfono peruano: 9 dígitos.
export function esTelefonoValido(telefono) {
    return /^\d{9}$/.test(telefono || '')
}
