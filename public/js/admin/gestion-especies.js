import {
    requiereRol
} from "../auth/permisos.js";


import {
    supabase
} from "../database/supabase.js";


const contenedor =
    document.querySelector(
        "#gestion-container"
    );


const mensaje =
    document.querySelector(
        "#gestion-message"
    );


const dialog =
    document.querySelector(
        "#retiro-dialog"
    );


const motivoInput =
    document.querySelector(
        "#motivo-retiro"
    );


const nombreRetiro =
    document.querySelector(
        "#retiro-species-name"
    );


const confirmarRetiro =
    document.querySelector(
        "#confirmar-retiro"
    );


const cancelarRetiro =
    document.querySelector(
        "#cancelar-retiro"
    );


let especieSeleccionada = null;


/* =========================================================
   INICIAR PÁGINA
========================================================= */

async function iniciar() {

    const acceso =
        await requiereRol([
            "admin"
        ]);


    if (!acceso) {
        return;
    }


    await cargarEspecies();
}


/* =========================================================
   CARGAR ESPECIES
========================================================= */

async function cargarEspecies() {

    contenedor.innerHTML =
        `<div class="record-card">
            Cargando especies...
        </div>`;


    const {
        data,
        error
    } = await supabase
        .from("species")
        .select(`
            id,
            nombre_cientifico,
            nombre_comun,
            familia,
            genero,
            estado,
            motivo_retiro,
            fecha_retiro,
            investigador_id,
            fecha_creacion
        `)
        .in(
            "estado",
            [
                "aprobado",
                "retirado"
            ]
        )
        .order(
            "nombre_cientifico",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(error);

        contenedor.innerHTML =
            `<div class="record-card">
                No fue posible cargar las especies.
            </div>`;

        return;
    }


    renderizarEspecies(
        data || []
    );
}


/* =========================================================
   RENDERIZAR
========================================================= */

function renderizarEspecies(especies) {

    contenedor.innerHTML = "";


    if (especies.length === 0) {

        contenedor.innerHTML =
            `<div class="record-card">
                No hay especies publicadas o retiradas.
            </div>`;

        return;
    }


    especies.forEach(especie => {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "record-card";


        /* Nombre científico */

        const titulo =
            document.createElement(
                "h2"
            );


        titulo.textContent =
            especie.nombre_cientifico;


        card.appendChild(
            titulo
        );


        /* Nombre común */

        if (especie.nombre_comun) {

            const nombreComun =
                document.createElement(
                    "p"
                );


            nombreComun.textContent =
                especie.nombre_comun;


            card.appendChild(
                nombreComun
            );
        }


        /* Taxonomía */

        const taxonomia =
            document.createElement(
                "p"
            );


        taxonomia.textContent = [
            especie.familia,
            especie.genero
        ]
            .filter(Boolean)
            .join(" · ");


        card.appendChild(
            taxonomia
        );


        /* Estado */

        const estado =
            document.createElement(
                "span"
            );


        estado.className =
            "record-status";


        estado.textContent =
            especie.estado === "aprobado"
                ? "Publicada"
                : "Retirada";


        card.appendChild(
            estado
        );


        /* Información de retiro */

        if (
            especie.estado === "retirado"
        ) {

            const retiro =
                document.createElement(
                    "div"
                );


            retiro.className =
                "status-box";


            const motivo =
                document.createElement(
                    "p"
                );


            motivo.textContent =
                `Motivo: ${
                    especie.motivo_retiro ||
                    "No especificado"
                }`;


            retiro.appendChild(
                motivo
            );


            if (especie.fecha_retiro) {

                const fecha =
                    document.createElement(
                        "p"
                    );


                fecha.textContent =
                    `Fecha de retiro: ${
                        formatearFecha(
                            especie.fecha_retiro
                        )
                    }`;


                retiro.appendChild(
                    fecha
                );
            }


            card.appendChild(
                retiro
            );
        }


        /* Acciones */

        const acciones =
            document.createElement(
                "div"
            );


        acciones.className =
            "review-actions";


        if (
            especie.estado === "aprobado"
        ) {

            const botonRetirar =
                document.createElement(
                    "button"
                );


            botonRetirar.type =
                "button";


            botonRetirar.className =
                "btn btn-reject";


            botonRetirar.textContent =
                "Dar de baja";


            botonRetirar.addEventListener(
                "click",
                () => abrirRetiro(especie)
            );


            acciones.appendChild(
                botonRetirar
            );

        } else {

            const botonRestaurar =
                document.createElement(
                    "button"
                );


            botonRestaurar.type =
                "button";


            botonRestaurar.className =
                "btn btn-primary";


            botonRestaurar.textContent =
                "Restaurar publicación";


            botonRestaurar.addEventListener(
                "click",
                () => restaurarEspecie(
                    especie
                )
            );


            acciones.appendChild(
                botonRestaurar
            );
        }


        card.appendChild(
            acciones
        );


        contenedor.appendChild(
            card
        );

    });
}


