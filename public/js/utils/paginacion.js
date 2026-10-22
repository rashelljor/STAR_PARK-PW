// paginacion.js - Tamaño de las tandas de "Ver más" / "Ver menos", igual en el
// sitio y en el panel admin: 6 elementos por vez, 3 en celular.

export const consultaCelular = window.matchMedia('(max-width: 576px)')

export function pasoLista() {
    return consultaCelular.matches ? 3 : 6
}
