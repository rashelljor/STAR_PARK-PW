import Header from '../components/Header.js'
import Footer from '../components/Footer.js'
import { registrarUsuario } from '../services/authService.js'
import {
    esCorreoValido,
    esContrasenaValida,
    esNombreUsuarioValido,
    esTelefonoValido
} from '../utils/validators.js'

export default {

    components: { Header, Footer },

    data() {
        return {
            correo: '',
            contrasena: '',
            nombreCompleto: '',
            nombreUsuario: '',
            tipoDocumento: '',
            numeroDocumento: '',
            telefono: '',
            region: '',
            preferenciasCorreo: false,
            errores: {}
        }
    },

    methods: {
        async enviar() {
            this.errores = {}
            let tieneError = false

            if (!esCorreoValido(this.correo)) {
                this.errores.correo = 'Ingresa un correo electrónico válido: debe contener "@".'
                tieneError = true
            }

            if (!esContrasenaValida(this.contrasena)) {
                this.errores.contrasena = 'La contraseña debe tener al menos 8 caracteres, incluyendo un número, una mayúscula y una minúscula.'
                tieneError = true
            }

            if (!this.nombreCompleto.trim()) {
                this.errores.nombreCompleto = 'Ingresa tu nombre completo.'
                tieneError = true
            }

            if (!esNombreUsuarioValido(this.nombreUsuario)) {
                this.errores.nombreUsuario = 'El nombre de usuario solo puede contener caracteres alfanuméricos o guiones simples.'
                tieneError = true
            }

            if (!this.tipoDocumento) {
                this.errores.tipoDocumento = 'Selecciona un tipo de documento.'
                tieneError = true
            }

            if (!this.numeroDocumento.trim()) {
                this.errores.numeroDocumento = 'Ingresa tu número de documento.'
                tieneError = true
            }

            if (!esTelefonoValido(this.telefono)) {
                this.errores.telefono = 'Ingresa un número de teléfono válido de 9 dígitos.'
                tieneError = true
            }

            if (!this.region) {
                this.errores.region = 'Selecciona tu región.'
                tieneError = true
            }

            if (tieneError) return

            const resultado = await registrarUsuario({
                correo: this.correo.trim(),
                contrasena: this.contrasena,
                nombreCompleto: this.nombreCompleto.trim(),
                nombreUsuario: this.nombreUsuario.trim(),
                tipoDocumento: this.tipoDocumento,
                numeroDocumento: this.numeroDocumento.trim(),
                telefono: this.telefono.trim(),
                region: this.region,
                preferenciasCorreo: this.preferenciasCorreo
            })

            if (!resultado.ok) {
                this.errores[resultado.campo || 'general'] = resultado.mensaje
                return
            }

            window.location.href = 'login.html'
        }
    },

    template: `
        <div>
            <Header />

            <main>
                <div class="text-center text-white p-5">
                    <h1>CREA TU CUENTA EN <br><em class="celeste">STAR</em> <em>PARK</em></h1><br>
                    <p class="etiqueta">Únete a la tripulación</p>
                </div>

                <section id="registroForm">
                    <div class="bloqueFormulario glass">
                        <form id="formRegistro" novalidate @submit.prevent="enviar">
                            <div class="campo">
                                <label class="form-label amarillo" for="correo">Correo electrónico</label>
                                <input v-model="correo" type="email" id="correo" name="correo" autocomplete="email" placeholder="abc@gmail.com" required>
                                <p class="mensajeError" role="alert">{{ errores.correo }}</p>
                            </div>

                            <div class="campo">
                                <label class="form-label amarillo" for="contrasena">Contraseña</label>
                                <input v-model="contrasena" type="password" id="contrasena" name="contrasena" autocomplete="new-password" placeholder="123ABCdef" required>
                                <p>Debe tener al menos 8 caracteres, incluyendo un número, una mayúscula y una minúscula.</p>
                                <p class="mensajeError" role="alert">{{ errores.contrasena }}</p>
                            </div>

                            <div class="campo">
                                <label class="form-label amarillo" for="nombreCompleto">Nombre completo</label>
                                <input v-model="nombreCompleto" type="text" id="nombreCompleto" name="nombreCompleto" autocomplete="name" placeholder="MARÍA JOSÉ TORRES FLORES" required>
                                <p class="mensajeError" role="alert">{{ errores.nombreCompleto }}</p>
                            </div>

                            <div class="campo">
                                <label class="form-label amarillo" for="nombreUsuario">Nombre de usuario</label>
                                <input v-model="nombreUsuario" type="text" id="nombreUsuario" name="nombreUsuario" autocomplete="off" placeholder="mariajose" required>
                                <p>Solo puede contener caracteres alfanuméricos o guiones simples.</p>
                                <p class="mensajeError" role="alert">{{ errores.nombreUsuario }}</p>
                            </div>

                            <div class="campo">
                                <label class="form-label amarillo">Tipo de documento</label>
                                <div class="grupoOpciones">
                                    <label class="opcionRadio"><input v-model="tipoDocumento" type="radio" name="tipoDocumento" value="DNI">DNI</label>
                                    <label class="opcionRadio"><input v-model="tipoDocumento" type="radio" name="tipoDocumento" value="Carnet de extranjería">Carnet de extranjería</label>
                                    <label class="opcionRadio"><input v-model="tipoDocumento" type="radio" name="tipoDocumento" value="Pasaporte">Pasaporte</label>
                                </div>
                                <p class="mensajeError" role="alert">{{ errores.tipoDocumento }}</p>
                            </div>

                            <div class="campo">
                                <label class="form-label amarillo" for="numeroDocumento">Número de documento</label>
                                <input v-model="numeroDocumento" type="text" id="numeroDocumento" name="numeroDocumento" inputmode="numeric" autocomplete="off" placeholder="123456789" required>
                                <p class="mensajeError" role="alert">{{ errores.numeroDocumento }}</p>
                            </div>

                            <div class="campo">
                                <label class="form-label amarillo" for="telefono">Teléfono</label>
                                <input v-model="telefono" type="tel" id="telefono" name="telefono" inputmode="numeric" autocomplete="tel" placeholder="999 999 999" required>
                                <p class="mensajeError" role="alert">{{ errores.telefono }}</p>
                            </div>

                            <div class="campo">
                                <label class="form-label amarillo">Tu país</label>
                                <p>Perú 🇵🇪</p>
                            </div>

                            <div class="campo">
                                <label class="form-label amarillo">Selecciona tu región</label>
                                <div class="grupoOpciones">
                                    <label class="opcionRadio"><input v-model="region" type="radio" name="region" value="Arequipa">Arequipa</label>
                                    <label class="opcionRadio"><input v-model="region" type="radio" name="region" value="Huancayo">Huancayo</label>
                                    <label class="opcionRadio"><input v-model="region" type="radio" name="region" value="Lima">Lima</label>
                                    <label class="opcionRadio"><input v-model="region" type="radio" name="region" value="Chimbote">Chimbote</label>
                                </div>
                                <p class="mensajeError" role="alert">{{ errores.region }}</p>
                                <p class="seccionCabecera small">Por motivos de cumplimiento normativo, estamos obligados a recopilar información sobre tu región para enviarte actualizaciones y anuncios ocasionales.</p>
                            </div>

                            <div class="campo filaCheckbox">
                                <label><input v-model="preferenciasCorreo" type="checkbox" id="preferenciasCorreo" name="preferenciasCorreo">Recibe actualizaciones y anuncios ocasionales sobre nuestros productos.</label>
                            </div><br>
                            <div class="d-flex justify-content-center">
                                <button type="submit" class="btn btn-primary rounded-pill botonAmarillo botonAncho">Crear una cuenta</button>
                            </div><br>

                            <p class="etiquetaGris">Al crear una cuenta, aceptas las <em class="celeste">Condiciones del servicio</em> de Star Park. Para obtener más información sobre nuestras prácticas de privacidad, consulta la <em class="celeste">Declaración de privacidad</em>. Ocasionalmente te enviaremos correos electrónicos relacionados con tu cuenta.</p>
                        </form>

                        <div class="separadorFormulario"></div>
                        <div class="d-flex flex-column justify-content-center ">
                            <p class="etiquetaGris d-flex justify-content-center">¿Ya estás registrado en Star Park?</p>
                            <div class="d-flex justify-content-center">
                                <a class="btn btn-outline-info" href="login.html">Iniciar sesión</a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    `

}
