// Inicio.js - Vista de la página principal (antes users/index.html).
// Contenido estático: portada, atracciones, servicios y ubicación.

import Header from '../components/Header.js'
import Footer from '../components/Footer.js'

export default {

    components: { Header, Footer },

    template: `
        <div>
            <Header />

            <!-- Portada principal con imagen y mensaje de bienvenida. -->
            <section id="inicio" class="hero">
                <img src="../assets/img/portada.png" alt="2 jóvenes jugando en el AirGame, Star Park" class="heroFoto">
                <div class="heroWrapper">
                    <div class="heroContenido">
                        <p class="etiqueta">¡Destino galáctico #1 en Huancayo!</p>
                        <div class="heroTituloFila">
                            <h1>TU AVENTURA ESPACIAL 🚀<br><em>Comienza Aquí</em></h1>
                        </div>
                        <p class="subtexto">
                            Bienvenidos al centro de juegos mecánicos y arcade más emocionante de Huancayo. <br>
                            ¡Regístrate como un nuevo astronauta y recibe tu primera misión!
                        </p>
                        <a class="btn btn-primary rounded-pill botonAmarillo" href="login.html">¡Iniciar Misión!</a>
                    </div>
                </div>
            </section>

            <main>
                <!-- Lista de atracciones disponibles. -->
                <section id="atracciones">
                    <div class="seccionCabecera">
                        <h2>ATRACCIONES</h2>
                        <p class="etiquetaGris">MULTIVERSO DE ENTRETENIMIENTO</p>
                    </div>
                    <div class="grilla3col">
                        <article class="tarjetaAtraccion glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/aventuraespacial01.png" alt="Área de juegos, Aventura Espacial">
                                <div class="badge">INFANTIL</div>
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="celeste">AVENTURA ESPACIAL</h3>
                                <p>¡Diversión 100% segura para pequeños astronautas de 4 a 12 años! Saltarín, trampolín, carritos y tobogán.</p>
                            </div>
                        </article>

                        <article class="tarjetaAtraccion glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/misionmarciana01.png" alt="Piscina de pelotas y sensores, Misión Marciana">
                                <span class="badge">INFANTIL</span>
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="celeste">MISIÓN MARCIANA</h3>
                                <p>Viaja a Marte en una aventura inmersiva: tecnología táctil, sensores interactivos y zona de escalada.</p>
                            </div>
                        </article>

                        <article class="tarjetaAtraccion glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/dunbol.png" alt="Laberinto Dunbol, juego de orientación y reflejos">
                                <span class="badge">INFANTIL</span>
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="celeste">LABERINTO DUNBOL</h3>
                                <p>¡Pone a prueba tus reflejos y tu orientación! Explora caminos llenos de sorpresas y supera el reto en este divertido recorrido.</p>
                            </div>
                        </article>

                        <article class="tarjetaAtraccion glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/carrito.png" alt="Carrito chocón, juego de carreras y choques">
                                <div class="badge">FAMILIAR</div>
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="celeste">CARRITO CHOCÓN</h3>
                                <p>¡Siente la adrenalina y la aceleración! Maneja tu propio auto, esquiva obstáculos y choca en una pista llena de acción y diversión.</p>
                            </div>
                        </article>

                        <article class="tarjetaAtraccion glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/realidadvirtual.png" alt="Realidad virtual, experiencia inmersiva en 3D">
                                <span class="badge">FAMILIAR</span>
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="celeste">REALIDAD VIRTUAL</h3>
                                <p>Sumérgete en mundos increíbles y experiencias 3D. Vive aventuras inmersivas con tecnología de vanguardia que desafiará tus sentidos.</p>
                            </div>
                        </article>

                        <article class="tarjetaAtraccion glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/maquinas.png" alt="Juegos Arcade">
                                <span class="badge">FAMILIAR</span>
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="celeste">JUEGOS ARCADE</h3>
                                <p>¡Diversión retro y moderna para todas las edades! Compite en familia en los mejores juegos arcade.</p>
                            </div>
                        </article>
                    </div>
                </section>

                <!-- Servicios adicionales del parque -->
                <section id="servicios">
                    <div class="seccionCabecera">
                        <h2>SERVICIOS</h2>
                        <p class="etiquetaGris">SUMINISTROS DE ÉLITE PARA EXPLORADORES</p>
                    </div>

                    <div class="grillaServicios">
                        <article class="tarjetaServicio glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/confiteria.png" alt="Área de Confitería">
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="amarillo">SNACKS PREMIUM AERO-ESPACIALES</h3>
                                <p>Visita nuestra confitería y recarga energías con una selección de sabores de otra galaxia.</p>
                            </div>
                        </article>

                        <article class="tarjetaServicio glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/vitrina.png" alt="Vitrina de juguetes y artículos con temática espacial">
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="amarillo">BAZAR INTERGALÁCTICO</h3>
                                <p>Regalos y artículos exclusivos de temática espacial: lapiceros, loncheras, libros y más.</p>
                            </div>
                        </article>

                        <article class="tarjetaServicio glass">
                            <div class="tarjetaImgCaja">
                                <img src="../assets/img/cumpleaños.png" alt="Cumpleaños Espaciales">
                            </div>
                            <div class="tarjetaCuerpo">
                                <h3 class="amarillo">CUMPLEAÑOS ESPACIALES</h3>
                                <ul class="tarjetaCuerpo">
                                    <li>Acceso VIP a todas las atracciones</li>
                                    <li>Sala VIP ambientada como estación espacial</li>
                                    <li>Anfitrión animador con dinámicas espaciales</li>
                                </ul>
                            </div>
                        </article>
                    </div>
                </section>

                <!-- Ubicación y Horarios -->
                <section id="base-operaciones">
                    <div class="seccionCabecera">
                        <h2>UBICACIÓN Y HORARIOS</h2>
                        <p class="etiquetaGris">PLANIFICA TU EMBARQUE E INSPECCIONA LA UBICACIÓN</p>
                    </div>

                    <div class="grillaUbicacion">
                        <div class="tarjetaUbi glass">
                            <div class="tarjetaCuerpo">
                                <div>
                                    <h3 class="amarillo"> 🌎 Ubicación Estelar</h3>
                                    <p>Sótano del Centro Comercial Constitución, Calle Real 475, Huancayo, Junín - Perú</p>
                                </div>
                            </div>

                            <div class="tarjetaCuerpo">
                                <div>
                                    <h3 class="amarillo"> 🛸 Horario de Operaciones</h3>
                                    <p><strong>Lun a Vie:</strong> 11:00 AM - 10:00 PM<br><strong>Sáb a Dom:</strong> 10:00 AM - 10:00 PM</p>
                                </div>
                            </div>

                            <div class="tarjetaCuerpo">
                                <div>
                                    <h3 class="amarillo"> 📞 Contacto Galáctico</h3>
                                    <p><strong>Teléfono:</strong> 997 289 333<br><strong>Correo:</strong> pqcentralpark@gmail.com</p>
                                </div>
                            </div>
                        </div>

                        <div class="tarjetaMapa glass">
                            <img src="../assets/img/mapa_huancayo.png" alt="Mapa Ubicación Star Park, Huancayo" class="mapaImagen">
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    `

}
