// miscompras.js — Star Park
let compras = JSON.parse(localStorage.getItem('compras')) || []
let contenedor = document.getElementById('listaCompras')

function mostrarCompras() {
    contenedor.innerHTML = ''

    if (compras.length === 0) {
        contenedor.innerHTML = '<p>No has realizado ninguna compra todavía</p>'
        return
    }

    compras.forEach(function(compra, indice) {
        let detalleItems = ''
        compra.items.forEach(function(item) {
            detalleItems += '<li>' + item.nombre + ' — S/ ' + item.precio + '.00</li>'
        })

        contenedor.innerHTML +=
            '<div>' +
                '<div class="infoFila">' +
                        '<h3">Compra ' + ((indice + 1) < 10 ? '0' + (indice + 1) : (indice + 1)) + '</h3>' +
                        '<p>Boleta de Venta</p>' +
                    '</div>' +
                '</div>' +
                '<div class="infoFila">' +
                    '<p class="em">🧑‍🚀</p>' +
                    '<div>' +
                        '<h3> FAMILY PARK S.A.C. </h3>' +
                        '<p>RUC: 20555297018</p>' +
                    '</div>' +
                '</div>' +
                '<div class="infoFila">' +
                    '<div>' +
                        '<h3>Fecha de emisión</h3>' +
                        '<p>' + compra.fecha + '</p>' +
                    '</div>' +
                '</div>' +
                '<div class="infoFila">' +
                    '<div>' +
                        '<h3>Servicios adquiridos</h3>' +
                        '<ul>' + detalleItems + '</ul>' +
                    '</div>' +
                '</div>' +
                '<div>' +
                    '<h3>TOTAL</h3> <p>' + compra.total + '</p>' +
                    '</div>' +
                '</div>' +
                '<p>¡Gracias por tu preferencia! 🚀</p>' +
            '</div> <br><hr><hr><br>'
    })
}

mostrarCompras()