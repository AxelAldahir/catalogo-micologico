import { supabase } from "../database/supabase.js";


export async function obtenerUsuario() {

    const {
        data,
        error
    } = await supabase.auth.getUser();


    if (error) {
        console.error(error);
        return null;
    }


    return data.user;
}


export async function obtenerPerfil() {

    const usuario = await obtenerUsuario();

    if (!usuario) {
        return null;
    }


    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", usuario.id)
        .single();


    if (error) {
        console.error(error);
        return null;
    }


    return data;
}


export async function requiereLogin() {

    const usuario = await obtenerUsuario();

    if (!usuario) {

        window.location.href =
            "login.html";

        return null;
    }


    return usuario;
}


export async function requiereRol(rolesPermitidos) {

    const usuario = await requiereLogin();

    if (!usuario) {
        return null;
    }


    const perfil = await obtenerPerfil();


    if (!perfil) {

        alert(
            "No se encontró el perfil del usuario."
        );

        window.location.href =
            "../index.html";

        return null;
    }


    if (!rolesPermitidos.includes(perfil.rol)) {

        alert(
            "No tienes permisos para acceder a esta sección."
        );

        window.location.href =
            "investigador.html";

        return null;
    }


    return {
        usuario,
        perfil
    };
}


export async function cerrarSesion() {

    const {
        error
    } = await supabase.auth.signOut();


    if (error) {
        console.error(error);
        return;
    }


    window.location.href =
        "login.html";
}