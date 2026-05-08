const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const banner = document.getElementById("bienestar-banner");
const txtBanner = document.getElementById("bienestar-txt");

// ENTER
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        enviar();
    }
});

// ==========================================
// ENVIAR MENSAJE
// ==========================================

async function enviar() {

    const mensaje = input.value.trim();
    const perfil = document.getElementById("perfil-select").value;

    if (!mensaje) return;

    agregarMensaje(mensaje, "usuario");

    input.value = "";

    // MENSAJE CARGANDO
    const loading = agregarMensaje(
        "Consultando repositorios...",
        "ia"
    );

    try {

        const res = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mensaje,
                perfil
            })
        });

        const data = await res.json();

        // QUITAR CARGA
        chat.removeChild(loading);

        actualizarBienestar(data.nivel);

        // CREAR MENSAJE VACÍO
        const divRespuesta = agregarMensaje(
            "",
            "ia",
            data.nivel,
            data.fuentes,
            data.mensaje_etico
        );

        // EFECTO ESCRITURA
        escribirTexto(
            divRespuesta.querySelector(".contenido"),
            data.respuesta
        );

    } catch (e) {

        chat.removeChild(loading);

        agregarMensaje(
            "Error de conexión",
            "ia",
            "rojo"
        );
    }
}

// ==========================================
// EFECTO MAQUINA DE ESCRIBIR
// ==========================================

function escribirTexto(elemento, texto) {

    let i = 0;
    let textoActual = "";

    function escribir() {

        if (i < texto.length) {

            textoActual += texto.charAt(i);

            // CONVERTIR MARKDOWN A HTML
            elemento.innerHTML = marked.parse(textoActual);

            i++;

            chat.scrollTop = chat.scrollHeight;

            setTimeout(escribir, 10);
        }
    }

    escribir();
}
// ==========================================
// BIENESTAR DIGITAL
// ==========================================
function actualizarBienestar(nivel) {

    const estado =
    document.getElementById("estado-texto");

    const nivelConcentracion =
    document.getElementById("nivel-concentracion");

    const consejo =
    document.getElementById("consejo");

    // VERDE
    if (nivel === "verde") {

        estado.innerText =
            "Todo bien";

        nivelConcentracion.innerText =
            "Alto";

        nivelConcentracion.style.background =
            "#d4f8d4";

        consejo.innerText =
            "Excelente ritmo de estudio. Continúa así.";
    }

    // AMARILLO
    if (nivel === "amarillo") {

        estado.innerText =
            "Hora de descansar";

        nivelConcentracion.innerText =
            "Medio";

        nivelConcentracion.style.background =
            "#fff3cd";

        consejo.innerText =
            "Llevas bastante tiempo estudiando. Un pequeño descanso ayudaría.";
    }

    // ROJO
    if (nivel === "rojo") {

        estado.innerText =
            "Fatiga detectada";

        nivelConcentracion.innerText =
            "Bajo";

        nivelConcentracion.style.background =
            "#ffd6d6";

        consejo.innerText =
            "Tu concentración puede disminuir. Descansa unos minutos.";
    }
}

// ================= TIEMPO DE USO =================

let minutos = 0;
let descansos = 0;

// ACTUALIZA CADA MINUTO

setInterval(() => {

    minutos++;

    document.getElementById("tiempo-uso")
    .innerText = minutos + " min";

    // CAMBIAR ESTADO

    if(minutos < 45){

        actualizarBienestar("verde");
    }

    else if(minutos >= 45 && minutos < 90){

        actualizarBienestar("amarillo");
    }

    else{

        actualizarBienestar("rojo");
    }

}, 60000);

// BOTON DESCANSO

document
.getElementById("btn-descanso")
.addEventListener("click", () => {

    descansos++;

    document.getElementById("descansos")
    .innerText = descansos;

    minutos = 0;

    document.getElementById("tiempo-uso")
    .innerText = "0 min";

    actualizarBienestar("verde");
});
// ==========================================
// AGREGAR MENSAJES
// ==========================================

