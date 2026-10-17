// notificaciones.js - Mensajes unificados del sitio (usuarios y administración).
// Reemplaza alert() y confirm(): muestra una tarjeta en el centro de la pantalla
// con un color distinto según el tipo de mensaje. Los estilos están en
// componentes.css (sección "Mensajes centrados").
//
//   await notificar('Reserva confirmada', 'exito')
//   if (await confirmar('¿Eliminar este registro?')) { ... }

const TIPOS = {
    exito: { titulo: '¡Listo!', icono: '✓' },
    error: { titulo: 'Algo salió mal', icono: '✕' },
    advertencia: { titulo: 'Atención', icono: '!' },
    info: { titulo: 'Información', icono: 'i' }
}

// Los mensajes de éxito se cierran solos; el resto espera a que el usuario los lea.
const CIERRE_AUTOMATICO_MS = 3000

let cerrarActual = null

function abrir({ mensaje, tipo, botones, autoCerrar }) {
    // Solo un mensaje a la vez: si hay uno abierto se cierra antes de mostrar el nuevo.
    if (cerrarActual) cerrarActual(false)

    const config = TIPOS[tipo] || TIPOS.info
    const focoAnterior = document.activeElement

    const fondo = document.createElement('div')
    fondo.className = 'mensajeFondo'
    fondo.innerHTML = `
        <div class="mensajeCaja mensaje-${tipo in TIPOS ? tipo : 'info'}" role="alertdialog" aria-modal="true" aria-labelledby="mensajeTitulo" aria-describedby="mensajeTexto">
            <div class="mensajeIcono" aria-hidden="true">${config.icono}</div>
            <h2 class="mensajeTitulo" id="mensajeTitulo"></h2>
            <div class="mensajeTexto" id="mensajeTexto"></div>
            <div class="mensajeAcciones"></div>
            ${autoCerrar ? `<div class="mensajeProgreso" style="animation-duration:${CIERRE_AUTOMATICO_MS}ms"></div>` : ''}
        </div>`

    fondo.querySelector('.mensajeTitulo').textContent = config.titulo
    const texto = fondo.querySelector('.mensajeTexto')
    // Una lista de mensajes (por ejemplo, errores de un formulario) se muestra como viñetas.
    if (Array.isArray(mensaje)) {
        const lista = document.createElement('ul')
        mensaje.forEach(linea => {
            const item = document.createElement('li')
            item.textContent = linea
            lista.appendChild(item)
        })
        texto.appendChild(lista)
    } else {
        texto.textContent = mensaje
    }

    const acciones = fondo.querySelector('.mensajeAcciones')
    botones.forEach(({ texto: etiqueta, valor, clase }) => {
        const boton = document.createElement('button')
        boton.type = 'button'
        boton.className = clase
        boton.textContent = etiqueta
        boton.onclick = () => cerrarActual(valor)
        acciones.appendChild(boton)
    })

    return new Promise(resolver => {
        let temporizador = null

        const alPresionarTecla = evento => {
            if (evento.key === 'Escape') cerrarActual(false)
        }

        cerrarActual = valor => {
            clearTimeout(temporizador)
            document.removeEventListener('keydown', alPresionarTecla)
            fondo.classList.add('mensajeSaliendo')
            setTimeout(() => fondo.remove(), 150)
            cerrarActual = null
            focoAnterior?.focus?.()
            resolver(valor)
        }

        fondo.addEventListener('click', evento => {
            if (evento.target === fondo) cerrarActual(false)
        })
        document.addEventListener('keydown', alPresionarTecla)
        document.body.appendChild(fondo)
        // En confirmaciones el foco queda en "Cancelar" para no borrar algo con un Enter accidental.
        acciones.firstElementChild.focus()

        if (autoCerrar) temporizador = setTimeout(() => cerrarActual?.(true), CIERRE_AUTOMATICO_MS)
    })
}

// Muestra un mensaje. tipo: 'exito' | 'error' | 'advertencia' | 'info'.
// Devuelve una promesa que se resuelve al cerrarse (útil antes de redirigir).
export function notificar(mensaje, tipo = 'info') {
    return abrir({
        mensaje,
        tipo,
        autoCerrar: tipo === 'exito',
        botones: [{ texto: 'Aceptar', valor: true, clase: 'mensajeBoton' }]
    })
}

// Pide confirmación. Devuelve true si el usuario acepta y false si cancela.
export function confirmar(mensaje, { textoConfirmar = 'Aceptar', textoCancelar = 'Cancelar', tipo = 'advertencia' } = {}) {
    return abrir({
        mensaje,
        tipo,
        autoCerrar: false,
        botones: [
            { texto: textoCancelar, valor: false, clase: 'mensajeBoton mensajeBotonSecundario' },
            { texto: textoConfirmar, valor: true, clase: 'mensajeBoton' }
        ]
    })
}

// Guarda un mensaje para mostrarlo al cargar la siguiente página. Se usa justo
// antes de redirigir (login, cierre de sesión...) para no retrasar la navegación.
const CLAVE_PENDIENTE = 'starpark:mensajePendiente'

export function notificarAlCargar(mensaje, tipo = 'info') {
    try {
        sessionStorage.setItem(CLAVE_PENDIENTE, JSON.stringify({ mensaje, tipo }))
    } catch {
        // Sin almacenamiento disponible (modo privado estricto): el mensaje simplemente no se muestra.
    }
}

function mostrarPendiente() {
    try {
        const guardado = sessionStorage.getItem(CLAVE_PENDIENTE)
        if (!guardado) return
        sessionStorage.removeItem(CLAVE_PENDIENTE)
        const { mensaje, tipo } = JSON.parse(guardado)
        notificar(mensaje, tipo)
    } catch {
        // Ignorado a propósito: un mensaje pendiente ilegible no debe romper la página.
    }
}

// Avisa una sola vez si se pierde la conexión: sin internet, Firebase deja las
// operaciones en espera y el usuario no recibiría ninguna respuesta.
let sinConexion = false

window.addEventListener('offline', () => {
    sinConexion = true
    notificar('Perdiste la conexión a internet. Tus cambios se guardarán cuando vuelvas a conectarte.', 'advertencia')
})

window.addEventListener('online', () => {
    if (!sinConexion) return
    sinConexion = false
    notificar('Conexión restablecida.', 'exito')
})

mostrarPendiente()
