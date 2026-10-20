// Prefijo del texto que guarda el código QR de cada entrada (STARPARK:<idReserva>).
export const PREFIJO_QR = "STARPARK:";

export const APP_CONFIG = {
    name: "Star Park",
    currency: "PEN",
    country: "PE"
};

// Aforo por defecto (personas por día) mientras el admin no configure otro
// en Panel de control. "Casi lleno" se pinta desde el 80 % de ocupación.
export const AFORO_POR_DEFECTO = 120;
export const UMBRAL_CASI_LLENO = 0.8;

// Imágenes subidas desde el panel y fotos de perfil. Se guardan dentro del
// documento de Firestore (como texto). Es el tamaño recomendado y el máximo:
// las más grandes se reducen sin recortar; las más chicas quedan igual.
export const TAMANOS_IMAGEN = {
    atraccion: { ancho: 1200, alto: 800 },
    servicio: { ancho: 1200, alto: 800 },
    producto: { ancho: 800, alto: 800 },
    perfil: { ancho: 400, alto: 400 }
};
export const PESO_MAXIMO_IMAGEN_MB = 2;
export const FORMATOS_IMAGEN = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP' };

// Millas espaciales: 1 milla por cada S/ 1 pagado. Cada 100 millas canjeadas
// descuentan S/ 5 en el siguiente pago.
// firestore.rules repite estos valores (millasPorSol, millasPorCanje, solesPorCanje):
// si cambias uno aquí, cámbialo también allá o los pagos serán rechazados.
export const MILLAS_POR_SOL = 1;
export const MILLAS_POR_CANJE = 100;
export const SOLES_POR_CANJE = 5;

// Líneas distintas que caben en el carrito. firestore.rules revisa los precios
// línea por línea (no tiene bucles) y solo llega hasta este número.
export const MAX_LINEAS_CARRITO = 5;

// Compras pagadas desde las que un cliente es "frecuente" (también en firestore.rules).
export const COMPRAS_CLIENTE_FRECUENTE = 3;

// Rangos de astronauta según las millas ganadas en total (no se pierden al canjear).
export const RANGOS_ASTRONAUTA = [
    { nombre: 'Cadete Espacial', icono: '🧑‍🚀', desde: 0 },
    { nombre: 'Piloto Estelar', icono: '🚀', desde: 200 },
    { nombre: 'Comandante Galáctico', icono: '🛸', desde: 500 },
    { nombre: 'Leyenda del Universo', icono: '🌟', desde: 1000 }
];

// Correos con EmailJS (https://www.emailjs.com). Mientras estos datos estén
// vacíos el sitio funciona igual, solo que no envía correos.
// La plantilla debe usar las variables {{to_email}}, {{to_name}}, {{asunto}} y {{mensaje}}
// y tener como remitente una dirección no-reply.
export const EMAILJS = {
    publicKey: '',
    serviceId: '',
    templateId: ''
};

// Paquetes de cumpleaños / eventos (formulario propio, no se venden por carrito).
export const PAQUETES_EVENTO = [
    { id: 'lunar', nombre: 'Paquete Lunar', precioPorNino: 35, detalle: '2 horas de juegos, decoración temática y torta pequeña.' },
    { id: 'galactico', nombre: 'Paquete Galáctico', precioPorNino: 50, detalle: '3 horas de juegos, animador, decoración, torta y sorpresas.' },
    { id: 'supernova', nombre: 'Paquete Supernova', precioPorNino: 70, detalle: 'Juegos ilimitados, show espacial, animador, torta, bocaditos y realidad virtual.' }
];

// Cupones sugeridos que el admin puede importar desde Gestión de catálogo y promociones.
export const CUPONES_INICIALES = [
    { codigo: 'BIENVENIDO15', descripcion: '15 % en tu primera compra', descuento: 15, condicion: 'primeraCompra', usosMaximos: 0, activo: true },
    { codigo: 'MISION10', descripcion: '10 % llevando más de 3 juegos', descuento: 10, condicion: 'masDeTresJuegos', usosMaximos: 0, activo: true },
    { codigo: 'FRECUENTE20', descripcion: '20 % para clientes frecuentes (3 compras o más)', descuento: 20, condicion: 'clienteFrecuente', usosMaximos: 0, activo: true }
];

export const CONDICIONES_CUPON = {
    primeraCompra: 'Primera compra',
    masDeTresJuegos: 'Más de 3 juegos en el carrito',
    clienteFrecuente: 'Cliente frecuente (3+ compras)'
};
