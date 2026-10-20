// tema.js - Modo oscuro (diseño original, por defecto) y modo claro opcional.
// El tema elegido se guarda en este navegador y se aplica con
// <html data-theme="light">; los colores del modo claro están en assets/css/tema.css.

const CLAVE = 'starpark:tema'

export function temaActual() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function aplicarTema(tema) {
    if (tema === 'light') document.documentElement.dataset.theme = 'light'
    else delete document.documentElement.dataset.theme
    try {
        localStorage.setItem(CLAVE, tema)
    } catch {
        // Sin almacenamiento (modo privado estricto): el tema dura solo esta visita.
    }
}

export function alternarTema() {
    const nuevo = temaActual() === 'light' ? 'dark' : 'light'
    aplicarTema(nuevo)
    return nuevo
}

// Se aplica apenas se importa el módulo, antes de montar la vista.
try {
    if (localStorage.getItem(CLAVE) === 'light') document.documentElement.dataset.theme = 'light'
} catch {
    // Ignorado: se queda el tema oscuro por defecto.
}
