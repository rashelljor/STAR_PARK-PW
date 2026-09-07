// reservas.js — Star Park

let reservas = JSON.parse(localStorage.getItem('reservas')) || []
let cuerpo   = document.getElementById('cuerpoTabla')

function mostrarReservas() {
    cuerpo.innerHTML = ''

    if (reservas.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--gris); padding:20px;">No hay reservas aún.</td></tr>'
        mostrarAlerta('No hay reservas aún.', 'info')
        return
    }

    reservas.forEach((reserva, indice) => {
        let estadoPago = '<span class="amarillo">✅ Pagado</span>'
        if (!reserva.pagado) {
            estadoPago = '<button class="botonPagar" onclick="pagar(' + indice + ')">💳 Pagar</button>'
        }

        cuerpo.innerHTML += '<tr>'
            + '<td>' + (indice + 1) + '</td>'
            + '<td>' + reserva.nombre + '</td>'
            + '<td>' + reserva.correo + '</td>'
            + '<td>' + reserva.telefono + '</td>'
            + '<td>' + reserva.fecha + '</td>'
            + '<td class="amarillo">' + reserva.total + '</td>'
            + '<td>' + reserva.fechaRegistro + '</td>'
            + '<td>' + estadoPago + ' <button class="botonEliminar" onclick="eliminar(' + indice + ')">✕ Quitar</button></td>'
            + '</tr>'
    })
}

// Marca la reserva como pagada y la guarda como compra
function pagar(indice) {
    let reserva = reservas[indice]

    let compras = JSON.parse(localStorage.getItem('compras')) || []
    let compra = {
        'nombre' : reserva.nombre,
        'items'  : reserva.items,
        'total'  : reserva.total,
        'fecha'  : reserva.fechaRegistro,
    }
    compras.push(compra)
    localStorage.setItem('compras', JSON.stringify(compras))

    reserva.pagado = true
    localStorage.setItem('reservas', JSON.stringify(reservas))

    mostrarReservas()
    alert('¡Pago confirmado! Revisa "Mis Compras" 🚀')
}


function eliminar(indice) {
    reservas.splice(indice, 1)
    localStorage.setItem('reservas', JSON.stringify(reservas))
    mostrarReservas()
    mostrarAlerta('Reserva eliminada correctamente.', 'success')
}
mostrarReservas()