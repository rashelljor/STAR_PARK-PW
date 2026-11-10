// imageService.js - Prepara las imágenes que se suben (panel y foto de perfil).
// No usa Firebase Storage: la imagen se reduce y comprime en el navegador y se
// guarda como texto (data URL) en el mismo documento de Firestore, que admite
// hasta 1 MB por documento.

import { TAMANOS_IMAGEN, PESO_MAXIMO_IMAGEN_MB, FORMATOS_IMAGEN } from '../utils/constants.js'

// Margen para que el documento (imagen + resto de campos) no pase de 1 MB.
const LARGO_MAXIMO = 700 * 1024

// Texto de ayuda que se muestra bajo cada selector de imagen.
export function indicacionImagen(tipo) {
    const { ancho, alto } = TAMANOS_IMAGEN[tipo]
    return `Recomendado: ${ancho} × ${alto} px (cualquier tamaño se ajusta solo) · ${Object.values(FORMATOS_IMAGEN).join(', ')} · máx. ${PESO_MAXIMO_IMAGEN_MB} MB`
}

export function formatosAceptados() {
    return Object.keys(FORMATOS_IMAGEN).join(',')
}

// Valida formato y peso, y si la imagen es más grande que el tamaño del tipo la
// reduce conservando su proporción (sin recortar ni agrandar). Las tarjetas del
// sitio la encuadran con object-fit: cover, así que cualquier proporción sirve.
export async function prepararImagen(archivo, tipo) {
    if (!FORMATOS_IMAGEN[archivo.type]) throw new Error('Formato no permitido. Usa ' + Object.values(FORMATOS_IMAGEN).join(', ') + '.')
    if (archivo.size > PESO_MAXIMO_IMAGEN_MB * 1024 * 1024) {
        throw new Error(`La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${PESO_MAXIMO_IMAGEN_MB} MB.`)
    }

    const { ancho, alto } = TAMANOS_IMAGEN[tipo]
    const original = await createImageBitmap(archivo).catch(() => { throw new Error('No se pudo leer la imagen. Prueba con otro archivo.') })

    const escala = Math.min(1, ancho / original.width, alto / original.height)
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(original.width * escala)
    lienzo.height = Math.round(original.height * escala)
    lienzo.getContext('2d').drawImage(original, 0, 0, lienzo.width, lienzo.height)
    original.close()

    // WEBP conserva la transparencia; si el navegador no lo genera, se usa JPG.
    let calidad = 0.85
    let imagen = lienzo.toDataURL('image/webp', calidad)
    const formato = imagen.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
    while (formato === 'image/jpeg' || imagen.length > LARGO_MAXIMO) {
        imagen = lienzo.toDataURL(formato, calidad)
        if (imagen.length <= LARGO_MAXIMO || calidad <= 0.4) break
        calidad -= 0.1
    }
    if (imagen.length > LARGO_MAXIMO) throw new Error('La imagen es demasiado detallada para guardarse. Prueba con otra.')
    return imagen
}
