// carrito.js - Star Park

let formularioCarrito = document.getElementById('formularioCarrito')

let carrito = JSON.parse(localStorage.getItem('carrito')) || []
let reservas = JSON.parse(localStorage.getItem('reservas')) || []


// Bloquear fechas anteriores a la fecha actual

let hoy = new Date()    
let anio = hoy.getFullYear()
let mes = String(hoy.getMonth() + 1).padStart(2, '0')
let dia = String(hoy.getDate()).padStart(2, '0')

document.getElementById('fecha').min = anio + '-' + mes + '-' + dia


// Mostrar los productos agregados al carrito

function mostrarCarrito() {

    let lista = document.getElementById('listaCarrito')
    let total = 0

    lista.innerHTML = ''


    carrito.forEach(function(producto, indice) {

        total = total + producto.precio

        lista.innerHTML +=
            '<p class="itemCarrito">' +
            producto.nombre +
            ' — S/ ' +
            producto.precio +
            '.00 ' +
            '<button onclick="eliminar(' + indice + ')">✕</button>' +
            '</p>'

    })


    document.getElementById('totalPrecio').textContent =
        'S/ ' + total + '.00'
}


// Eliminar un producto del carrito

function eliminar(indice) {

    carrito.splice(indice, 1)

    localStorage.setItem(
        'carrito',
        JSON.stringify(carrito)
    )

    mostrarCarrito()
}


// Guardar la reserva

function guardar() {

    // Verificar si el carrito está vacío

    if (carrito.length === 0) {

        alert('Tu carrito está vacío.')

        return
    }


    // Obtener los datos del formulario

    let nombre = document.getElementById('nombre').value
    let correo = document.getElementById('correo').value
    let telefono = document.getElementById('telefono').value
    let fecha = document.getElementById('fecha').value


    // Validar que los campos estén completos

    if (nombre === '' || correo === '' || telefono === '' || fecha === '') {

        alert('Por favor, completa todos los campos.')

        return
    }


    // Crear la reserva

    let reserva = {

        nombre: nombre,
        correo: correo,
        telefono: telefono,
        fecha: fecha,
        total: document.getElementById('totalPrecio').textContent,
        fechaRegistro: new Date().toLocaleDateString('es-PE')

    }


    // Guardar la reserva

    reservas.push(reserva)

    localStorage.setItem(
        'reservas',
        JSON.stringify(reservas)
    )


    // Vaciar el carrito

    localStorage.removeItem('carrito')

    carrito = []


    // Mostrar mensaje

    alert('¡Reserva confirmada!')


    // Limpiar formulario y actualizar carrito

    formularioCarrito.reset()

    mostrarCarrito()

}


// Detectar el envío del formulario

formularioCarrito.addEventListener('submit', function(evento) {

    evento.preventDefault()

    guardar()

})


// Mostrar el carrito al cargar la página

mostrarCarrito()