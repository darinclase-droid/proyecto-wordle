// ─── CHULETA ─────────────────────────────────
function toggleChuleta() {
  const panel = document.getElementById("chuleta-panel");
  document.getElementById("chuleta-palabra").textContent = palabraSecreta || "—";
  panel.classList.toggle("visible");
}

function cerrarChuleta() {
  document.getElementById("chuleta-panel").classList.remove("visible");
}
// Se guarda en localStorage para recordarlo entre sesiones

let temaActual = localStorage.getItem("wordleTema") || "noche";

function aplicarTema(tema) {
  document.documentElement.setAttribute("data-tema", tema);
  document.getElementById("btn-tema").textContent = tema === "noche" ? "🌙" : "☀️";
  temaActual = tema;
  localStorage.setItem("wordleTema", tema);
}

function toggleTema() {
  aplicarTema(temaActual === "noche" ? "dia" : "noche");
}

// ─── VALIDACIÓN CON RAE + JSON DE RESPALDO ───────────────────────────────────
let palabras = [];

async function cargarPalabras() {
  try {
    const res = await fetch("palabras_castellano_5_letras.json");
    palabras = await res.json();
  } catch (e) {
    console.error("Error cargando JSON:", e);
    palabras = [];
  }
}

async function consultarRAE(palabra) {
  const url = `https://dle.rae.es/srv/search?w=${encodeURIComponent(palabra.toLowerCase())}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const texto = await res.text();
    if (texto.includes("No se ha encontrado")) return false;
    return true;
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

async function validarPalabra(palabra) {
  setEstadoValidacion("Comprobando en el diccionario...");
  const resultadoRAE = await consultarRAE(palabra);
  setEstadoValidacion("");
  if (resultadoRAE !== null) return resultadoRAE;
  console.warn("RAE no disponible, usando JSON de respaldo");
  return palabras.includes(palabra);
}

function setEstadoValidacion(texto) {
  const el = document.getElementById("ia-estado");
  if (el) el.textContent = texto;
}

// ─── PERFILES ────────────────────────────
const TOTAL_PERFILES = 5;
let perfilActual = parseInt(localStorage.getItem("wordlePerfilActual") || "0");

function claveStats(idx)  { return `wordleStats_perfil${idx}`; }
function claveNombre(idx) { return `wordleNombre_perfil${idx}`; }

function getNombre(idx) {
  return localStorage.getItem(claveNombre(idx)) || `Jugador ${idx + 1}`;
}

function getStats(idx) {
  return JSON.parse(localStorage.getItem(claveStats(idx))) || { jugadas: 0, ganadas: 0 };
}

function guardarStats(idx, s) {
  localStorage.setItem(claveStats(idx), JSON.stringify(s));
}

let stats = getStats(perfilActual);

function renderSelect() {
  const sel = document.getElementById("perfil-select");
  sel.innerHTML = "";
  for (let i = 0; i < TOTAL_PERFILES; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = getNombre(i);
    if (i === perfilActual) opt.selected = true;
    sel.appendChild(opt);
  }
}

function seleccionarPerfil(idx) {
  perfilActual = parseInt(idx);
  localStorage.setItem("wordlePerfilActual", perfilActual);
  stats = getStats(perfilActual);
  nuevaPartida();
}

function editarNombrePerfil() {
  const actual = getNombre(perfilActual);
  const nuevo = prompt(`Nombre para "${actual}":`, actual);
  if (nuevo !== null && nuevo.trim() !== "") {
    localStorage.setItem(claveNombre(perfilActual), nuevo.trim().slice(0, 20));
    renderSelect();
  }
}

// ─── ESTADO GLOBAL ───────────────────────────────────────────
let palabraSecreta  = "";
let filaActual      = 0;
let letraActual     = 0;
let juegoActivo     = false;
let animando        = false;

let modoContrarreloj = false;
let tiempo           = 60;
let intervalo        = null;

// ─── REFERENCIAS AL DOM ──────────────────────────────────────
const tableroEl = document.getElementById("tablero");
const tecladoEl = document.getElementById("teclado");
const statsEl   = document.getElementById("stats");
const timerEl   = document.getElementById("timer");

let celdas = [];

// ─── MENSAJE EN PANTALLA ───────────────────────────────────────
let mensajeTimeout = null;
function mostrarMensaje(texto, duracion = 2000) {
  let msg = document.getElementById("mensaje");
  if (!msg) {
    msg = document.createElement("div");
    msg.id = "mensaje";
    msg.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%, -50%);
      background:#fff; color:#121213; padding:10px 24px;
      border-radius:6px; font-weight:bold; font-size:1rem;
      z-index:999; pointer-events:none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(msg);
  }
  msg.textContent = texto;
  msg.style.display = "block";
  clearTimeout(mensajeTimeout);
  mensajeTimeout = setTimeout(() => { msg.style.display = "none"; }, duracion);
}

// ─── ESTADÍSTICAS ────────────────────────────────────────
function actualizarStats() {
  statsEl.textContent = `Jugadas: ${stats.jugadas} | Ganadas: ${stats.ganadas}`;
}

// ─── TABLERO ──────────────────────────────────────────────
function crearTablero() {
  tableroEl.innerHTML = "";
  celdas = [];
  for (let i = 0; i < 6; i++) {
    const filaEl = document.createElement("div");
    filaEl.className = "fila";
    celdas.push([]);
    for (let j = 0; j < 5; j++) {
      const celda = document.createElement("div");
      celda.className = "celda";
      filaEl.appendChild(celda);
      celdas[i].push(celda);
    }
    tableroEl.appendChild(filaEl);
  }
}

// ─── TECLADO ─────────────────────────────────────────────────
function crearTeclado() {
  tecladoEl.innerHTML = "";
  const layout = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L","Ñ"],
    ["↵","Z","X","C","V","B","N","M","⌫"]
  ];
  layout.forEach(fila => {
    const filaEl = document.createElement("div");
    filaEl.className = "fila-teclado";
    fila.forEach(letra => {
      const btn = document.createElement("button");
      btn.className = "tecla" + (letra === "↵" || letra === "⌫" ? " tecla-ancha" : "");
      btn.textContent = letra;
      btn.dataset.letra = letra;
      btn.addEventListener("mousedown", e => e.preventDefault());
      btn.addEventListener("click", () => {
        if      (letra === "↵") enviarIntento();
        else if (letra === "⌫") borrarLetra();
        else                    escribirLetra(letra);
      });
      filaEl.appendChild(btn);
    });
    tecladoEl.appendChild(filaEl);
  });
}

// ─── PINTAR TECLA ─────────────────────────────────────────
function pintarTecla(letra, estado) {
  const btn = tecladoEl.querySelector(`[data-letra="${letra}"]`);
  if (!btn) return;
  if (estado === "verde") {
    btn.classList.remove("amarillo","gris");
    btn.classList.add("verde");
  } else if (estado === "amarillo") {
    if (!btn.classList.contains("verde")) {
      btn.classList.remove("gris");
      btn.classList.add("amarillo");
    }
  } else {
    if (!btn.classList.contains("verde") && !btn.classList.contains("amarillo")) {
      btn.classList.add("gris");
    }
  }
}

// ─── BOTONES DE MODO ────────────────────────────────────────
function resaltarModo() {
  document.getElementById("btn-clasico").classList.toggle("activo", !modoContrarreloj);
  document.getElementById("btn-contrarreloj").classList.toggle("activo", modoContrarreloj);
}

// ─── TEMPORIZADOR ───────────────────────────────────────
function iniciarTemporizador() {
  clearInterval(intervalo);
  tiempo = 60;
  timerEl.style.color = temaActual === "noche" ? "white" : "#121213";
  timerEl.textContent = `Tiempo: ${tiempo}s`;
  intervalo = setInterval(() => {
    tiempo--;
    timerEl.textContent = `Tiempo: ${tiempo}s`;
    if (tiempo <= 10) timerEl.style.color = "red";
    if (tiempo <= 0) {
      clearInterval(intervalo);
      juegoActivo = false;
      mostrarMensaje("⏱ Tiempo agotado. Era: " + palabraSecreta, 4000);
    }
  }, 1000);
}

function detenerTemporizador() {
  clearInterval(intervalo);
  intervalo = null;
}

// ─── ACTIVAR MODOS ────────────────────────────────────────
function activarModoClasico() {
  modoContrarreloj = false;
  resaltarModo();
  nuevaPartida();
}

function activarContrarreloj() {
  modoContrarreloj = true;
  resaltarModo();
  nuevaPartida();
}

// ─── NUEVA PARTIDA ─────────────────────────────────────
function nuevaPartida() {
  detenerTemporizador();
  filaActual  = 0;
  letraActual = 0;
  animando    = false;
  juegoActivo = true;

  crearTablero();
  crearTeclado();
  cerrarChuleta();

  palabraSecreta = palabras[Math.floor(Math.random() * palabras.length)];
  console.log("DEBUG palabra:", palabraSecreta);

  actualizarStats();

  if (modoContrarreloj) {
    iniciarTemporizador();
  } else {
    timerEl.style.color = "";
    timerEl.textContent = "";
  }

  document.activeElement.blur();
}

// ─── ESCRIBIR / BORRAR ───────────────────────────────────────
function escribirLetra(letra) {
  if (animando || !juegoActivo || letraActual >= 5) return;
  celdas[filaActual][letraActual].textContent = letra;
  letraActual++;
}

function borrarLetra() {
  if (animando || !juegoActivo || letraActual <= 0) return;
  letraActual--;
  celdas[filaActual][letraActual].textContent = "";
}

// ─── CALCULAR RESULTADOS ────────────────────────────────────
function calcularResultados(intento) {
  const resultado  = Array(5).fill("gris");
  const secreta    = palabraSecreta.split("");
  const intentoArr = intento.split("");

  for (let i = 0; i < 5; i++) {
    if (intentoArr[i] === secreta[i]) {
      resultado[i]  = "verde";
      secreta[i]    = null;
      intentoArr[i] = null;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (intentoArr[i] === null) continue;
    const idx = secreta.indexOf(intentoArr[i]);
    if (idx !== -1) {
      resultado[i] = "amarillo";
      secreta[idx] = null;
    }
  }
  return resultado;
}

// ─── ENVIAR INTENTO ───────────────────────────────────────────
async function enviarIntento() {
  if (!juegoActivo || animando || letraActual < 5) return;

  let intento = "";
  for (let i = 0; i < 5; i++) intento += celdas[filaActual][i].textContent;

  animando = true;
  const esValida = await validarPalabra(intento);
  if (!esValida) {
    mostrarMensaje("Palabra no válida");
    animando = false;
    return;
  }

  const filaIdx    = filaActual;
  const filaCeldas = celdas[filaIdx];
  const resultados = calcularResultados(intento);

  for (let i = 0; i < 5; i++) {
    const celda  = filaCeldas[i];
    const estado = resultados[i];
    const letra  = intento[i];
    setTimeout(() => {
      celda.classList.add("flip", estado);
      pintarTecla(letra, estado);
    }, i * 300);
  }

  setTimeout(() => {
    animando = false;

    if (intento === palabraSecreta) {
      juegoActivo = false;
      detenerTemporizador();
      stats.jugadas++;
      stats.ganadas++;
      guardarStats(perfilActual, stats);
      actualizarStats();
      mostrarMensaje("!HAS GANADO! Era: " + palabraSecreta, 4000);
      return;
    }

    const siguienteFila = filaIdx + 1;

    if (siguienteFila >= 6) {
      juegoActivo = false;
      detenerTemporizador();
      stats.jugadas++;
      guardarStats(perfilActual, stats);
      actualizarStats();
      mostrarMensaje("¡Has Perdido! Era: " + palabraSecreta, 4000);
      return;
    }

    filaActual  = siguienteFila;
    letraActual = 0;
    juegoActivo = true;

  }, 5 * 300 + 300);
}

// ─── TECLADO FÍSICO ─────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    enviarIntento();
  } else if (e.key === "Backspace") {
    e.preventDefault();
    borrarLetra();
  } else if (/^[a-zA-ZñÑ]$/.test(e.key)) {
    escribirLetra(e.key.toUpperCase());
  }
});

// ─── ARRANQUE ────────────────────────────────────────────
async function iniciar() {
  aplicarTema(temaActual);   // aplicar tema guardado antes de renderizar
  await cargarPalabras();
  renderSelect();
  resaltarModo();
  nuevaPartida();
}

iniciar();