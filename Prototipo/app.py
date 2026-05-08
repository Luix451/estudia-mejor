from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from google import genai
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import CharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from datetime import datetime
import os
import time

# ==========================================
# CONFIGURACIÓN PRINCIPAL
# ==========================================

app = Flask(__name__)
CORS(app)

# ==========================================
# API KEY GEMINI
# ==========================================

API_KEY = "AIzaSyD3jdtIvYKIWmhe12vVumSu09FWanVtcSg"

# Cliente Gemini
client = genai.Client(api_key=API_KEY)

# ==========================================
# EMBEDDINGS LOCALES
# ==========================================

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# ==========================================
# BASES VECTORIALES
# ==========================================

bases_vectoriales = {}

# ==========================================
# CARGAR CONOCIMIENTO
# ==========================================

def inicializar_conocimiento():

    carpeta_fuentes = "pdfs"

    carreras = [
        "ingenieria",
        "administracion",
        "enfermeria"
    ]

    if not os.path.exists(carpeta_fuentes):
        os.makedirs(carpeta_fuentes)

    splitter = CharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=30
    )

    for carrera in carreras:

        ruta = os.path.join(
            carpeta_fuentes,
            f"{carrera}.txt"
        )

        if os.path.exists(ruta):

            with open(ruta, "r", encoding="utf-8") as f:

                texto = f.read()

                docs = splitter.create_documents([texto])

                bases_vectoriales[carrera] = FAISS.from_documents(
                    docs,
                    embeddings
                )

    print("===================================")
    print("Sistemas cargados:")
    print(list(bases_vectoriales.keys()))
    print("===================================")

# Inicializar conocimiento
inicializar_conocimiento()

# ==========================================
# RUTAS WEB
# ==========================================

@app.route("/")
def inicio():
    return render_template("inicio.html")

@app.route("/chat-ui")
def chat_ui():
    return render_template("chat.html")

# ==========================================
# CHAT PRINCIPAL
# ==========================================

@app.route("/chat", methods=["POST"])
def procesar_chat():

    try:

        data = request.get_json(force=True)

        pregunta = data.get("mensaje", "").strip()

        perfil = data.get("perfil", "ingenieria")

        if not pregunta:

            return jsonify({
                "respuesta": "Consulta vacía.",
                "nivel": "rojo"
            }), 400

        # ==========================================
        # RECUPERAR CONTEXTO
        # ==========================================

        db = bases_vectoriales.get(perfil)

        contexto = ""

        fuentes = []

        if db:

            resultados = db.similarity_search(
                pregunta,
                k=1
            )

            contexto = " ".join(
                [r.page_content for r in resultados]
            )

            fuentes = [
                f"Repositorio Oficial {perfil.capitalize()}"
            ]

        else:

            contexto = "Sin fuentes específicas."

        # ==========================================
        # PROMPT OPTIMIZADO
        # ==========================================

        prompt = f"""
Eres un tutor universitario especializado en la carrera de {perfil}.

Tu función es responder únicamente temas relacionados
con esa facultad.

Si la pregunta NO pertenece a la carrera seleccionada,
indica amablemente que el estudiante debe cambiar
de facultad para obtener una mejor orientación.

Ayuda al estudiante a comprender el tema sin resolver
la tarea completa.

Contexto académico:
{contexto}

IMPORTANTE:

- Usa Markdown bien estructurado
- Usa títulos y listas
- Usa párrafos cortos
- Responde de forma clara y organizada
- Basa tu respuesta principalmente en el contexto entregado

Estructura obligatoria:

1. Concepto breve
2. Uso responsable de IA
3. Riesgo de desinformación
4. Consejo de bienestar digital
5. Pregunta reflexiva

Además:

- Incluye al final una sección llamada:
  "Enlaces Recomendados"

- Proporciona enlaces REALES y verificables.

- Usa únicamente sitios confiables como:
  universidades,
  OMS,
  OPS,
  Scielo,
  PubMed,
  Redalyc,
  ministerios oficiales,
  documentación académica.

- Los enlaces deben estar relacionados con la carrera seleccionada.

Carrera seleccionada:
{perfil}

Pregunta del estudiante:
{pregunta}
"""

        # ==========================================
        # RESPUESTA GEMINI
        # ==========================================

        try:

            response = client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=prompt
            )

            respuesta = ""
            
            for chunk in response:

             if hasattr(chunk, "text") and chunk.text:

              respuesta += chunk.text

        except Exception as ia_error:

            error_texto = str(ia_error)

            # ERROR DE CUOTA
            if "429" in error_texto:

                time.sleep(5)

                respuesta = (
                    "El sistema alcanzó el límite gratuito de Gemini. "
                    "Espera unos segundos e intenta nuevamente."
                )

            # ERROR DE SATURACIÓN
            elif "503" in error_texto:

                time.sleep(3)

                respuesta = (
                    "Gemini está temporalmente ocupado. "
                    "Intenta nuevamente en unos segundos."
                )

            # MODELO NO ENCONTRADO
            elif "404" in error_texto:

                respuesta = (
                    "El modelo IA no está disponible actualmente."
                )

            else:

                respuesta = (
                    f"Error temporal del modelo IA: {error_texto}"
                )

        # ==========================================
        # ANÁLISIS ÉTICO
        # ==========================================

        nivel = "verde"

        mensaje_etico = (
            "Recuerda verificar y citar las fuentes."
        )

        palabras_dependencia = [
            "hazme",
            "resuelve",
            "dame la respuesta",
            "haz la tarea",
            "escribe por mi"
        ]

        if any(
            p in pregunta.lower()
            for p in palabras_dependencia
        ):

            nivel = "amarillo"

            mensaje_etico = (
                "Intenta razonar antes de pedir respuestas completas."
            )

        # ==========================================
        # RESPUESTA FINAL
        # ==========================================

        return jsonify({

            "respuesta": respuesta,

            "nivel": nivel,

            "fuentes": fuentes,

            "mensaje_etico": mensaje_etico,

            "timestamp": datetime.now().isoformat()

        })

    except Exception as e:

        return jsonify({

            "respuesta": f"Error general: {str(e)}",

            "nivel": "rojo"

        }), 500

# ==========================================
# EJECUTAR SERVIDOR
# ==========================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )