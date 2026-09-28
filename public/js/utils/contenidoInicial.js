// contenidoInicial.js - Contenido que hoy muestra index.html. Se usa como valor
// por defecto de Ubicación/Horarios/Contacto y para importar atracciones y
// servicios a Firestore (y productos del catálogo) desde el panel "Contenido institucional".

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

export const PRODUCTOS_INICIALES = [
    {
        id: 'promo-exploradores',
        nombre: 'Exploradores Espaciales',
        descripcion: '3 tickets para ingresar a "Aventura espacial" por 20 minutos',
        categoria: 'promociones',
        precio: 45,
        duracion: '20 minutos',
        imagen: '../../assets/img/vis02.png',
        alt: 'Niños en el trampolín, Aventura Espacial',
        estado: 'Activo'
    },
    {
        id: 'promo-astronautas',
        nombre: 'Astronautas en Marte',
        descripcion: '2 tickets para ingresar a "Misión Marciana" por 30 minutos',
        categoria: 'promociones',
        precio: 40,
        duracion: '30 minutos',
        imagen: '../../assets/img/vis03.png',
        alt: 'área de tobogán y columpios, Misión Marciana',
        estado: 'Activo'
    },
    {
        id: 'promo-piloto',
        nombre: 'Piloto de Estrellas',
        descripcion: '1 Ticket para ingresar a todos los juegos del parque por todo el tiempo que desees',
        categoria: 'promociones',
        precio: 60,
        duracion: 'todo el tiempo',
        imagen: '../../assets/img/vis04.png',
        alt: 'Niño en la cabina de control de la nave, Aventura Espacial',
        estado: 'Activo'
    },
    {
        id: 'botin-marciana-15',
        nombre: 'Misión Marciana',
        descripcion: '15 minutos',
        categoria: 'botin',
        precio: 15,
        duracion: '15 minutos',
        imagen: '../../assets/img/misionmarciana01.png',
        alt: 'Piscina de pelotas y sensores, Misión Marciana',
        estado: 'Activo'
    },
    {
        id: 'botin-marciana-30',
        nombre: 'Misión Marciana',
        descripcion: '30 minutos',
        categoria: 'botin',
        precio: 25,
        duracion: '30 minutos',
        imagen: '../../assets/img/misionmarciana02.png',
        alt: 'Bloques armables, piscina de pelotas y árbol para escalar, Misión Marciana',
        estado: 'Activo'
    },
    {
        id: 'botin-espacial-20',
        nombre: 'Aventura Espacial',
        descripcion: '20 minutos',
        categoria: 'botin',
        precio: 20,
        duracion: '20 minutos',
        imagen: '../../assets/img/aventuraespacial02.png',
        alt: 'Entrada y área de espera para padres, Aventura Espacial',
        estado: 'Activo'
    },
    {
        id: 'botin-espacial-30',
        nombre: 'Aventura Espacial',
        descripcion: '30 minutos',
        categoria: 'botin',
        precio: 25,
        duracion: '30 minutos',
        imagen: '../../assets/img/aventuraespacial01.png',
        alt: 'Área de juegos, Aventura Espacial',
        estado: 'Activo'
    },
    {
        id: 'botin-ilimitada',
        nombre: 'Aventura Ilimitada',
        descripcion: '1 hora',
        categoria: 'botin',
        precio: 45,
        duracion: '1 hora',
        imagen: '../../assets/img/vis05.png',
        alt: 'Entrada del parque, Star Park',
        estado: 'Activo'
    },
    {
        id: 'botin-cumple',
        nombre: 'Cumpleaños Espacial',
        descripcion: 'Evento completo',
        categoria: 'botin',
        precio: 1200,
        duracion: 'evento completo',
        imagen: '../../assets/img/cumpleaños.png',
        alt: 'Cumpleaños Espaciales, ejemplo de decoración y animación',
        estado: 'Activo'
    }
]
