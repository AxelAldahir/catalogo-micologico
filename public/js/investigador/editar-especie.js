import {
    requiereRol
} from "../auth/permisos.js";


import {
    supabase
} from "../database/supabase.js";


import {
    mostrarModelo3D
} from "../multimedia/modelos3d.js";


const parametros =
    new URLSearchParams(
        window.location.search
    );


const especieId =
    parametros.get("id");


const formulario =
    document.querySelector(
        "#edit-species-form"
    );


const mensaje =
    document.querySelector(
        "#edit-message"
    );


const notaRevision =
    document.querySelector(
        "#nota-revision"
    );


const imagenesExistentes =
    document.querySelector(
        "#imagenes-existentes"
    );


const modeloExistente =
    document.querySelector(
        "#modelo-existente"
    );


const SIGNED_URL_TTL =
    300;


let acceso =
    null;


let especieActual =
    null;


/* =========================================================
   INICIAR
========================================================= */

async function iniciar() {

    acceso =
        await requiereRol([
            "investigador",
            "revisor",
            "admin"
        ]);


    if (!acceso) {
        return;
    }


    if (!especieId) {

        mostrarMensaje(
            "No se indicó qué especie debe corregirse.",
            true
        );

        return;
    }


    const {
        data,
        error
    } = await supabase
        .from("species")
        .select(`
            *,

            species_images (
                id,
                ruta_archivo,
                descripcion,
                orden
            ),

            species_models (
                id,
                ruta_archivo,
                formato,
                descripcion
            )
        `)
        .eq(
            "id",
            especieId
        )
        .eq(
            "investigador_id",
            acceso.usuario.id
        )
        .eq(
            "estado",
            "rechazado"
        )
        .single();


    if (
        error ||
        !data
    ) {

        console.error(error);


        formulario.innerHTML = `
            <div class="catalog-message">
                Este registro no puede editarse.
            </div>
        `;

        return;
    }


    especieActual =
        data;


    llenarFormulario();


    await Promise.all([
        cargarNotas(),
        renderizarImagenes(),
        renderizarModelo()
    ]);
}


/* =========================================================
   LLENAR FORMULARIO
========================================================= */

function llenarFormulario() {

    asignar(
        "nombre-cientifico",
        especieActual.nombre_cientifico
    );

    asignar(
        "nombre-comun",
        especieActual.nombre_comun
    );

    asignar(
        "reino",
        especieActual.reino
    );

    asignar(
        "phylum",
        especieActual.phylum
    );

    asignar(
        "clase",
        especieActual.clase
    );

    asignar(
        "orden",
        especieActual.orden
    );

    asignar(
        "familia",
        especieActual.familia
    );

    asignar(
        "genero",
        especieActual.genero
    );

    asignar(
        "descripcion",
        especieActual.descripcion
    );

    asignar(
        "caracteristicas",
        especieActual.caracteristicas
    );

    asignar(
        "habitat",
        especieActual.habitat
    );

    asignar(
        "distribucion",
        especieActual.distribucion
    );

    asignar(
        "fecha-registro",
        especieActual.fecha_registro
    );

    asignar(
        "lugar-registro",
        especieActual.lugar_registro
    );
}


/* =========================================================
   NOTAS DEL REVISOR
========================================================= */

async function cargarNotas() {

    const {
        data,
        error
    } = await supabase
        .from("review_notes")
        .select(`
            comentario,
            estado,
            fecha_creacion
        `)
        .eq(
            "species_id",
            especieId
        )
        .order(
            "fecha_creacion",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        notaRevision.textContent =
            "No fue posible cargar las observaciones.";

        return;
    }


    const rechazo =
        data?.find(
            nota =>
                nota.estado ===
                "rechazado"
        );


    notaRevision.innerHTML =
        "";


    const titulo =
        document.createElement(
            "strong"
        );


    titulo.textContent =
        "Observaciones del revisor";


    const texto =
        document.createElement(
            "p"
        );


    texto.textContent =
        rechazo?.comentario ||
        "El registro requiere correcciones.";


    notaRevision.append(
        titulo,
        texto
    );
}


