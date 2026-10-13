import { supabase } from "../database/supabase.js";


const formulario =
    document.querySelector("#login-form");


const mensaje =
    document.querySelector("#login-message");


formulario.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        mensaje.textContent =
            "Iniciando sesión...";


        mensaje.className =
            "form-message";


        const correo =
            document.querySelector("#correo")
                .value
                .trim();


        const password =
            document.querySelector("#password")
                .value;


        const {
            error
        } = await supabase.auth.signInWithPassword({

            email: correo,

            password: password

        });


        if (error) {

            console.error(error);


            mensaje.textContent =
                "No fue posible iniciar sesión. Verifica tus datos.";

            mensaje.classList.add("error");

            return;
        }


        window.location.href =
            "investigador.html";

    }
);