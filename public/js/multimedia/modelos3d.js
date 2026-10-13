export function mostrarModelo3D(
    contenedor,
    url
) {

    contenedor.innerHTML = "";


    const visor =
        document.createElement(
            "model-viewer"
        );


    visor.src =
        url;


    visor.alt =
        "Modelo tridimensional de la especie";


    visor.setAttribute(
        "camera-controls",
        ""
    );


    visor.setAttribute(
        "auto-rotate",
        ""
    );


    visor.setAttribute(
        "shadow-intensity",
        "1"
    );


    visor.setAttribute(
        "touch-action",
        "pan-y"
    );


    contenedor.appendChild(
        visor
    );
}