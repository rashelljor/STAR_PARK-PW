// auth.js
// Script compartido por login.html y registro.html.
// Guarda los usuarios registrados en localStorage (solo para fines de práctica/demo,
// sin backend real ni cifrado de contraseñas).

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const formRegistro = document.getElementById('formRegistro');

    if (formLogin) inicializarLogin(formLogin);
    if (formRegistro) inicializarRegistro(formRegistro);
});

// ---------- Utilidades para la "base de datos" de usuarios ----------
function obtenerUsuarios() {
    try {
        return JSON.parse(localStorage.getItem('starparkUsuarios')) || [];
    } catch {
        return [];
    }
}

function guardarUsuarios(usuarios) {
    localStorage.setItem('starparkUsuarios', JSON.stringify(usuarios));
}

function mostrarError(idMensaje, texto) {
    const elemento = document.getElementById(idMensaje);
    if (elemento) elemento.textContent = texto;
}

function limpiarErrores(...ids) {
    ids.forEach(id => mostrarError(id, ''));
}

// ---------- INICIAR SESIÓN ----------
function inicializarLogin(form) {
    form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        limpiarErrores('errorUsuario', 'errorContrasena', 'errorGeneral');

        const usuario = document.getElementById('usuario').value.trim();
        const contrasena = document.getElementById('contrasena').value;

        let tieneError = false;

        if (!usuario) {
            mostrarError('errorUsuario', 'Ingresa tu nombre de usuario o correo electrónico.');
            tieneError = true;
        }

        if (!contrasena) {
            mostrarError('errorContrasena', 'Ingresa tu contraseña.');
            tieneError = true;
        }

        if (tieneError) return;

        const usuarios = obtenerUsuarios();
        const encontrado = usuarios.find(u =>
            u.correo.toLowerCase() === usuario.toLowerCase() ||
            u.nombreUsuario.toLowerCase() === usuario.toLowerCase()
        );

        if (!encontrado || encontrado.contrasena !== contrasena) {
            mostrarError('errorGeneral', 'El nombre de usuario, correo o la contraseña son incorrectos.');
            return;
        }

        // Sesión simulada: guardamos quién inició sesión.
        localStorage.setItem('starparkSesion', encontrado.nombreUsuario);
        window.location.href = 'index.html';
    });
}

// ---------- REGISTRARSE ----------
function inicializarRegistro(form) {
    form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        limpiarErrores(
            'errorCorreo', 'errorContrasena', 'errorNombreCompleto', 'errorNombreUsuario',
            'errorTipoDocumento', 'errorNumeroDocumento', 'errorTelefono', 'errorRegion'
        );

        let tieneError = false;

        const correo = document.getElementById('correo').value.trim();
        const contrasena = document.getElementById('contrasena').value;
        const nombreCompleto = document.getElementById('nombreCompleto').value.trim();
        const nombreUsuario = document.getElementById('nombreUsuario').value.trim();
        const numeroDocumento = document.getElementById('numeroDocumento').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const tipoDocumento = form.querySelector('input[name="tipoDocumento"]:checked');
        const region = form.querySelector('input[name="region"]:checked');
        const preferenciasCorreo = document.getElementById('preferenciasCorreo').checked;

        // El correo debe contener "@".
        if (!correo.includes('@')) {
            mostrarError('errorCorreo', 'Ingresa un correo electrónico válido: debe contener "@".');
            tieneError = true;
        }

        // La contraseña debe tener al menos 8 caracteres, con número, mayúscula y minúscula.
        const regexContrasena = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!regexContrasena.test(contrasena)) {
            mostrarError('errorContrasena', 'La contraseña debe tener al menos 8 caracteres, incluyendo un número, una mayúscula y una minúscula.');
            tieneError = true;
        }

        if (!nombreCompleto) {
            mostrarError('errorNombreCompleto', 'Ingresa tu nombre completo.');
            tieneError = true;
        }

        // El nombre de usuario solo puede contener caracteres alfanuméricos o guiones simples.
        const regexUsuario = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;
        if (!regexUsuario.test(nombreUsuario)) {
            mostrarError('errorNombreUsuario', 'El nombre de usuario solo puede contener caracteres alfanuméricos o guiones simples.');
            tieneError = true;
        }

        if (!tipoDocumento) {
            mostrarError('errorTipoDocumento', 'Selecciona un tipo de documento.');
            tieneError = true;
        }

        if (!numeroDocumento) {
            mostrarError('errorNumeroDocumento', 'Ingresa tu número de documento.');
            tieneError = true;
        }

        const regexTelefono = /^\d{9}$/;
        if (!regexTelefono.test(telefono)) {
            mostrarError('errorTelefono', 'Ingresa un número de teléfono válido de 9 dígitos.');
            tieneError = true;
        }

        if (!region) {
            mostrarError('errorRegion', 'Selecciona tu región.');
            tieneError = true;
        }

        if (tieneError) return;

        const usuarios = obtenerUsuarios();

        if (usuarios.some(u => u.correo.toLowerCase() === correo.toLowerCase())) {
            mostrarError('errorCorreo', 'Ya existe una cuenta registrada con este correo electrónico.');
            return;
        }

        if (usuarios.some(u => u.nombreUsuario.toLowerCase() === nombreUsuario.toLowerCase())) {
            mostrarError('errorNombreUsuario', 'Este nombre de usuario ya está en uso.');
            return;
        }

        usuarios.push({
            correo,
            contrasena,
            nombreCompleto,
            nombreUsuario,
            tipoDocumento: tipoDocumento.value,
            numeroDocumento,
            telefono,
            region: region.value,
            preferenciasCorreo
        });

        guardarUsuarios(usuarios);

        window.location.href = 'login.html';
    });
}