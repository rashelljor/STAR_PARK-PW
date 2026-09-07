// carrito.js — Star Park
let formularioCarrito = document.getElementById('formularioCarrito')
let carrito  = JSON.parse(localStorage.getItem('carrito'))  || []
let reservas = JSON.parse(localStorage.getItem('reservas')) || []


// Bloquea fechas pasadas en el input de fecha
let hoy = new Date()
let anio = hoy.getFullYear()
let mes  = String(hoy.getMonth() + 1).padStart(2, '0')
let dia  = String(hoy.getDate()).padStart(2, '0')
document.getElementById('fecha').min = anio + '-' + mes + '-' + dia


function mostrarCarrito() {
    let lista = document.getElementById('listaCarrito')
    lista.innerHTML = ''
    let total = 0


    carrito.forEach((item, indice) => {
        total = total + item.precio
        lista.innerHTML += '<p class="itemCarrito">' + item.nombre + ' — S/ ' + item.precio + '.00'
            + ' <button onclick="eliminar(' + indice + ')">✕</button></p>'
    })


    document.getElementById('totalPrecio').textContent = 'S/ ' + total + '.00'
}


function eliminar(indice) {
    carrito.splice(indice, 1)
    localStorage.setItem('carrito', JSON.stringify(carrito))
    mostrarCarrito()
}


function guardar() {
    if (carrito.length === 0) {
        alert('Tu carrito está vacío.')
        return
    }


    let reserva = {
        'nombre'       : document.getElementById('nombre').value,
        'correo'       : document.getElementById('correo').value,
        'telefono'     : document.getElementById('telefono').value,
        'fecha'        : document.getElementById('fecha').value,
        'total'        : document.getElementById('totalPrecio').textContent,
        'fechaRegistro': new Date().toLocaleDateString('es-PE')
    }


    reservas.push(reserva)
    localStorage.setItem('reservas', JSON.stringify(reservas))
    localStorage.removeItem('carrito')
    carrito = []


    alert('¡Reserva confirmada! 🚀')
    formularioCarrito.reset()
    mostrarCarrito()
}


formularioCarrito.addEventListener('submit', (e) => {
    e.preventDefault()
    guardar()
})


mostrarCarrito()
