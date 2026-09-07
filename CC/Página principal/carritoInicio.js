const botonesCarrito = document.querySelectorAll('.agregarCarrito')

botonesCarrito.forEach((boton) => {
    boton.addEventListener('click', () => {
        const carrito = JSON.parse(localStorage.getItem('carrito')) || []
        const producto = {
            nombre: boton.dataset.nombre,
            precio: Number(boton.dataset.precio)
        }

        carrito.push(producto)
        localStorage.setItem('carrito', JSON.stringify(carrito))
        boton.textContent = 'Agregado'

        setTimeout(() => {
            boton.textContent = 'Agregar'
        }, 1200)
    })
})
