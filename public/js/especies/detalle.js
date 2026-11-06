import { supabase } from "../database/supabase.js";

import {
    mostrarModelo3D
} from "../multimedia/modelos3d.js";


const SIGNED_URL_TTL =
    300;


const parametros =
    new URLSearchParams(
        window.location.search
    );


const especieId =
    parametros.get("id");


const imagenPrincipal =
    document.querySelector(
        "#imagen-principal"
    );


const galeria =
    document.querySelector(
        "#galeria"
    );


/* =========================================================
   CARGAR ESPECIE
========================================================= */

async function cargarEspecie() {

    if (!especieId) {

        mostrarError(
            "No se indicó una especie."
        );

        return;
    }


    /* =====================================================
       OBTENER INFORMACIÓN DE LA ESPECIE
    ===================================================== */

    const {
        data: especie,
        error
    } = await supabase
        .from("species")
        .select(`
            *,
            species_images (
                id,
                ruta_archivo,
                tipo_imagen,
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
            "estado",
            "aprobado"
        )
        .single();


    if (
        error ||
        !especie
    ) {

        console.error(
            "Error cargando la especie:",
            error
        );


        mostrarError(
            "La especie no existe o no está disponible públicamente."
        );

        return;
    }


    /* =====================================================
       OBTENER NOMBRE DEL INVESTIGADOR
    ===================================================== */

    const {
        data: nombreInvestigador,
        error: errorInvestigador
    } = await supabase.rpc(
        "obtener_investigador_especie",
        {
            p_especie_id:
                especie.id
        }
    );


    if (
        errorInvestigador
    ) {

        console.error(
            "Error al obtener el investigador:",
            errorInvestigador
        );
    }


    /* =====================================================
       ACTUALIZAR TÍTULO
    ===================================================== */

    document.title =
        `${especie.nombre_cientifico} | Catálogo Micológico`;


    /* =====================================================
       MOSTRAR INFORMACIÓN
    ===================================================== */

    llenarInformacion(
        especie,
        nombreInvestigador
    );


    /* =====================================================
       CARGAR MULTIMEDIA
    ===================================================== */

    await Promise.all([

        cargarGaleria(
            especie.species_images
        ),

        cargarModelo(
            especie.species_models
        )

    ]);
}


/* =========================================================
   LLENAR INFORMACIÓN
========================================================= */

function llenarInformacion(
    especie,
    nombreInvestigador
) {

    document.querySelector(
        "#familia"
    ).textContent =
        especie.familia ||
        "Familia no registrada";


    document.querySelector(
        "#nombre-cientifico"
    ).textContent =
        especie.nombre_cientifico;


    document.querySelector(
        "#nombre-comun"
    ).textContent =
        especie.nombre_comun ||
        "";


    document.querySelector(
        "#reino"
    ).textContent =
        especie.reino ||
        "—";


    document.querySelector(
        "#phylum"
    ).textContent =
        especie.phylum ||
        "—";


    document.querySelector(
        "#clase"
    ).textContent =
        especie.clase ||
        "—";


    document.querySelector(
        "#orden"
    ).textContent =
        especie.orden ||
        "—";


    document.querySelector(
        "#familia-taxonomia"
    ).textContent =
        especie.familia ||
        "—";


    document.querySelector(
        "#genero"
    ).textContent =
        especie.genero ||
        "—";


    document.querySelector(
        "#descripcion"
    ).textContent =
        especie.descripcion ||
        "Sin descripción registrada.";


    document.querySelector(
        "#caracteristicas"
    ).textContent =
        especie.caracteristicas ||
        "Sin características registradas.";


    document.querySelector(
        "#habitat"
    ).textContent =
        especie.habitat ||
        "Sin información de hábitat.";


    document.querySelector(
        "#distribucion"
    ).textContent =
        especie.distribucion ||
        "Sin información de distribución.";


    document.querySelector(
        "#lugar-registro"
    ).textContent =
        especie.lugar_registro ||
        "—";


    document.querySelector(
        "#fecha-registro"
    ).textContent =
        especie.fecha_registro ||
        "—";


    document.querySelector(
        "#investigador"
    ).textContent =
        nombreInvestigador ||
        "Investigador no disponible";
}


/* =========================================================
   CREAR URL FIRMADA
========================================================= */

async function obtenerUrlFirmada(
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

        console.error(
            `No fue posible crear una URL firmada para ${ruta}:`,
            error
        );

        return null;
    }


    return data.signedUrl;
}


/* =========================================================
   GALERÍA
========================================================= */

async function cargarGaleria(
    imagenes
) {

    galeria.innerHTML =
        "";


    if (
        !imagenes ||
        imagenes.length === 0
    ) {

        imagenPrincipal
            .removeAttribute(
                "src"
            );


        imagenPrincipal.alt =
            "No hay imagen disponible";

        return;
    }


    const ordenadas =
        [...imagenes]
            .sort(
                (a, b) =>
                    (a.orden ?? 0) -
                    (b.orden ?? 0)
            );


    const imagenesFirmadas =
        await Promise.all(

            ordenadas.map(
                async imagen => {

                    const url =
                        await obtenerUrlFirmada(
                            "species-images",
                            imagen.ruta_archivo
                        );


                    return {
                        ...imagen,
                        url
                    };

                }
            )

        );


    const disponibles =
        imagenesFirmadas.filter(
            imagen => imagen.url
        );


    if (
        disponibles.length === 0
    ) {

        imagenPrincipal
            .removeAttribute(
                "src"
            );


        imagenPrincipal.alt =
            "No hay imagen disponible";

        return;
    }


    const primera =
        disponibles[0];


    imagenPrincipal.src =
        primera.url;


    imagenPrincipal.alt =
        primera.descripcion ||
        "Imagen de la especie";


    disponibles.forEach(
        imagen => {

            const miniatura =
                document.createElement(
                    "img"
                );


            miniatura.src =
                imagen.url;


            miniatura.alt =
                imagen.descripcion ||
                "Imagen de la especie";


            miniatura.addEventListener(
                "click",
                () => {

                    imagenPrincipal.src =
                        imagen.url;


                    imagenPrincipal.alt =
                        imagen.descripcion ||
                        "Imagen de la especie";

                }
            );


            galeria.appendChild(
                miniatura
            );

        }
    );
}


/* =========================================================
   MODELO 3D
========================================================= */

async function cargarModelo(
    modelos
) {

    if (
        !modelos ||
        modelos.length === 0
    ) {

        return;
    }


    const modelo =
        modelos[0];


    const url =
        await obtenerUrlFirmada(
            "species-models",
            modelo.ruta_archivo
        );


    if (!url) {

        console.error(
            "No fue posible cargar el modelo 3D."
        );

        return;
    }


    mostrarModelo3D(
        document.querySelector(
            "#visor-3d"
        ),
        url
    );
}


/* =========================================================
   MOSTRAR ERROR
========================================================= */

function mostrarError(
    mensaje
) {

    const detalle =
        document.querySelector(
            "#detalle-especie"
        );


    if (detalle) {

        detalle.innerHTML = `

            <div class="catalog-message">

                <h2>
                    No se pudo cargar la especie
                </h2>

                <p>
                    ${mensaje}
                </p>

                <a
                    href="catalogo.html"
                    class="btn btn-primary"
                >
                    Volver al catálogo
                </a>

            </div>
        `;
    }


    const visor =
        document.querySelector(
            "#visor-3d"
        );


    if (visor) {

        visor.innerHTML =
            "";
    }
}


/* =========================================================
   INICIO
========================================================= */

cargarEspecie();