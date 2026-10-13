import {
    requiereRol
} from "../auth/permisos.js";

import {
    supabase
} from "../database/supabase.js";


const formulario =
    document.querySelector(
        "#species-form"
    );


const mensaje =
    document.querySelector(
        "#species-form-message"
    );


let acceso = null;


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


    if (
        acceso.perfil.rol === "investigador" &&
        acceso.perfil.estado_verificacion !== "verificado"
    ) {

        formulario.innerHTML = `
            <div class="catalog-message">

                <h2>
                    Cuenta pendiente de verificación
                </h2>

                <p>
                    Un administrador debe verificar tu cuenta antes
                    de que puedas enviar especies.
                </p>

            </div>
        `;
    }
}


formulario.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!acceso) {
            return;
        }


        if (
            acceso.perfil.rol === "investigador" &&
            acceso.perfil.estado_verificacion !== "verificado"
        ) {

            mostrarMensaje(
                "Tu cuenta todavía no está verificada.",
                true
            );

            return;
        }


        mostrarMensaje(
            "Guardando información..."
        );


        const especie = {

            nombre_cientifico:
                valor("nombre-cientifico"),

            nombre_comun:
                valor("nombre-comun"),

            reino:
                valor("reino") || "Fungi",

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
                valor("caracteristicas"),

            habitat:
                valor("habitat"),

            distribucion:
                valor("distribucion"),

            fecha_registro:
                valor("fecha-registro") || null,

            lugar_registro:
                valor("lugar-registro"),

            estado:
                "pendiente_revision",

            investigador_id:
                acceso.usuario.id
        };


        const {
            data,
            error
        } = await supabase
            .from("species")
            .insert(especie)
            .select("id")
            .single();


        if (error) {

            console.error(error);

            mostrarMensaje(
                "No fue posible registrar la especie.",
                true
            );

            return;
        }


        const especieId =
            data.id;


        try {

            await subirImagenes(
                especieId
            );


            await subirModelo(
                especieId
            );


        } catch (error) {

            console.error(error);

            mostrarMensaje(
                "La especie se creó, pero ocurrió un problema al subir los archivos.",
                true
            );

            return;
        }


        mostrarMensaje(
            "La especie fue enviada correctamente a revisión."
        );


        formulario.reset();


        setTimeout(() => {

            window.location.href =
                "mis-registros.html";

        }, 1200);

    }
);


function valor(id) {

    return document
        .querySelector(`#${id}`)
        .value
        .trim();
}


async function subirImagenes(especieId) {

    const input =
        document.querySelector("#imagenes");


    const archivos =
        Array.from(input.files);


    for (
        const archivo of archivos
    ) {

        validarImagen(archivo);


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
            .from("species-images")
            .upload(
                ruta,
                archivo,
                {
                    contentType:
                        archivo.type,
                    upsert: false
                }
            );


        if (uploadError) {
            throw uploadError;
        }


        const {
            error: databaseError
        } = await supabase
            .from("species_images")
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


async function subirModelo(especieId) {

    const input =
        document.querySelector("#modelo3d");


    const archivo =
        input.files[0];


    if (!archivo) {
        return;
    }


    validarModelo(archivo);


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
        .from("species-models")
        .upload(
            ruta,
            archivo,
            {
                contentType:
                    extension === "glb"
                        ? "model/gltf-binary"
                        : "model/gltf+json",

                upsert: false
            }
        );


    if (uploadError) {
        throw uploadError;
    }


    const {
        error
    } = await supabase
        .from("species_models")
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

        });


    if (error) {
        throw error;
    }
}


function validarImagen(archivo) {

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !tiposPermitidos.includes(
            archivo.type
        )
    ) {

        throw new Error(
            "Tipo de imagen no permitido."
        );
    }


    const maximo =
        10 * 1024 * 1024;


    if (archivo.size > maximo) {

        throw new Error(
            "La imagen supera los 10 MB."
        );
    }
}


function validarModelo(archivo) {

    const extension =
        obtenerExtension(
            archivo.name
        );


    if (
        !["glb", "gltf"].includes(
            extension
        )
    ) {

        throw new Error(
            "El modelo debe ser GLB o GLTF."
        );
    }


    const maximo =
        100 * 1024 * 1024;


    if (archivo.size > maximo) {

        throw new Error(
            "El modelo supera los 100 MB."
        );
    }
}


function obtenerExtension(nombre) {

    return nombre
        .split(".")
        .pop()
        .toLowerCase();
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


iniciar();