/* =========================================================
   URL FIRMADA
========================================================= */

async function urlFirmada(
    bucket,
    ruta
) {

    const {
        data,
        error
    } = await supabase.storage
        .from(bucket)
        .createSignedUrl(
            ruta,
            SIGNED_URL_TTL
        );


    if (error) {

        console.error(error);

        return null;
    }


    return data.signedUrl;
}


/* =========================================================
   IMÁGENES EXISTENTES
========================================================= */

async function renderizarImagenes() {

    imagenesExistentes.innerHTML =
        "";


    const imagenes =
        especieActual.species_images ||
        [];


    if (
        imagenes.length === 0
    ) {

        imagenesExistentes.textContent =
            "No hay fotografías registradas.";

        return;
    }


    for (
        const imagen of imagenes
    ) {

        const url =
            await urlFirmada(
                "species-images",
                imagen.ruta_archivo
            );


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "edit-image-card";


        if (url) {

            const img =
                document.createElement(
                    "img"
                );


            img.src =
                url;


            img.alt =
                imagen.descripcion ||
                "Fotografía registrada";


            card.appendChild(
                img
            );
        }


        const eliminar =
            document.createElement(
                "button"
            );


        eliminar.type =
            "button";


        eliminar.className =
            "btn btn-reject";


        eliminar.textContent =
            "Eliminar fotografía";


        eliminar.addEventListener(
            "click",
            () =>
                eliminarImagen(
                    imagen
                )
        );


        card.appendChild(
            eliminar
        );


        imagenesExistentes.appendChild(
            card
        );
    }
}


/* =========================================================
   ELIMINAR IMAGEN
========================================================= */

async function eliminarImagen(
    imagen
) {

    const confirmar =
        window.confirm(
            "¿Eliminar esta fotografía del registro?"
        );


    if (!confirmar) {
        return;
    }


    const {
        error: databaseError
    } = await supabase
        .from("species_images")
        .delete()
        .eq(
            "id",
            imagen.id
        );


    if (databaseError) {

        console.error(
            databaseError
        );

        mostrarMensaje(
            "No fue posible eliminar la fotografía.",
            true
        );

        return;
    }


    const {
        error: storageError
    } = await supabase.storage
        .from("species-images")
        .remove([
            imagen.ruta_archivo
        ]);


    if (storageError) {

        console.error(
            storageError
        );

    }


    especieActual.species_images =
        especieActual.species_images.filter(
            item =>
                item.id !==
                imagen.id
        );


    await renderizarImagenes();
}



/* =========================================================
   MODELO 3D EXISTENTE
========================================================= */

async function renderizarModelo() {

    modeloExistente.innerHTML =
        "";


    const modelos =
        especieActual.species_models ||
        [];


    if (
        modelos.length === 0
    ) {

        const mensaje =
            document.createElement(
                "p"
            );


        mensaje.textContent =
            "No hay modelo 3D registrado.";


        modeloExistente.appendChild(
            mensaje
        );

        return;
    }


    const modelo =
        modelos[0];


    const url =
        await urlFirmada(
            "species-models",
            modelo.ruta_archivo
        );


    if (!url) {

        modeloExistente.textContent =
            "No fue posible cargar el modelo 3D.";

        return;
    }


    /*
     * El visor va dentro de su propio contenedor.
     */
    const visor =
        document.createElement(
            "div"
        );


    visor.className =
        "model-viewer-container edit-model-viewer";


    modeloExistente.appendChild(
        visor
    );


    mostrarModelo3D(
        visor,
        url
    );


    /*
     * Información del modelo.
     */
    const informacion =
        document.createElement(
            "div"
        );


    informacion.className =
        "edit-model-info";


    const formato =
        document.createElement(
            "span"
        );


    formato.textContent =
        `Formato: ${modelo.formato.toUpperCase()}`;


    informacion.appendChild(
        formato
    );


    if (
        modelo.descripcion
    ) {

        const archivo =
            document.createElement(
                "span"
            );


        archivo.textContent =
            `Archivo: ${modelo.descripcion}`;


        informacion.appendChild(
            archivo
        );
    }


    modeloExistente.appendChild(
        informacion
    );


    /*
     * Botón para eliminar el modelo sin sustituirlo.
     */
    const acciones =
        document.createElement(
            "div"
        );


    acciones.className =
        "edit-model-actions";


    const eliminar =
        document.createElement(
            "button"
        );


    eliminar.type =
        "button";


    eliminar.className =
        "btn btn-reject";


    eliminar.textContent =
        "Eliminar modelo 3D";


    eliminar.addEventListener(
        "click",
        eliminarModeloActual
    );


    acciones.appendChild(
        eliminar
    );


    modeloExistente.appendChild(
        acciones
    );
}

