// reservas.js - Administra las reservas registradas.

// Recupera las reservas guardadas en el navegador.
let reservasGuardadas = JSON.parse(localStorage.getItem('reservas')) || []
let cuerpoTabla = document.getElementById('cuerpoTabla')
let contenedorAlertas = document.getElementById('alertContainer')

// Muestra un mensaje dentro del contenedor de alertas.
function mostrarAlerta(mensaje, tipo) {
    contenedorAlertas.innerHTML = '<div class="alert alert-' + tipo + '" role="alert">'
        + mensaje + '</div>'
}

// Limpia la tabla y muestra todas las reservas guardadas.
function mostrarReservas() {
    cuerpoTabla.innerHTML = ''

    // Mensaje que aparece cuando todavía no hay reservas.
    if (reservasGuardadas.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--gris); padding:20px;">No hay reservas aún.</td></tr>'
        mostrarAlerta('No hay reservas aún.', 'info')
        return
    }

    // Crea una fila de la tabla por cada reserva.
    reservasGuardadas.forEach((reserva, indice) => {
        let estadoPago = '<span class="amarillo">Pagado</span>'

        if (!reserva.pagado) {
            estadoPago = '<button class="botonPagar" onclick="pagar(' + indice + ')">Pagar</button>'
        }

        cuerpoTabla.innerHTML += `
            <tr>
                <td>${indice + 1}</td>
                <td>${reserva.nombre}</td>
                <td>${reserva.correo}</td>
                <td>${reserva.telefono}</td>
                <td>${reserva.fecha}</td>
                <td class="amarillo">${reserva.total}</td>
                <td>${reserva.fechaRegistro}</td>
                <td>
                    ${estadoPago}
                    <button class="botonEliminar" onclick="eliminar(${indice})">Quitar</button>
                </td>
            </tr>
        `
    })
}

// Marca la reserva como pagada y la copia a Mis Compras.
function pagar(indice) {
    let reserva = reservasGuardadas[indice]

    // Recupera las compras existentes antes de agregar la nueva.
    let comprasGuardadas = JSON.parse(localStorage.getItem('compras')) || []
    let compra = {
        nombre: reserva.nombre,
        items: reserva.items,
        total: reserva.total,
        fecha: reserva.fechaRegistro
    }
    comprasGuardadas.push(compra)
    localStorage.setItem('compras', JSON.stringify(comprasGuardadas))

    reserva.pagado = true
    localStorage.setItem('reservas', JSON.stringify(reservasGuardadas))

    mostrarReservas()
    alert('Pago confirmado. Revisa Mis Compras.')
}

// Elimina una reserva según su posición en la tabla.
function eliminar(indice) {
    reservasGuardadas.splice(indice, 1)
    localStorage.setItem('reservas', JSON.stringify(reservasGuardadas))
    mostrarReservas()
    mostrarAlerta('Reserva eliminada correctamente.', 'success')
}

// Muestra la información inicial al abrir la página.
mostrarReservas()