import {
    requiereRol
} from "../auth/permisos.js";


import {
    supabase
} from "../database/supabase.js";


const contenedor =
    document.querySelector(
        "#records-container"
    );


/* =========================================================
   CARGAR REGISTROS DEL USUARIO
========================================================= */

async function cargarRegistros() {

    const acceso =
        await requiereRol([
            "investigador",
            "revisor",
            "admin"
        ]);


    if (!acceso) {
        return;
    }


    const {
        usuario
    } = acceso;


    const {
        data,
        error
    } = await supabase
        .from("species")
        .select(`
            id,
            nombre_cientifico,
            nombre_comun,
            estado,
            fecha_creacion,
            fecha_actualizacion,

            review_notes (
                id,
                comentario,
                estado,
                fecha_creacion
            )
        `)
        .eq(
            "investigador_id",
            usuario.id
        )
        .order(
            "fecha_creacion",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);


        contenedor.innerHTML = `
            <div class="record-card">
                No fue posible cargar tus registros.
            </div>
        `;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="record-card">
                Todavía no has enviado ninguna especie.
            </div>
        `;

        return;
    }


    contenedor.innerHTML =
        "";


    data.forEach(
        especie => {

            renderizarRegistro(
                especie
            );

        }
    );
}


/* =========================================================
   RENDERIZAR REGISTRO
========================================================= */

function renderizarRegistro(
    especie
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "record-card";


    /* =====================================================
       NOMBRE CIENTÍFICO
    ===================================================== */

    const titulo =
        document.createElement(
            "h2"
        );


    titulo.textContent =
        especie.nombre_cientifico;


    card.appendChild(
        titulo
    );


    /* =====================================================
       NOMBRE COMÚN
    ===================================================== */

    if (
        especie.nombre_comun
    ) {

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


    /* =====================================================
       ESTADO
    ===================================================== */

    const estado =
        document.createElement(
            "span"
        );


    estado.className =
        "record-status";


    if (
        especie.estado ===
        "rechazado"
    ) {

        estado.classList.add(
            "record-status-rejected"
        );
    }


    estado.textContent =
        textoEstado(
            especie.estado
        );


    card.appendChild(
        estado
    );


    /* =====================================================
       OBSERVACIONES DEL REVISOR

       Solo se muestran cuando el registro requiere
       correcciones.
    ===================================================== */

    if (
        especie.estado ===
        "rechazado"
    ) {

        const ultimaNota =
            obtenerUltimoRechazo(
                especie.review_notes
            );


        const revision =
            document.createElement(
                "div"
            );


        revision.className =
            "record-review-note";


        const encabezado =
            document.createElement(
                "strong"
            );


        encabezado.textContent =
            "Observaciones del revisor";


        revision.appendChild(
            encabezado
        );


        const comentario =
            document.createElement(
                "p"
            );


        comentario.textContent =
            ultimaNota?.comentario ||
            "El registro requiere correcciones.";


        revision.appendChild(
            comentario
        );


        card.appendChild(
            revision
        );
    }


    /* =====================================================
       ACCIONES

       Se permite editar:
       - rechazado
       - aprobado

       No se permite editar:
       - pendiente_revision
       - retirado
    ===================================================== */

    if (
        puedeEditarRegistro(
            especie.estado
        )
    ) {

        const acciones =
            document.createElement(
                "div"
            );


        acciones.className =
            "record-actions";


        const editar =
            document.createElement(
                "a"
            );


        editar.className =
            "btn btn-primary";


        editar.href =
            `editar-especie.html?id=${especie.id}`;


        /*
         * El texto cambia dependiendo
         * del estado actual.
         */
        if (
            especie.estado ===
            "rechazado"
        ) {

            editar.textContent =
                "Corregir registro";

        } else {

            editar.textContent =
                "Editar registro";

        }


        acciones.appendChild(
            editar
        );


        card.appendChild(
            acciones
        );
    }


    /* =====================================================
       MENSAJE PARA REGISTROS EN REVISIÓN
    ===================================================== */

    if (
        especie.estado ===
        "pendiente_revision"
    ) {

        const informacion =
            document.createElement(
                "p"
            );


        informacion.className =
            "record-info";


        informacion.textContent =
            "Este registro está siendo revisado y no puede editarse temporalmente.";


        card.appendChild(
            informacion
        );
    }


    /* =====================================================
       REGISTRO RETIRADO
    ===================================================== */

    if (
        especie.estado ===
        "retirado"
    ) {

        const informacion =
            document.createElement(
                "p"
            );


        informacion.className =
            "record-info";


        informacion.textContent =
            "Este registro fue retirado del catálogo y no puede editarse.";


        card.appendChild(
            informacion
        );
    }


    contenedor.appendChild(
        card
    );
}


/* =========================================================
   COMPROBAR SI EL REGISTRO PUEDE EDITARSE
========================================================= */

function puedeEditarRegistro(
    estado
) {

    return (
        estado === "rechazado" ||
        estado === "aprobado"
    );
}


/* =========================================================
   ÚLTIMA NOTA DE RECHAZO
========================================================= */

function obtenerUltimoRechazo(
    notas
) {

    if (
        !notas ||
        notas.length === 0
    ) {

        return null;
    }


    return [...notas]

        .filter(
            nota =>
                nota.estado ===
                "rechazado"
        )

        .sort(
            (a, b) =>
                new Date(
                    b.fecha_creacion
                ) -
                new Date(
                    a.fecha_creacion
                )
        )[0] || null;
}


/* =========================================================
   TEXTO DE ESTADO
========================================================= */

function textoEstado(
    estado
) {

    const estados = {

        borrador:
            "Borrador",

        pendiente_revision:
            "Pendiente de revisión",

        aprobado:
            "Aprobado",

        rechazado:
            "Requiere correcciones",

        retirado:
            "Retirado del catálogo"

    };


    return estados[estado] ||
        estado;
}


/* =========================================================
   INICIAR
========================================================= */

cargarRegistros();