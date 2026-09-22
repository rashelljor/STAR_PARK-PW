// Login.js - Vista de inicio de sesión (antes users/login.html).
// Misma validación y misma "base de datos" en localStorage que controller/auth.js.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { iniciarSesion } from '../services/authService.js'

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
        enviar() {
            this.errores = { usuario: '', contrasena: '', general: '' }
            let tieneError = false

            if (!this.usuario.trim()) {
                this.errores.usuario = 'Ingresa tu nombre de usuario o correo electrónico.'
                tieneError = true
            }

            if (!this.contrasena) {
                this.errores.contrasena = 'Ingresa tu contraseña.'
                tieneError = true
            }

            if (tieneError) return

            const resultado = iniciarSesion(this.usuario.trim(), this.contrasena)

            if (!resultado.ok) {
                this.errores.general = resultado.mensaje
                return
            }

            window.location.href = 'index.html'
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div class="text-center text-white p-5">
                    <h1>INICIA SESIÓN EN <br><em class="celeste">STAR</em> <em>PARK</em></h1><br>
                    <p class="etiqueta">Bienvenido de vuelta, astronauta</p>
                </div>

                <section id="loginForm">
                    <div class="bloqueFormulario glass">
                        <form id="formLogin" novalidate @submit.prevent="enviar">
                            <div class="campo">
                                <label class="form-label celeste" for="usuario">Nombre de usuario o dirección de correo electrónico</label>
                                <input
                                    v-model="usuario"
                                    class="form-control"
                                    type="text"
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

                            <p class="mensajeError" role="alert">{{ errores.general }}</p>
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
                        <a class="btn" href="../admin/admin.html">Panel administrativo</a>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    `

}