/* =========================================================
   GUARDAR
========================================================= */

async function guardar(
    reenviar
) {

    if (
        !formulario.reportValidity()
    ) {
        return;
    }


    bloquearBotones(
        true
    );


    mostrarMensaje(
        reenviar
            ? "Guardando y reenviando..."
            : "Guardando correcciones..."
    );


try {

    await subirNuevasImagenes();


    await sustituirModeloSiCorresponde();


    const cambios = {

            nombre_cientifico:
                valor(
                    "nombre-cientifico"
                ),

            nombre_comun:
                valor(
                    "nombre-comun"
                ),

            reino:
                valor("reino") ||
                "Fungi",

            phylum:
                valor("phylum"),

            clase:
                valor("clase"),

            orden:
                valor("orden"),

            familia:
                valor("familia"),

            genero:
                valor("genero"),

            descripcion:
                valor("descripcion"),

            caracteristicas:
                valor(
                    "caracteristicas"
                ),

            habitat:
                valor("habitat"),

            distribucion:
                valor(
                    "distribucion"
                ),

            fecha_registro:
                valor(
                    "fecha-registro"
                ) || null,

            lugar_registro:
                valor(
                    "lugar-registro"
                ),

            estado:
                reenviar
                    ? "pendiente_revision"
                    : "rechazado"

        };


        const {
            error
        } = await supabase
            .from("species")
            .update(
                cambios
            )
            .eq(
                "id",
                especieId
            );


        if (error) {
            throw error;
        }


        if (reenviar) {

            mostrarMensaje(
                "El registro fue reenviado correctamente a revisión."
            );


            setTimeout(
                () => {

                    window.location.href =
                        "mis-registros.html";

                },
                1000
            );


            return;
        }


        mostrarMensaje(
            "Las correcciones fueron guardadas."
        );


        document.querySelector(
            "#imagenes-nuevas"
        ).value = "";


        document.querySelector(
            "#modelo3d-nuevo"
        ).value = "";


    } catch (error) {

        console.error(
            error
        );


        mostrarMensaje(
            "No fue posible guardar las correcciones.",
            true
        );

    } finally {

        bloquearBotones(
            false
        );

    }
}


/* =========================================================
   SUBIR NUEVAS IMÁGENES
========================================================= */

async function subirNuevasImagenes() {

    const input =
        document.querySelector(
            "#imagenes-nuevas"
        );


    const archivos =
        Array.from(
            input.files
        );


    for (
        const archivo of archivos
    ) {

        validarImagen(
            archivo
        );


        const extension =
            obtenerExtension(
                archivo.name
            );


        const nombre =
            `${crypto.randomUUID()}.${extension}`;


        const ruta =
            `${acceso.usuario.id}/${especieId}/${nombre}`;


        const {
            error: uploadError
        } = await supabase.storage
            .from(
                "species-images"
            )
            .upload(
                ruta,
                archivo,
                {
                    contentType:
                        archivo.type,

                    upsert:
                        false
                }
            );


        if (uploadError) {
            throw uploadError;
        }


        const {
            error: databaseError
        } = await supabase
            .from(
                "species_images"
            )
            .insert({

                species_id:
                    especieId,

                ruta_archivo:
                    ruta,

                tipo_imagen:
                    archivo.type,

                descripcion:
                    archivo.name,

                autor:
                    acceso.perfil.nombre_completo

            });


        if (databaseError) {
            throw databaseError;
        }
    }
}


