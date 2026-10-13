import {
    requiereRol
} from "../auth/permisos.js";


import {
    supabase
} from "../database/supabase.js";

import {
    mostrarModelo3D
} from "../multimedia/modelos3d.js";


const contenedor =
    document.querySelector(
        "#review-container"
    );


const SIGNED_URL_TTL =
    300;


/* =========================================================
   CARGAR REGISTROS PENDIENTES
========================================================= */

async function cargarPendientes() {

    const acceso =
        await requiereRol([
            "revisor",
            "admin"
        ]);


    if (!acceso) {
        return;
    }


    contenedor.innerHTML = `
        <div class="review-card">
            Cargando registros pendientes...
        </div>
    `;


    const {
        data,
        error
    } = await supabase
        .from("species")
        .select(`
            id,
            nombre_cientifico,
            nombre_comun,
            reino,
            phylum,
            clase,
            orden,
            familia,
            genero,
            descripcion,
            caracteristicas,
            habitat,
            distribucion,
            lugar_registro,
            fecha_registro,
            investigador_id,
            fecha_creacion,

            species_images (
                id,
                ruta_archivo,
                tipo_imagen,
                descripcion,
                autor,
                orden
            ),

            species_models (
                id,
                ruta_archivo,
                formato,
                descripcion,
                autor
            )
        `)
        .eq(
            "estado",
            "pendiente_revision"
        )
        .order(
            "fecha_creacion",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Error cargando registros pendientes:",
            error
        );


        contenedor.innerHTML = `
            <div class="review-card">
                No fue posible cargar los registros.
            </div>
        `;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="review-card">
                No hay registros pendientes de revisión.
            </div>
        `;

        return;
    }


    /*
     * Generar las URLs temporales de todas las imágenes
     * antes de dibujar las tarjetas.
     */
    await prepararImagenes(
        data
    );


    renderizarPendientes(
        data
    );await Promise.all([

    prepararImagenes(
        data
    ),

    prepararModelos(
        data
    )

]);


renderizarPendientes(
    data
);
}


/* =========================================================
   PREPARAR IMÁGENES PRIVADAS
========================================================= */

async function prepararImagenes(
    especies
) {

    await Promise.all(

        especies.map(
            async especie => {

                const imagenes =
                    especie.species_images ||
                    [];


                const ordenadas =
                    [...imagenes]
                        .sort(
                            (a, b) =>
                                (a.orden ?? 0) -
                                (b.orden ?? 0)
                        );


                especie.imagenes_revision =
                    await Promise.all(

                        ordenadas.map(
                            async imagen => {

                                const {
                                    data,
                                    error
                                } =
                                    await supabase.storage
                                        .from(
                                            "species-images"
                                        )
                                        .createSignedUrl(
                                            imagen.ruta_archivo,
                                            SIGNED_URL_TTL
                                        );


                                if (error) {

                                    console.error(
                                        "No fue posible obtener la imagen:",
                                        imagen.ruta_archivo,
                                        error
                                    );


                                    return {
                                        ...imagen,
                                        url: null
                                    };
                                }


                                return {
                                    ...imagen,
                                    url:
                                        data.signedUrl
                                };

                            }
                        )

                    );

            }
        )

    );
}


/* =========================================================
   PREPARAR MODELOS 3D PRIVADOS
========================================================= */

async function prepararModelos(
    especies
) {

    await Promise.all(

        especies.map(
            async especie => {

                const modelos =
                    especie.species_models ||
                    [];


                if (
                    modelos.length === 0
                ) {

                    especie.modelo_revision =
                        null;

                    return;
                }


                /*
                 * Actualmente el formulario permite
                 * un solo modelo 3D por registro.
                 */
                const modelo =
                    modelos[0];


                const {
                    data,
                    error
                } =
                    await supabase.storage
                        .from(
                            "species-models"
                        )
                        .createSignedUrl(
                            modelo.ruta_archivo,
                            SIGNED_URL_TTL
                        );


                if (error) {

                    console.error(
                        "No fue posible obtener el modelo 3D:",
                        modelo.ruta_archivo,
                        error
                    );


                    especie.modelo_revision =
                        null;

                    return;
                }


                especie.modelo_revision = {
                    ...modelo,
                    url:
                        data.signedUrl
                };

            }
        )

    );
}

/* =========================================================
   RENDERIZAR TARJETAS
========================================================= */

function renderizarPendientes(
    especies
) {

    contenedor.innerHTML =
        "";


    especies.forEach(
        especie => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "review-card";


            card.innerHTML = `

                <div class="review-header">

                    <div>

                        <p class="eyebrow">
                            ${
                                especie.familia ||
                                "Sin familia"
                            }
                        </p>

                        <h2>
                            ${especie.nombre_cientifico}
                        </h2>

                        ${
                            especie.nombre_comun
                                ? `
                                    <p>
                                        ${especie.nombre_comun}
                                    </p>
                                  `
                                : ""
                        }

                    </div>

                </div>


                <div class="review-taxonomy">

                    <div>
                        <span>Reino</span>
                        <strong>
                            ${especie.reino || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Phylum</span>
                        <strong>
                            ${especie.phylum || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Clase</span>
                        <strong>
                            ${especie.clase || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Orden</span>
                        <strong>
                            ${especie.orden || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Familia</span>
                        <strong>
                            ${especie.familia || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Género</span>
                        <strong>
                            ${especie.genero || "—"}
                        </strong>
                    </div>

                </div>


                <div>

                    <strong>
                        Descripción
                    </strong>

                    <p>
                        ${
                            especie.descripcion ||
                            "Sin descripción."
                        }
                    </p>

                </div>


                <div>

                    <strong>
                        Características
                    </strong>

                    <p>
                        ${
                            especie.caracteristicas ||
                            "Sin características."
                        }
                    </p>

                </div>


                <div>

                    <strong>
                        Hábitat
                    </strong>

                    <p>
                        ${
                            especie.habitat ||
                            "Sin información."
                        }
                    </p>

                </div>


                <div>

                    <strong>
                        Distribución
                    </strong>

                    <p>
                        ${
                            especie.distribucion ||
                            "Sin información."
                        }
                    </p>

                </div>


                <div class="review-record-data">

                    <div>

                        <span>
                            Lugar de registro
                        </span>

                        <strong>
                            ${
                                especie.lugar_registro ||
                                "—"
                            }
                        </strong>

                    </div>


                    <div>

                        <span>
                            Fecha de registro
                        </span>

                        <strong>
                            ${
                                especie.fecha_registro ||
                                "—"
                            }
                        </strong>

                    </div>

                </div>


                <div class="review-images-section">

                    <strong>
                        Fotografías enviadas
                    </strong>

                    <div
                        class="review-image-gallery"
                        id="imagenes-${especie.id}"
                    ></div>

                </div>


                <div class="review-model-section">

                    <strong>
                        Modelo 3D enviado
                    </strong>

                    <div
                        class="review-model-viewer"
                        id="modelo-${especie.id}"
                    >

                        <p>
                            Cargando modelo 3D...
                        </p>

                    </div>

                </div>

                <div>

                    <label
                        for="comentario-${especie.id}"
                        class="review-comment-label"
                    >
                        Comentario de revisión
                    </label>

                    <textarea
                        id="comentario-${especie.id}"
                        placeholder="Escribe un comentario de revisión..."
                    ></textarea>

                </div>


                <div class="review-actions">

                    <button
                        type="button"
                        class="btn btn-approve"
                        data-action="aprobar"
                        data-id="${especie.id}"
                    >
                        Aprobar
                    </button>


                    <button
                        type="button"
                        class="btn btn-reject"
                        data-action="rechazar"
                        data-id="${especie.id}"
                    >
                        Rechazar
                    </button>

                </div>
            `;


            contenedor.appendChild(
                card
            );


            renderizarImagenes(
                especie
            );

            renderizarModelo(
                especie
            );

        }
    );


    document
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    procesarRevision
                );

            }
        );
}


/* =========================================================
   MOSTRAR IMÁGENES
========================================================= */

function renderizarImagenes(
    especie
) {

    const galeria =
        document.querySelector(
            `#imagenes-${especie.id}`
        );


    const imagenes =
        especie.imagenes_revision ||
        [];


    const disponibles =
        imagenes.filter(
            imagen => imagen.url
        );


    if (
        disponibles.length === 0
    ) {

        galeria.innerHTML = `
            <p class="review-no-images">
                No se enviaron fotografías.
            </p>
        `;

        return;
    }


    disponibles.forEach(
        imagen => {

            const contenedorImagen =
                document.createElement(
                    "figure"
                );


            contenedorImagen.className =
                "review-image-item";


            const elementoImagen =
                document.createElement(
                    "img"
                );


            elementoImagen.src =
                imagen.url;


            elementoImagen.alt =
                imagen.descripcion ||
                "Fotografía enviada para revisión";


            elementoImagen.loading =
                "lazy";


            /*
             * Clic para abrir la fotografía
             * en tamaño completo.
             */
            elementoImagen.addEventListener(
                "click",
                () => {

                    window.open(
                        imagen.url,
                        "_blank",
                        "noopener,noreferrer"
                    );

                }
            );


            contenedorImagen.appendChild(
                elementoImagen
            );


            if (
                imagen.descripcion
            ) {

                const descripcion =
                    document.createElement(
                        "figcaption"
                    );


                descripcion.textContent =
                    imagen.descripcion;


                contenedorImagen.appendChild(
                    descripcion
                );
            }


            galeria.appendChild(
                contenedorImagen
            );

        }
    );
}

/* =========================================================
   MOSTRAR MODELO 3D
========================================================= */

function renderizarModelo(
    especie
) {

    const contenedorModelo =
        document.querySelector(
            `#modelo-${especie.id}`
        );


    if (!contenedorModelo) {
        return;
    }


    const modelo =
        especie.modelo_revision;


    if (
        !modelo ||
        !modelo.url
    ) {

        contenedorModelo.innerHTML = `
            <p class="review-no-model">
                No se envió un modelo 3D.
            </p>
        `;

        return;
    }


    mostrarModelo3D(
        contenedorModelo,
        modelo.url
    );


    /*
     * Información adicional debajo del visor.
     */
    const informacion =
        document.createElement(
            "div"
        );


    informacion.className =
        "review-model-info";


    informacion.innerHTML = `

        <span>
            Formato:
            <strong>
                ${modelo.formato.toUpperCase()}
            </strong>
        </span>

        ${
            modelo.descripcion
                ? `
                    <span>
                        Archivo:
                        <strong>
                            ${modelo.descripcion}
                        </strong>
                    </span>
                  `
                : ""
        }

    `;


    contenedorModelo.appendChild(
        informacion
    );
}
/* =========================================================
   PROCESAR REVISIÓN
========================================================= */

async function procesarRevision(
    event
) {

    const button =
        event.currentTarget;


    const speciesId =
        button.dataset.id;


    const accion =
        button.dataset.action;


    const comentario =
        document
            .querySelector(
                `#comentario-${speciesId}`
            )
            .value
            .trim();


    const nuevoEstado =
        accion === "aprobar"
            ? "aprobado"
            : "rechazado";


    if (!comentario) {

        alert(
            "Escribe un comentario de revisión."
        );

        return;
    }


    const acceso =
        await requiereRol([
            "revisor",
            "admin"
        ]);


    if (!acceso) {
        return;
    }


    button.disabled =
        true;


    const {
        error: speciesError
    } = await supabase
        .from("species")
        .update({
            estado:
                nuevoEstado
        })
        .eq(
            "id",
            speciesId
        );


    if (speciesError) {

        console.error(
            speciesError
        );


        alert(
            "No fue posible actualizar el estado."
        );


        button.disabled =
            false;

        return;
    }


    const {
        error: noteError
    } = await supabase
        .from("review_notes")
        .insert({

            species_id:
                speciesId,

            revisor_id:
                acceso.usuario.id,

            comentario:
                comentario,

            estado:
                nuevoEstado

        });


    if (noteError) {

        console.error(
            noteError
        );


        alert(
            "La especie cambió de estado, pero no se pudo guardar el comentario."
        );

        return;
    }


    await cargarPendientes();
}


/* =========================================================
   INICIO
========================================================= */

cargarPendientes();