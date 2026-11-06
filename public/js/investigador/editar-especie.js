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

const SIGNED_URL_TTL = 300;

let acceso = null;
let especieActual = null;


/* =========================================================
   INICIAR
========================================================= */

async function iniciar() {

    acceso = await requiereRol([
        "investigador",
        "revisor",
        "admin"
    ]);

    if (!acceso) {
        return;
    }

    if (!especieId) {

        mostrarMensaje(
            "No se indicó qué especie debe editarse.",
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
        .in(
            "estado",
            [
                "rechazado",
                "aprobado"
            ]
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

    configurarBotones();


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

    if (!notaRevision) {
        return;
    }


    notaRevision.innerHTML =
        "";


    /*
     * Las observaciones solo aparecen
     * cuando el registro fue rechazado.
     */
    if (
        especieActual.estado !==
        "rechazado"
    ) {

        notaRevision.classList.add(
            "hidden"
        );

        return;
    }


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

        notaRevision.classList.remove(
            "hidden"
        );

        return;
    }


    const rechazo =
        data?.find(
            nota =>
                nota.estado ===
                "rechazado"
        );


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


    notaRevision.classList.remove(
        "hidden"
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

    if (!imagenesExistentes) {
        return;
    }


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


    const ordenadas =
        [...imagenes].sort(
            (a, b) =>
                (a.orden ?? 0) -
                (b.orden ?? 0)
        );


    for (
        const imagen of ordenadas
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

    if (!modeloExistente) {
        return;
    }


    modeloExistente.innerHTML =
        "";


    const modelos =
        especieActual.species_models ||
        [];


    if (
        modelos.length === 0
    ) {

        const texto =
            document.createElement(
                "p"
            );


        texto.textContent =
            "No hay modelo 3D registrado.";


        modeloExistente.appendChild(
            texto
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
   GUARDAR Y REENVIAR A REVISIÓN
========================================================= */

async function guardar() {

    if (
        !formulario.reportValidity()
    ) {
        return;
    }


    const confirmar =
        window.confirm(
            "Al guardar los cambios, el registro será enviado nuevamente a revisión. ¿Deseas continuar?"
        );


    if (!confirmar) {
        return;
    }


    bloquearBotones(
        true
    );


    mostrarMensaje(
        "Guardando cambios y enviando a revisión..."
    );


    try {

        /*
         * Primero se procesan los archivos nuevos.
         */
        await subirNuevasImagenes();


        await sustituirModeloSiCorresponde();


        /*
         * Después se actualiza la información
         * principal de la especie.
         */
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
                valor(
                    "reino"
                ) || "Fungi",

            phylum:
                valor(
                    "phylum"
                ),

            clase:
                valor(
                    "clase"
                ),

            orden:
                valor(
                    "orden"
                ),

            familia:
                valor(
                    "familia"
                ),

            genero:
                valor(
                    "genero"
                ),

            descripcion:
                valor(
                    "descripcion"
                ),

            caracteristicas:
                valor(
                    "caracteristicas"
                ),

            habitat:
                valor(
                    "habitat"
                ),

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

            /*
             * IMPORTANTE:
             * Cualquier edición vuelve a revisión.
             */
            estado:
                "pendiente_revision"
        };


        const {
            data,
            error
        } = await supabase
            .from("species")
            .update(
                cambios
            )
            .eq(
                "id",
                especieId
            )
            .eq(
                "investigador_id",
                acceso.usuario.id
            )
            .in(
                "estado",
                [
                    "rechazado",
                    "aprobado"
                ]
            )
            .select(
                "id"
            )
            .single();


        if (error) {
            throw error;
        }


        if (!data) {

            throw new Error(
                "No fue posible actualizar el registro."
            );
        }


        especieActual.estado =
            "pendiente_revision";


        mostrarMensaje(
            "Los cambios fueron guardados. El registro fue enviado nuevamente a revisión."
        );


        setTimeout(
            () => {

                window.location.href =
                    "mis-registros.html";

            },
            1200
        );


    } catch (error) {

        console.error(
            error
        );


        mostrarMensaje(
            "No fue posible guardar y reenviar el registro.",
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


    if (!input) {
        return;
    }


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


        /*
         * Guardamos también la nueva imagen
         * en la base de datos.
         */
        const {
            data: nuevaImagen,
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

            })
            .select(`
                id,
                ruta_archivo,
                descripcion,
                orden
            `)
            .single();


        if (databaseError) {

            /*
             * Si falla la base de datos,
             * eliminamos el archivo que acabamos
             * de subir para no dejarlo huérfano.
             */
            await supabase.storage
                .from(
                    "species-images"
                )
                .remove([
                    ruta
                ]);


            throw databaseError;
        }


        /*
         * Actualizar copia local.
         */
        especieActual.species_images = [

            ...(
                especieActual.species_images ||
                []
            ),

            nuevaImagen
        ];
    }


    input.value =
        "";
}


/* =========================================================
   SUSTITUIR MODELO 3D
========================================================= */

async function sustituirModeloSiCorresponde() {

    const input =
        document.querySelector(
            "#modelo3d-nuevo"
        );


    if (!input) {
        return;
    }


    const archivo =
        input.files[0];


    /*
     * Si no se seleccionó un nuevo modelo,
     * no realizamos cambios.
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
       1. SUBIR NUEVO MODELO
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
       2. REGISTRAR NUEVO MODELO EN BASE DE DATOS
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
     * Si falla la BD eliminamos el
     * archivo recién subido.
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
       3. OBTENER MODELOS ANTERIORES
    ===================================================== */

    const anteriores = [

        ...(
            especieActual
                .species_models ||
            []
        )
    ];


    /*
     * Si existía algún modelo anterior,
     * debe sustituirse por el nuevo.
     */
    if (
        anteriores.length > 0
    ) {

        const idsAnteriores =
            anteriores.map(
                modelo =>
                    modelo.id
            );


        /* =================================================
           4. BORRAR REGISTROS ANTERIORES
        ================================================= */

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
         * Si falla el borrado del anterior,
         * hacemos rollback del modelo nuevo.
         */
        if (deleteDatabaseError) {

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


        /* =================================================
           5. BORRAR ARCHIVOS ANTERIORES DE STORAGE
        ================================================= */

        const rutasAnteriores =
            anteriores
                .map(
                    modelo =>
                        modelo.ruta_archivo
                )
                .filter(
                    Boolean
                );


        if (
            rutasAnteriores.length > 0
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


            if (deleteStorageError) {

                console.error(
                    "El modelo anterior fue retirado de la base de datos, pero no pudo eliminarse de Storage:",
                    deleteStorageError
                );
            }
        }
    }


    /* =====================================================
       6. ACTUALIZAR INTERFAZ
    ===================================================== */

    especieActual.species_models = [
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
            .filter(
                Boolean
            );


    /*
     * Primero se eliminan las referencias
     * de la base de datos.
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


    if (databaseError) {

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
     * Después se elimina el archivo físico.
     */
    if (
        rutas.length > 0
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


        if (storageError) {

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


/* =========================================================
   VALIDAR IMAGEN
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


/* =========================================================
   OBTENER EXTENSIÓN
========================================================= */

function obtenerExtension(
    nombre
) {

    return nombre
        .split(".")
        .pop()
        .toLowerCase();
}


/* =========================================================
   OBTENER VALOR DE UN CAMPO
========================================================= */

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


/* =========================================================
   ASIGNAR VALOR A UN CAMPO
========================================================= */

function asignar(
    id,
    valorAsignado
) {

    const elemento =
        document.querySelector(
            `#${id}`
        );


    if (!elemento) {
        return;
    }


    elemento.value =
        valorAsignado ||
        "";
}


/* =========================================================
   MOSTRAR MENSAJE
========================================================= */

function mostrarMensaje(
    texto,
    error = false
) {

    if (!mensaje) {
        return;
    }


    mensaje.textContent =
        texto;


    mensaje.className =
        error
            ? "form-message error"
            : "form-message success";
}


/* =========================================================
   BLOQUEAR BOTONES
========================================================= */

function bloquearBotones(
    bloquear
) {

    const guardarCorrecciones =
        document.querySelector(
            "#guardar-correcciones"
        );


    const reenviarRevision =
        document.querySelector(
            "#reenviar-revision"
        );


    if (
        guardarCorrecciones
    ) {

        guardarCorrecciones.disabled =
            bloquear;
    }


    if (
        reenviarRevision
    ) {

        reenviarRevision.disabled =
            bloquear;
    }
}


/* =========================================================
   CONFIGURAR BOTONES
========================================================= */

function configurarBotones() {

    const guardarCorrecciones =
        document.querySelector(
            "#guardar-correcciones"
        );


    const reenviarRevision =
        document.querySelector(
            "#reenviar-revision"
        );


    /*
     * Tu HTML anterior tenía dos botones:
     *
     * - Guardar correcciones
     * - Reenviar a revisión
     *
     * Ahora ya no necesitamos dos acciones distintas.
     *
     * Si existen ambos botones ocultamos el primero
     * y dejamos únicamente el de reenviar.
     */
    if (
        guardarCorrecciones &&
        reenviarRevision
    ) {

        guardarCorrecciones.classList.add(
            "hidden"
        );
    }


    /*
     * Elegimos el botón disponible.
     */
    const botonPrincipal =
        reenviarRevision ||
        guardarCorrecciones;


    if (!botonPrincipal) {
        return;
    }


    /*
     * Evitamos que el botón envíe el formulario
     * de forma tradicional.
     */
    botonPrincipal.type =
        "button";


    botonPrincipal.textContent =
        "Guardar cambios y enviar a revisión";


    botonPrincipal.addEventListener(
        "click",
        guardar
    );
}


/* =========================================================
   EVITAR ENVÍO NATIVO DEL FORMULARIO
========================================================= */

formulario?.addEventListener(
    "submit",
    event => {

        event.preventDefault();

    }
);


/* =========================================================
   INICIAR
========================================================= */

iniciar();