/* =========================================================
   VALIDACIONES
========================================================= */

function validarImagen(
    archivo
) {

    const permitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !permitidos.includes(
            archivo.type
        )
    ) {

        throw new Error(
            "Tipo de imagen no permitido."
        );
    }


    if (
        archivo.size >
        10 * 1024 * 1024
    ) {

        throw new Error(
            "Una imagen supera los 10 MB."
        );
    }
}

/* =========================================================
   VALIDAR MODELO 3D
========================================================= */

function validarModelo(
    archivo
) {

    const extension =
        obtenerExtension(
            archivo.name
        );


    if (
        ![
            "glb",
            "gltf"
        ].includes(
            extension
        )
    ) {

        throw new Error(
            "El modelo debe ser un archivo GLB o GLTF."
        );
    }


    const maximo =
        100 * 1024 * 1024;


    if (
        archivo.size >
        maximo
    ) {

        throw new Error(
            "El modelo 3D supera los 100 MB."
        );
    }
}


function obtenerExtension(
    nombre
) {

    return nombre
        .split(".")
        .pop()
        .toLowerCase();
}


function valor(
    id
) {

    return document
        .querySelector(
            `#${id}`
        )
        .value
        .trim();
}


function asignar(
    id,
    valor
) {

    document
        .querySelector(
            `#${id}`
        )
        .value =
            valor || "";
}


function mostrarMensaje(
    texto,
    error = false
) {

    mensaje.textContent =
        texto;


    mensaje.className =
        error
            ? "form-message error"
            : "form-message success";
}


function bloquearBotones(
    bloquear
) {

    document.querySelector(
        "#guardar-correcciones"
    ).disabled =
        bloquear;


    document.querySelector(
        "#reenviar-revision"
    ).disabled =
        bloquear;
}


/* =========================================================
   EVENTOS
========================================================= */

document.querySelector(
    "#guardar-correcciones"
).addEventListener(
    "click",
    () => guardar(false)
);


document.querySelector(
    "#reenviar-revision"
).addEventListener(
    "click",
    () => guardar(true)
);


iniciar();

/* =========================================================
   SUSTITUIR MODELO 3D
========================================================= */

