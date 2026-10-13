import { supabase } from "./database/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

    // Año del footer
    const year = document.querySelector("[data-year]");

    if (year) {
        year.textContent = new Date().getFullYear();
    }


    // Página actual
    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";


    // Marcar navegación activa
    document.querySelectorAll("[data-nav]").forEach(link => {

        const href = link.getAttribute("href");

        if (!href) {
            return;
        }

        const linkPage =
            href.split("/").pop();

        if (linkPage === currentPage) {
            link.classList.add("activo");
        }

    });


    // Comprobar si existe una sesión de Supabase
    const {
        data,
        error
    } = await supabase.auth.getSession();


    if (error) {
        console.error(
            "Error comprobando la sesión:",
            error
        );
    }


    actualizarEnlacesAutenticacion(
        data.session
    );


    // Actualizar navegación si inicia o cierra sesión
    supabase.auth.onAuthStateChange(
        (_event, session) => {

            actualizarEnlacesAutenticacion(
                session
            );

        }
    );

});


function actualizarEnlacesAutenticacion(session) {

    const dentroDePages =
        window.location.pathname.includes("/pages/");


    const rutaLogin =
        dentroDePages
            ? "login.html"
            : "pages/login.html";


    const rutaPanel =
        dentroDePages
            ? "investigador.html"
            : "pages/investigador.html";


    document
        .querySelectorAll("[data-auth-link]")
        .forEach(link => {

            if (session) {

                link.href = rutaPanel;

                if (
                    link.dataset.authLabel === "true"
                ) {
                    link.textContent = "Panel";
                }

            } else {

                link.href = rutaLogin;

                if (
                    link.dataset.authLabel === "true"
                ) {
                    link.textContent = "Investigadores";
                }

            }

        });

}