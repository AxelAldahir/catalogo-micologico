import {
    requiereRol,
    cerrarSesion
} from "../auth/permisos.js";


const nombre =
    document.querySelector(
        "#investigator-name"
    );


const estado =
    document.querySelector(
        "#researcher-status"
    );


const revisionCard =
    document.querySelector(
        "#revision-card"
    );

const usersAdminCard =
    document.querySelector(
        "#users-admin-card"
    );

const gestionCard =
    document.querySelector(
        "#gestion-card"
    );


const logoutButton =
    document.querySelector(
        "#logout-button"
    );


async function iniciarPanel() {

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
        perfil
    } = acceso;


    nombre.textContent =
        perfil.nombre_completo;


    // Revisor y administrador
    if (
        perfil.rol === "revisor" ||
        perfil.rol === "admin"
    ) {

        revisionCard.classList.remove(
            "hidden"
        );
    }

    if (
        perfil.rol === "admin"
    ) {

        usersAdminCard.classList.remove(
            "hidden"
        );
    }


    // Exclusivo del administrador
    if (
        perfil.rol === "admin"
    ) {

        gestionCard.classList.remove(
            "hidden"
        );
    }


    // Investigador pendiente
    if (
        perfil.rol === "investigador" &&
        perfil.estado_verificacion !== "verificado"
    ) {

        estado.innerHTML = `
            <strong>
                Cuenta pendiente de verificación.
            </strong>

            <p>
                Puedes consultar el panel, pero para
                enviar nuevas especies tu cuenta debe
                ser verificada.
            </p>
        `;

        return;
    }


    if (
        perfil.rol === "admin"
    ) {

        estado.innerHTML = `
            <strong>
                Sesión de administrador.
            </strong>

            <p>
                Puedes revisar registros y administrar
                las especies publicadas.
            </p>
        `;

        return;
    }


    if (
        perfil.rol === "revisor"
    ) {

        estado.innerHTML = `
            <strong>
                Sesión de revisor.
            </strong>

            <p>
                Puedes revisar los registros enviados
                por los investigadores.
            </p>
        `;

        return;
    }


    estado.innerHTML = `
        <strong>
            Cuenta verificada.
        </strong>

        <p>
            Puedes registrar especies para enviarlas
            a revisión.
        </p>
    `;
}


logoutButton.addEventListener(
    "click",
    cerrarSesion
);


iniciarPanel();