function agregarMensaje(
    texto,
    clase,
    nivel = "",
    fuentes = [],
    etico = ""
) {

    const div = document.createElement("div");

    div.className = `mensaje ${clase} ${nivel}`;

    let contenido = `
        <div class="contenido"></div>
    `;

    if (fuentes && fuentes.length > 0) {

        contenido += `
        <div class="fuentes-box">
            📖 <b>Fuentes:</b>
            ${fuentes.join(", ")}
        </div>`;
    }

    if (etico) {

        contenido += `
        <div class="mensaje-etico">
            ⚖️ ${etico}
        </div>`;
    }

    div.innerHTML = contenido;

    chat.appendChild(div);

    // TEXTO DIRECTO
    div.querySelector(".contenido").innerHTML = texto;

    chat.scrollTop = chat.scrollHeight;

    return div;
}

/* ==========================================
   SIDEBAR CHATS
========================================== */

const chatLista = document.getElementById("chat-lista");
const nuevoChatBtn = document.getElementById("nuevo-chat");

/* ALMACENAR CHATS */
let chats = {};
let chatActual = "chat-1";

/* CHAT INICIAL */
chats[chatActual] = chat.innerHTML;

/* ==========================================
   NUEVO CHAT
========================================== */

nuevoChatBtn.addEventListener("click", () => {

    const id = "chat-" + Date.now();

    chats[id] = `
        <div class="mensaje ia">
            <div class="contenido">
                Nuevo chat iniciado.
            </div>
        </div>
    `;

    crearItemChat(id, "Nuevo Chat");

    cambiarChat(id);

});

/* ==========================================
   CREAR ITEM SIDEBAR
========================================== */

function crearItemChat(id, nombre){

    const div = document.createElement("div");

    div.className = "chat-item";

    div.dataset.id = id;

    div.innerHTML = `
        <span>${nombre}</span>
        <button class="eliminar">🗑</button>
    `;

    chatLista.appendChild(div);

}

/* ==========================================
   CAMBIAR CHAT
========================================== */

function cambiarChat(id){

    /* GUARDAR CHAT ACTUAL */
    chats[chatActual] = chat.innerHTML;

    /* CAMBIAR */
    chatActual = id;

    /* CARGAR */
    chat.innerHTML = chats[id];

    /* ACTIVAR VISUAL */
    document.querySelectorAll(".chat-item")
    .forEach(item => {

        item.classList.remove("active");

        if(item.dataset.id === id){
            item.classList.add("active");
        }

    });

}

/* ==========================================
   CLICK SIDEBAR
========================================== */

chatLista.addEventListener("click", (e) => {

    const item = e.target.closest(".chat-item");

    if(!item) return;

    const id = item.dataset.id;

    /* ELIMINAR */

    if(e.target.classList.contains("eliminar")){

        delete chats[id];

        item.remove();

        /* SI ERA EL ACTUAL */
        if(chatActual === id){

            chat.innerHTML = "";

        }

        return;
    }

    /* CAMBIAR CHAT */
    cambiarChat(id);

});

/* ==========================================
   CHAT INICIAL SIDEBAR
========================================== */

const menuToggle = document.getElementById("menu-toggle");

const sidebar = document.querySelector(".sidebar");

const overlay = document.getElementById("overlay");

/* ABRIR / CERRAR MENU */

menuToggle.addEventListener("click", () => {

    sidebar.classList.toggle("active");

    overlay.classList.toggle("active");

});

/* CERRAR TOCANDO AFUERA */

overlay.addEventListener("click", () => {

    sidebar.classList.remove("active");

    overlay.classList.remove("active");

});

/* CERRAR MENU AL CAMBIAR CHAT EN MOVIL */

chatLista.addEventListener("click", () => {

    if(window.innerWidth <= 768){

        sidebar.classList.remove("active");

        overlay.classList.remove("active");
    }

});