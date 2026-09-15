// miscompras.js - Muestra las compras confirmadas por el usuario.

// Recupera las compras guardadas en el navegador.
let comprasGuardadas = JSON.parse(localStorage.getItem('compras')) || []
let listaCompras = document.getElementById('listaCompras')

// Limpia el contenedor y dibuja nuevamente todas las compras.
function mostrarCompras() {
    listaCompras.innerHTML = ''

    // Muestra un mensaje cuando todavía no existen compras.
    if (comprasGuardadas.length === 0) {
        listaCompras.innerHTML = '<p>No has realizado ninguna compra todavía</p>'
        return
    }

    // Recorre cada compra guardada.
    comprasGuardadas.forEach(function(compra, indice) {
        let listaProductos = ''

        // Convierte cada producto en un elemento de lista.
        compra.items.forEach(function(item) {
            listaProductos += '<li>' + item.nombre + ' — S/ ' + item.precio + '.00</li>'
        })

        // Formatea el número de compra con dos dígitos.
        let numeroCompra = (indice + 1).toString().padStart(2, '0')

        // Plantilla visual de una compra registrada.
        listaCompras.innerHTML += `
            <div>
                <div class="infoFila">
                    <h3>Compra ${numeroCompra}</h3>
                    <p>Boleta de Venta</p>
                </div>

                <div class="infoFila">
                    <p class="em">Cliente</p>
                    <div>
                        <h3>FAMILY PARK S.A.C.</h3>
                        <p>RUC: 20555297018</p>
                    </div>
                </div>

                <div class="infoFila">
                    <div>
                        <h3>Fecha de emisión</h3>
                        <p>${compra.fecha}</p>
                    </div>
                </div>

                <div class="infoFila">
                    <div>
                        <h3>Servicios adquiridos</h3>
                        <ul>${listaProductos}</ul>
                    </div>
                </div>

                <div>
                    <h3>TOTAL</h3>
                    <p>${compra.total}</p>
                </div>

                <p>¡Gracias por tu preferencia!</p>
            </div>
            <br>
            <hr>
            <hr>
            <br>
        `
    })
}

// Ejecuta la función al cargar la página.
mostrarCompras()