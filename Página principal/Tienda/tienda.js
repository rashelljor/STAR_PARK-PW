// tienda.js — Star Park
let carrito = JSON.parse(localStorage.getItem('carrito')) || []

function agregarAlCarrito(nombre, precio) {
    let item = {
        'nombre' : nombre,
        'precio' : precio
    }

    carrito.push(item)

    localStorage.setItem('carrito', JSON.stringify(carrito))
    
    alert(nombre + ' añadido al carrito ✅')
}