/* =========================================================
   ABRIR DIÁLOGO DE RETIRO
========================================================= */

function abrirRetiro(especie) {

    especieSeleccionada =
        especie;


    nombreRetiro.textContent =
        especie.nombre_cientifico;


    motivoInput.value =
        "";


    dialog.showModal();
}


/* =========================================================
   CONFIRMAR RETIRO
========================================================= */

confirmarRetiro.addEventListener(
    "click",
    async () => {

        if (!especieSeleccionada) {
            return;
        }


        const motivo =
            motivoInput
                .value
                .trim();


        if (!motivo) {

            motivoInput.focus();

            return;
        }


        confirmarRetiro.disabled =
            true;


        mostrarMensaje(
            "Retirando especie..."
        );


        const {
            error
        } = await supabase
            .from("species")
            .update({

                estado:
                    "retirado",

                motivo_retiro:
                    motivo

            })
            .eq(
                "id",
                especieSeleccionada.id
            )
            .eq(
                "estado",
                "aprobado"
            );


        confirmarRetiro.disabled =
            false;


        if (error) {

            console.error(error);

            mostrarMensaje(
                "No fue posible retirar la especie.",
                true
            );

            return;
        }


        dialog.close();


        especieSeleccionada =
            null;


        mostrarMensaje(
            "La especie fue retirada del catálogo."
        );


        await cargarEspecies();

    }
);


/* =========================================================
   CANCELAR
========================================================= */

cancelarRetiro.addEventListener(
    "click",
    () => {

        especieSeleccionada =
            null;

        dialog.close();

    }
);


/* =========================================================
   RESTAURAR
========================================================= */

async function restaurarEspecie(
    especie
) {

    const confirmar =
        window.confirm(
            `¿Deseas volver a publicar "${especie.nombre_cientifico}"?`
        );


    if (!confirmar) {
        return;
    }


    mostrarMensaje(
        "Restaurando especie..."
    );


    const {
        error
    } = await supabase
        .from("species")
        .update({

            estado:
                "aprobado"

        })
        .eq(
            "id",
            especie.id
        )
        .eq(
            "estado",
            "retirado"
        );


    if (error) {

        console.error(error);

        mostrarMensaje(
            "No fue posible restaurar la especie.",
            true
        );

        return;
    }


    mostrarMensaje(
        "La especie volvió a publicarse."
    );


    await cargarEspecies();
}


/* =========================================================
   MENSAJES
========================================================= */

function mostrarMensaje(
    texto,
    error = false
) {

    mensaje.textContent =
        texto;


    mensaje.className =
        "form-message";


    if (error) {

        mensaje.classList.add(
            "error"
        );

    } else {

        mensaje.classList.add(
            "success"
        );
    }
}


/* =========================================================
   FECHA
========================================================= */

function formatearFecha(fecha) {

    return new Date(
        fecha
    ).toLocaleString(
        "es-MX"
    );
}


/* =========================================================
   INICIO
========================================================= */

iniciar();