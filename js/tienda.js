// tienda.js - Agrega productos al carrito de compra.

// Recupera el carrito guardado en el navegador.
// Si todavía no existe, comienza con una lista vacía.
let productosCarrito = JSON.parse(localStorage.getItem('carrito')) || []

// Recibe el nombre y el precio del producto seleccionado.
function agregarAlCarrito(nombre, precio) {
    // Crea un objeto con la información básica del producto.
    let producto = {
        nombre: nombre,
        precio: precio
    }

    // Agrega el producto a la lista actual.
    productosCarrito.push(producto)

    // Guarda nuevamente la lista para conservarla al cambiar de página.
    localStorage.setItem('carrito', JSON.stringify(productosCarrito))

    // Confirma al usuario que el producto fue agregado.
    alert(nombre + ' añadido al carrito')
}