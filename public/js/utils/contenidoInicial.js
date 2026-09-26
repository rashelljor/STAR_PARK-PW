// contenidoInicial.js - Contenido que hoy muestra index.html. Se usa como valor
// por defecto de Ubicación/Horarios/Contacto y para importar atracciones y
// servicios a Firestore desde el panel "Contenido institucional".

export const CONTENIDO_INICIAL = {
    ubicacion: 'Sótano del Centro Comercial Constitución, Calle Real 475, Huancayo, Junín - Perú',
    horarios: 'Lun a Vie: 11:00 AM - 10:00 PM | Sáb a Dom: 10:00 AM - 10:00 PM',
    contacto: 'Pronto publicaremos nuestros datos de contacto.'
}

export const ATRACCIONES_INICIALES = [
    {
        nombre: 'AVENTURA ESPACIAL',
        etiqueta: 'INFANTIL',
        descripcion: '¡Diversión 100% segura para pequeños astronautas de 4 a 12 años! Saltarín, trampolín, carritos y tobogán.',
        imagen: '../../assets/img/aventuraespacial01.png'
    },
    {
        nombre: 'MISIÓN MARCIANA',
        etiqueta: 'INFANTIL',
        descripcion: 'Viaja a Marte en una aventura inmersiva: tecnología táctil, sensores interactivos y zona de escalada.',
        imagen: '../../assets/img/misionmarciana01.png'
    },
    {
        nombre: 'LABERINTO DUNBOL',
        etiqueta: 'INFANTIL',
        descripcion: '¡Pone a prueba tus reflejos y tu orientación! Explora caminos llenos de sorpresas y supera el reto en este divertido recorrido.',
        imagen: '../../assets/img/dunbol.png'
    },
    {
        nombre: 'CARRITO CHOCÓN',
        etiqueta: 'FAMILIAR',
        descripcion: '¡Siente la adrenalina y la aceleración! Maneja tu propio auto, esquiva obstáculos y choca en una pista llena de acción y diversión.',
        imagen: '../../assets/img/carrito.png'
    },
    {
        nombre: 'REALIDAD VIRTUAL',
        etiqueta: 'FAMILIAR',
        descripcion: 'Sumérgete en mundos increíbles y experiencias 3D. Vive aventuras inmersivas con tecnología de vanguardia que desafiará tus sentidos.',
        imagen: '../../assets/img/realidadvirtual.png'
    },
    {
        nombre: 'JUEGOS ARCADE',
        etiqueta: 'FAMILIAR',
        descripcion: '¡Diversión retro y moderna para todas las edades! Compite en familia en los mejores juegos arcade.',
        imagen: '../../assets/img/maquinas.png'
    }
]

export const SERVICIOS_INICIALES = [
    {
        nombre: 'SNACKS PREMIUM AERO-ESPACIALES',
        descripcion: 'Visita nuestra confitería y recarga energías con una selección de sabores de otra galaxia.',
        imagen: '../../assets/img/confiteria.png'
    },
    {
        nombre: 'BAZAR INTERGALÁCTICO',
        descripcion: 'Regalos y artículos exclusivos de temática espacial: lapiceros, loncheras, libros y más.',
        imagen: '../../assets/img/vitrina.png'
    },
    {
        nombre: 'CUMPLEAÑOS ESPACIALES',
        descripcion: 'Acceso VIP a todas las atracciones\nSala VIP ambientada como estación espacial\nAnfitrión animador con dinámicas espaciales',
        imagen: '../../assets/img/cumpleaños.png'
    }
]
