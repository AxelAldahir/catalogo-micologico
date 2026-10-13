import { supabase } from "../database/supabase.js";


const contenedor =
    document.querySelector("#catalogo-hongos");


const buscador =
    document.querySelector("#buscador-catalogo");


const SIGNED_URL_TTL =
    300;


let especies = [];


/* =========================================================
   CARGAR ESPECIES
========================================================= */

async function cargarEspecies() {

    contenedor.innerHTML = `
        <p class="catalog-message">
            Cargando catálogo...
        </p>
    `;


    const {
        data,
        error
    } = await supabase
        .from("species")
        .select(`
            id,
            nombre_cientifico,
            nombre_comun,
            familia,
            genero,
            species_images (
                id,
                ruta_archivo,
                orden
            )
        `)
        .eq(
            "estado",
            "aprobado"
        )
        .order(
            "nombre_cientifico",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Error cargando el catálogo:",
            error
        );


        contenedor.innerHTML = `
            <p class="catalog-message">
                No fue posible cargar el catálogo.
            </p>
        `;

        return;
    }


    especies =
        data || [];


    /*
     * Generamos una sola URL firmada por especie
     * al cargar el catálogo.
     */
    await Promise.all(

        especies.map(
            async especie => {

                especie.imagen_firmada =
                    await obtenerImagenPrincipal(
                        especie.species_images
                    );

            }
        )

    );


    renderizarEspecies(
        especies
    );
}


/* =========================================================
   OBTENER IMAGEN PRINCIPAL
========================================================= */

async function obtenerImagenPrincipal(
    imagenes
) {

    if (
        !imagenes ||
        imagenes.length === 0
    ) {
        return null;
    }


    const ordenadas =
        [...imagenes]
            .sort(
                (a, b) =>
                    (a.orden ?? 0) -
                    (b.orden ?? 0)
            );


    const imagen =
        ordenadas[0];


    const {
        data,
        error
    } = await supabase.storage
        .from("species-images")
        .createSignedUrl(
            imagen.ruta_archivo,
            SIGNED_URL_TTL
        );


    if (error) {

        console.error(
            "No fue posible crear la URL firmada de la imagen:",
            error
        );

        return null;
    }


    return data.signedUrl;
}


/* =========================================================
   RENDERIZAR ESPECIES
========================================================= */

function renderizarEspecies(
    lista
) {

    if (lista.length === 0) {

        contenedor.innerHTML = `
            <p class="catalog-message">
                No se encontraron especies.
            </p>
        `;

        return;
    }


    contenedor.innerHTML =
        "";


    lista.forEach(
        especie => {

            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "fungi-card";


            const imagen =
                especie.imagen_firmada;


            const imagenHTML =
                imagen
                    ? `
                        <img
                            class="fungi-card-image"
                            src="${imagen}"
                            alt="${especie.nombre_cientifico}"
                        >
                      `
                    : `
                        <div
                            class="fungi-card-image"
                            aria-hidden="true"
                        ></div>
                      `;


            tarjeta.innerHTML = `

                ${imagenHTML}

                <div class="fungi-card-content">

                    <p class="fungi-card-family">
                        ${
                            especie.familia ||
                            "Familia no registrada"
                        }
                    </p>

                    <h2>
                        ${especie.nombre_cientifico}
                    </h2>

                    ${
                        especie.nombre_comun
                            ? `
                                <p class="fungi-card-common">
                                    ${especie.nombre_comun}
                                </p>
                              `
                            : ""
                    }

                    <a
                        href="especie.html?id=${especie.id}"
                        class="fungi-card-link"
                    >
                        Ver especie →
                    </a>

                </div>
            `;


            contenedor.appendChild(
                tarjeta
            );

        }
    );
}


/* =========================================================
   FILTRAR ESPECIES
========================================================= */

function filtrarEspecies() {

    const termino =
        buscador
            .value
            .trim()
            .toLowerCase();


    if (!termino) {

        renderizarEspecies(
            especies
        );

        return;
    }


    const resultados =
        especies.filter(
            especie => {

                const texto = [

                    especie.nombre_cientifico,
                    especie.nombre_comun,
                    especie.familia,
                    especie.genero

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return texto.includes(
                    termino
                );

            }
        );


    renderizarEspecies(
        resultados
    );
}


/* =========================================================
   EVENTOS
========================================================= */

buscador.addEventListener(
    "input",
    filtrarEspecies
);


cargarEspecies();