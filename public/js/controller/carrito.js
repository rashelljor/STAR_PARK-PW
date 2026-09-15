// carrito.js - Controla el carrito y el registro de reservas.

// Elemento principal del formulario.
let formularioCarrito = document.getElementById('formularioCarrito')

// Recupera los datos guardados en el navegador.
// Si no existe información, comienza con listas vacías.
let carrito = JSON.parse(localStorage.getItem('carrito')) || []
let reservas = JSON.parse(localStorage.getItem('reservas')) || []

// Impide seleccionar una fecha anterior al día actual.
let fechaActual = new Date()
let anioActual = fechaActual.getFullYear()
let mesActual = String(fechaActual.getMonth() + 1).padStart(2, '0')
let diaActual = String(fechaActual.getDate()).padStart(2, '0')
let fechaMinima = anioActual + '-' + mesActual + '-' + diaActual

document.getElementById('fecha').min = fechaMinima

// Muestra los productos guardados y calcula el total.
function mostrarCarrito() {
    let lista = document.getElementById('listaCarrito')
    let total = 0

    lista.innerHTML = ''

    carrito.forEach((item, indice) => {
        total += item.precio
        lista.innerHTML += '<p class="itemCarrito">' + item.nombre + ' — S/ ' + item.precio + '.00'
            + ' <button type="button" onclick="eliminar(' + indice + ')">Eliminar</button></p>'
    })

    // Actualiza el total visible en la página.
    document.getElementById('totalPrecio').textContent = 'S/ ' + total + '.00'
}

// Elimina un producto según la posición que ocupa en el carrito.
function eliminar(indice) {
    carrito.splice(indice, 1)
    localStorage.setItem('carrito', JSON.stringify(carrito))
    mostrarCarrito()
}

// Crea y guarda una nueva reserva.
function guardar() {
    // No permite reservar si no hay productos seleccionados.
    if (carrito.length === 0) {
        alert('Tu carrito está vacío.')
        return
    }

    // Reúne los datos escritos en el formulario.
    let reserva = {
        nombre: document.getElementById('nombre').value,
        correo: document.getElementById('correo').value,
        telefono: document.getElementById('telefono').value,
        fecha: document.getElementById('fecha').value,
        total: document.getElementById('totalPrecio').textContent,
        items: carrito,
        pagado: false,
        fechaRegistro: new Date().toLocaleString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    // Guarda la reserva y limpia el carrito anterior.
    reservas.push(reserva)
    localStorage.setItem('reservas', JSON.stringify(reservas))
    localStorage.removeItem('carrito')
    carrito = []

    alert('¡Reserva confirmada!')
    formularioCarrito.reset()
    mostrarCarrito()
}

// Intercepta el envío para guardar la reserva con JavaScript.
formularioCarrito.addEventListener('submit', (e) => {
    e.preventDefault()
    guardar()
})

// Carga el contenido inicial al abrir la página.
mostrarCarrito()