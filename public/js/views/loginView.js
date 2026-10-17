import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { iniciarSesion, obtenerPerfil, auth } from '../services/authService.js'
import { notificar, notificarAlCargar } from '../utils/notificaciones.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            usuario: '',
            contrasena: '',
            errores: {
                usuario: '',
                contrasena: '',
                general: ''
            }
        }
    },

    methods: {
        async enviar() {
            this.errores = { usuario: '', contrasena: '', general: '' }
            let tieneError = false

            if (!this.usuario.trim()) {
                this.errores.usuario = 'Ingresa tu correo electrónico.'
                tieneError = true
            }

            if (!this.contrasena) {
                this.errores.contrasena = 'Ingresa tu contraseña.'
                tieneError = true
            }

            if (tieneError) {
                notificar(Object.values(this.errores).filter(Boolean), 'error')
                return
            }

            const resultado = await iniciarSesion(this.usuario.trim(), this.contrasena)

            if (!resultado.ok) {
                notificar(resultado.mensaje, 'error')
                return
            }

            // La bienvenida se muestra al llegar al inicio, sin retrasar la redirección.
            // Si el perfil no carga, se saluda igual sin nombre.
            const perfil = await obtenerPerfil(auth.currentUser.uid).catch(() => null)
            const nombre = perfil?.nombreCompleto?.trim().split(' ')[0]
            notificarAlCargar('¡Bienvenido de vuelta' + (nombre ? ', ' + nombre : '') + '! Tu sesión se inició correctamente.', 'exito')
            window.location.href = 'index.html'
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div class="text-center text-white p-3 p-md-5">
                    <h1>INICIA SESIÓN EN <br><em class="celeste">STAR</em> <em>PARK</em></h1><br>
                    <p class="etiqueta">Bienvenido de vuelta, astronauta</p>
                </div>

                <section id="loginForm">
                    <div class="bloqueFormulario glass">
                        <form id="formLogin" novalidate @submit.prevent="enviar">
                            <div class="campo">
                                <label class="form-label celeste" for="usuario">Correo electrónico</label>
                                <input
                                    v-model="usuario"
                                    class="form-control"
                                    type="email"
                                    id="usuario"
                                    name="usuario"
                                    autocomplete="username"
                                    placeholder="abc@example.com"
                                    required
                                >
                                <p class="mensajeError" role="alert">{{ errores.usuario }}</p>
                            </div>

                            <div class="campo">
                                <label class="form-label celeste" for="contrasena">Contraseña</label>
                                <input
                                    v-model="contrasena"
                                    class="form-control"
                                    type="password"
                                    id="contrasena"
                                    name="contrasena"
                                    autocomplete="current-password"
                                    placeholder="123ABCdef"
                                    required
                                >
                                <p class="mensajeError" role="alert">{{ errores.contrasena }}</p>
                            </div>

                            <div class="d-flex justify-content-center">
                                <button type="submit" class="btn btn-primary rounded-pill botonAmarillo botonAncho">Iniciar sesión</button>
                            </div>
                        </form>
                        <div class="separadorFormulario"></div>
                        <div class="d-flex flex-column justify-content-center ">
                            <p class="etiquetaGris d-flex justify-content-center">¿Eres nuevo en Star Park?</p>
                            <div class="d-flex justify-content-center">
                                <a class="btn btn-outline-info" href="registro.html">Crear cuenta</a>
                            </div>
                        </div>
                        <a class="btn btn-outline-secondary" href="../admin/admin.html" target="_blank">Panel administrativo</a>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    `

}
