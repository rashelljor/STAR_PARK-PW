// navegacion.js - Desplazamiento a la sección indicada en la URL (index.html#servicios).
//
// El navegador intenta ir al "#" apenas carga el HTML, pero en este sitio las
// secciones las dibuja Vue después de leer Firestore: en ese momento todavía no
// existen y la página se queda arriba (en celular falla más por la red lenta).
// Las vistas llaman a esta función cuando ya terminaron de dibujar su contenido.

export function irAlHash() {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return null

    const destino = document.getElementById(id)
    if (!destino) return null

    destino.scrollIntoView({ block: 'start' })
    return destino
}