async function sustituirModeloSiCorresponde() {

    const input =
        document.querySelector(
            "#modelo3d-nuevo"
        );


    const archivo =
        input.files[0];


    /*
     * Si no seleccionaron un modelo nuevo,
     * no hacemos ningún cambio.
     */
    if (!archivo) {
        return;
    }


    validarModelo(
        archivo
    );


    const extension =
        obtenerExtension(
            archivo.name
        );


    const nombre =
        `${crypto.randomUUID()}.${extension}`;


    const ruta =
        `${acceso.usuario.id}/${especieId}/${nombre}`;


    /* =====================================================
       1. SUBIR NUEVO ARCHIVO
    ===================================================== */

    const {
        error: uploadError
    } = await supabase.storage
        .from(
            "species-models"
        )
        .upload(
            ruta,
            archivo,
            {
                contentType:
                    extension === "glb"
                        ? "model/gltf-binary"
                        : "model/gltf+json",

                upsert:
                    false
            }
        );


    if (uploadError) {

        throw uploadError;

    }


    /* =====================================================
       2. CREAR NUEVO REGISTRO
    ===================================================== */

    const {
        data: nuevoModelo,
        error: insertError
    } = await supabase
        .from(
            "species_models"
        )
        .insert({

            species_id:
                especieId,

            ruta_archivo:
                ruta,

            formato:
                extension,

            descripcion:
                archivo.name,

            autor:
                acceso.perfil.nombre_completo

        })
        .select(`
            id,
            ruta_archivo,
            formato,
            descripcion
        `)
        .single();


    /*
     * Si falla la BD, quitamos el archivo que
     * acabamos de subir para no dejarlo huérfano.
     */
    if (insertError) {

        await supabase.storage
            .from(
                "species-models"
            )
            .remove([
                ruta
            ]);


        throw insertError;
    }


    /* =====================================================
       3. GUARDAR MODELOS ANTERIORES
    ===================================================== */

    const anteriores =
        [
            ...(
                especieActual
                    .species_models ||
                []
            )
        ];


    /*
     * Si no había modelo anterior, terminamos aquí.
     */
    if (
        anteriores.length === 0
    ) {

        especieActual.species_models =
            [
                nuevoModelo
            ];


        input.value =
            "";


        await renderizarModelo();


        return;
    }


    /* =====================================================
       4. BORRAR REGISTROS ANTERIORES DE LA BD
    ===================================================== */

    const idsAnteriores =
        anteriores.map(
            modelo =>
                modelo.id
        );


    const {
        error: deleteDatabaseError
    } = await supabase
        .from(
            "species_models"
        )
        .delete()
        .in(
            "id",
            idsAnteriores
        );


    /*
     * Si no podemos eliminar el modelo anterior,
     * hacemos rollback del nuevo.
     */
    if (
        deleteDatabaseError
    ) {

        await supabase
            .from(
                "species_models"
            )
            .delete()
            .eq(
                "id",
                nuevoModelo.id
            );


        await supabase.storage
            .from(
                "species-models"
            )
            .remove([
                ruta
            ]);


        throw deleteDatabaseError;
    }


    /* =====================================================
       5. BORRAR ARCHIVOS ANTERIORES DE STORAGE
    ===================================================== */

    const rutasAnteriores =
        anteriores
            .map(
                modelo =>
                    modelo.ruta_archivo
            )
            .filter(Boolean);


    if (
        rutasAnteriores.length >
        0
    ) {

        const {
            error: deleteStorageError
        } = await supabase.storage
            .from(
                "species-models"
            )
            .remove(
                rutasAnteriores
            );


        if (
            deleteStorageError
        ) {

            /*
             * El nuevo modelo ya quedó correctamente
             * registrado. Solo registramos el posible
             * archivo huérfano para revisarlo después.
             */
            console.error(
                "El modelo anterior fue retirado de la base de datos, pero no pudo eliminarse de Storage:",
                deleteStorageError
            );
        }
    }


    /* =====================================================
       6. ACTUALIZAR INTERFAZ
    ===================================================== */

    especieActual.species_models =
        [
            nuevoModelo
        ];


    input.value =
        "";


    await renderizarModelo();
}

/* =========================================================
   ELIMINAR MODELO 3D ACTUAL
========================================================= */

async function eliminarModeloActual() {

    const modelos =
        especieActual.species_models ||
        [];


    if (
        modelos.length === 0
    ) {
        return;
    }


    const confirmar =
        window.confirm(
            "¿Quieres eliminar el modelo 3D actual? Esta acción se aplicará inmediatamente."
        );


    if (!confirmar) {
        return;
    }


    mostrarMensaje(
        "Eliminando modelo 3D..."
    );


    const ids =
        modelos.map(
            modelo =>
                modelo.id
        );


    const rutas =
        modelos
            .map(
                modelo =>
                    modelo.ruta_archivo
            )
            .filter(Boolean);


    /*
     * Primero quitamos las referencias de la BD.
     */
    const {
        error: databaseError
    } = await supabase
        .from(
            "species_models"
        )
        .delete()
        .in(
            "id",
            ids
        );


    if (
        databaseError
    ) {

        console.error(
            databaseError
        );


        mostrarMensaje(
            "No fue posible eliminar el modelo 3D.",
            true
        );

        return;
    }


    /*
     * Después eliminamos los archivos físicos.
     */
    if (
        rutas.length >
        0
    ) {

        const {
            error: storageError
        } = await supabase.storage
            .from(
                "species-models"
            )
            .remove(
                rutas
            );


        if (
            storageError
        ) {

            console.error(
                "No fue posible eliminar el archivo de Storage:",
                storageError
            );
        }
    }


    especieActual.species_models =
        [];


    await renderizarModelo();


    mostrarMensaje(
        "El modelo 3D fue eliminado."
    );
}