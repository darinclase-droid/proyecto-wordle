// ─── ESTADO GLOBAL ───────────────────────────────────────────────────────────
let palabras        = [];
let palabraSecreta  = "";
let filaActual      = 0;
let letraActual     = 0;
let juegoActivo     = false;
let animando        = false;

// Contrarreloj
let modoContrarreloj = false;
let tiempo           = 60;
let intervalo        = null;

// Estadísticas
let stats = JSON.parse(localStorage.getItem("wordleStats")) || { jugadas: 0, ganadas: 0 };

// ─── REFERENCIAS AL DOM ───────────────────────────────────────────────────────
const tableroEl  = document.getElementById("tablero");
const tecladoEl  = document.getElementById("teclado");
const statsEl    = document.getElementById("stats");
const timerEl    = document.getElementById("timer");

// Mensaje en pantalla (evita alert() que mueve el foco)
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
    `;
    document.body.appendChild(msg);
  }
  msg.textContent = texto;
  msg.style.display = "block";
  clearTimeout(mensajeTimeout);
  mensajeTimeout = setTimeout(() => { msg.style.display = "none"; }, duracion);
}

// Array 2D de celdas: celdas[fila][col]
let celdas = [];

// ─── ESTADÍSTICAS ─────────────────────────────────────────────────────────────
function actualizarStats() {
  statsEl.textContent = `Jugadas: ${stats.jugadas} | Ganadas: ${stats.ganadas}`;
}

// ─── CARGA DE PALABRAS ────────────────────────────────────────────────────────
async function cargarPalabras() {
  const res = await fetch("palabras_castellano_5_letras.json");
  palabras = await res.json();
}

// ─── TABLERO ──────────────────────────────────────────────────────────────────
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

// ─── TECLADO ──────────────────────────────────────────────────────────────────
function crearTeclado() {
  tecladoEl.innerHTML = "";
  const layout = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L"],
    ["↵","Z","X","C","V","B","N","M","⌫"]
  ];
  layout.forEach(fila => {
    const filaEl = document.createElement("div");
    filaEl.className = "fila-teclado";
    fila.forEach(letra => {
      const btn = document.createElement("button");
      btn.className = "tecla";
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

// ─── PINTAR TECLA ─────────────────────────────────────────────────────────────
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

// ─── BOTONES DE MODO ──────────────────────────────────────────────────────────
function resaltarModo() {
  document.getElementById("btn-clasico").classList.toggle("activo", !modoContrarreloj);
  document.getElementById("btn-contrarreloj").classList.toggle("activo", modoContrarreloj);
}

// ─── TEMPORIZADOR ─────────────────────────────────────────────────────────────
function iniciarTemporizador() {
  clearInterval(intervalo);
  tiempo = 60;
  timerEl.style.color = "white";
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

// ─── ACTIVAR MODOS ────────────────────────────────────────────────────────────
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

// ─── NUEVA PARTIDA ────────────────────────────────────────────────────────────
function nuevaPartida() {
  detenerTemporizador();
  filaActual  = 0;
  letraActual = 0;
  animando    = false;
  juegoActivo = true;

  crearTablero();
  crearTeclado();

  palabraSecreta = palabras[Math.floor(Math.random() * palabras.length)];
  console.log("DEBUG palabra:", palabraSecreta);

  actualizarStats();

  if (modoContrarreloj) {
    iniciarTemporizador();
  } else {
    timerEl.style.color = "white";
    timerEl.textContent = "";
  }

  document.activeElement.blur();
}

// ─── ESCRIBIR / BORRAR ────────────────────────────────────────────────────────
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

// ─── CALCULAR RESULTADOS ──────────────────────────────────────────────────────
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

// ─── ENVIAR INTENTO ───────────────────────────────────────────────────────────
function enviarIntento() {
  if (!juegoActivo || animando || letraActual < 5) return;

  let intento = "";
  for (let i = 0; i < 5; i++) intento += celdas[filaActual][i].textContent;

  if (!palabras.includes(intento)) {
    mostrarMensaje("Palabra no válida");
    return;
  }

  animando = true;

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
      localStorage.setItem("wordleStats", JSON.stringify(stats));
      actualizarStats();
      mostrarMensaje("¡Ganaste! 🎉 Era: " + palabraSecreta, 4000);
      return;
    }

    const siguienteFila = filaIdx + 1;

    if (siguienteFila >= 6) {
      juegoActivo = false;
      detenerTemporizador();
      stats.jugadas++;
      localStorage.setItem("wordleStats", JSON.stringify(stats));
      actualizarStats();
      mostrarMensaje("¡Perdiste! Era: " + palabraSecreta, 4000);
      return;
    }

    filaActual  = siguienteFila;
    letraActual = 0;
    juegoActivo = true;

  }, 5 * 300 + 300);
}

// ─── TECLADO FÍSICO ───────────────────────────────────────────────────────────
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

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
async function iniciar() {
  await cargarPalabras();
  resaltarModo();   // marcar "Modo clásico" como activo al arrancar
  nuevaPartida();
}

iniciar();