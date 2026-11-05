import {
    requiereRol
} from "../auth/permisos.js";

import {
    supabase
} from "../database/supabase.js";


const contenedor =
    document.querySelector(
        "#users-container"
    );


const mensaje =
    document.querySelector(
        "#users-message"
    );


let usuarioActualId = null;


async function iniciar() {

    const acceso =
        await requiereRol([
            "admin"
        ]);


    if (!acceso) {
        return;
    }


    usuarioActualId =
        acceso.usuario.id;


    await cargarUsuarios();
}


async function cargarUsuarios() {

    mostrarMensaje(
        "Cargando usuarios..."
    );


    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select(`
            id,
            nombre_completo,
            institucion,
            correo_institucional,
            rol,
            estado_verificacion,
            fecha_registro
        `)
        .order(
            "fecha_registro",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        mostrarMensaje(
            "No fue posible cargar los usuarios.",
            true
        );

        return;
    }


    ocultarMensaje();


    const usuarios =
        data || [];


    usuarios.sort((a, b) => {

        if (
            a.estado_verificacion === "pendiente" &&
            b.estado_verificacion !== "pendiente"
        ) {
            return -1;
        }


        if (
            a.estado_verificacion !== "pendiente" &&
            b.estado_verificacion === "pendiente"
        ) {
            return 1;
        }


        return 0;
    });


    renderizarUsuarios(
        usuarios
    );
}


function renderizarUsuarios(usuarios) {

    contenedor.innerHTML = "";


    if (usuarios.length === 0) {

        contenedor.innerHTML = `
            <div class="user-card">
                No existen usuarios registrados.
            </div>
        `;

        return;
    }


    usuarios.forEach(perfil => {

        const tarjeta =
            document.createElement(
                "article"
            );


        tarjeta.className =
            "user-card";


        tarjeta.innerHTML = `

            <div class="user-info">

                <p class="eyebrow">
                    ${textoRol(perfil.rol)}
                </p>

                <h2>
                    ${escaparHTML(
                        perfil.nombre_completo
                    )}
                </h2>

                <p>
                    ${
                        escaparHTML(
                            perfil.correo_institucional ||
                            "Sin correo registrado"
                        )
                    }
                </p>

                ${
                    perfil.institucion
                        ? `
                            <p>
                                ${escaparHTML(
                                    perfil.institucion
                                )}
                            </p>
                          `
                        : ""
                }

                <div class="user-badges">

                    <span class="record-status">
                        ${textoRol(perfil.rol)}
                    </span>

                    <span class="record-status">
                        ${textoEstado(
                            perfil.estado_verificacion
                        )}
                    </span>

                </div>

            </div>


            <div class="user-actions">

                ${crearAcciones(perfil)}

            </div>

        `;


        contenedor.appendChild(
            tarjeta
        );
    });


    document
        .querySelectorAll(
            "[data-user-action]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                procesarAccion
            );

        });
}


function crearAcciones(perfil) {

    if (
        perfil.id === usuarioActualId
    ) {

        return `
            <span class="user-current">
                Tu cuenta
            </span>
        `;
    }


    /*
     * Investigador pendiente o rechazado:
     * permitir aprobación.
     */
    if (
        perfil.rol === "investigador" &&
        perfil.estado_verificacion !== "verificado"
    ) {

        return `
            <button
                type="button"
                class="btn btn-approve"
                data-user-action="aprobar"
                data-user-id="${perfil.id}"
            >
                Aprobar investigador
            </button>
        `;
    }


    /*
     * Investigador verificado:
     * permitir ascenso.
     */
    if (
        perfil.rol === "investigador" &&
        perfil.estado_verificacion === "verificado"
    ) {

        return `
            <button
                type="button"
                class="btn btn-primary"
                data-user-action="ascender"
                data-user-id="${perfil.id}"
            >
                Ascender a administrador
            </button>
        `;
    }


    /*
     * Otro administrador:
     * permitir degradación.
     */
    if (
        perfil.rol === "admin"
    ) {

        return `
            <button
                type="button"
                class="btn btn-secondary"
                data-user-action="degradar"
                data-user-id="${perfil.id}"
            >
                Degradar a investigador
            </button>
        `;
    }


    /*
     * Los revisores se conservan sin cambios.
     */
    return `
        <span class="user-current">
            Sin acciones disponibles
        </span>
    `;
}


async function procesarAccion(event) {

    const boton =
        event.currentTarget;


    const accion =
        boton.dataset.userAction;


    const usuarioId =
        boton.dataset.userId;


    const mensajes = {

        aprobar:
            "¿Deseas aprobar a este investigador?",

        ascender:
            "¿Deseas convertir a este investigador en administrador?",

        degradar:
            "¿Deseas convertir a este administrador nuevamente en investigador?"

    };


    if (
        !window.confirm(
            mensajes[accion]
        )
    ) {
        return;
    }


    boton.disabled = true;


    mostrarMensaje(
        "Actualizando usuario..."
    );


    const {
        error
    } = await supabase.rpc(
        "admin_gestionar_usuario",
        {
            p_usuario_id:
                usuarioId,

            p_accion:
                accion
        }
    );


    if (error) {

        console.error(error);

        mostrarMensaje(
            error.message ||
            "No fue posible actualizar el usuario.",
            true
        );

        boton.disabled = false;

        return;
    }


    mostrarMensaje(
        "Usuario actualizado correctamente."
    );


    await cargarUsuarios();
}


function textoRol(rol) {

    const roles = {

        investigador:
            "Investigador",

        revisor:
            "Revisor",

        admin:
            "Administrador"

    };


    return roles[rol] || rol;
}


function textoEstado(estado) {

    const estados = {

        pendiente:
            "Pendiente de aprobación",

        verificado:
            "Verificado",

        rechazado:
            "Rechazado"

    };


    return estados[estado] || estado;
}


function escaparHTML(valor) {

    const elemento =
        document.createElement(
            "div"
        );


    elemento.textContent =
        valor || "";


    return elemento.innerHTML;
}


function mostrarMensaje(
    texto,
    esError = false
) {

    mensaje.textContent =
        texto;


    mensaje.classList.remove(
        "hidden"
    );


    mensaje.classList.toggle(
        "error",
        esError
    );
}


function ocultarMensaje() {

    mensaje.classList.add(
        "hidden"
    );
}


iniciar();