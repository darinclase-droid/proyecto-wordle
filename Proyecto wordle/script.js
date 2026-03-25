let palabras = [];

let palabraSecreta = "";
let filaActual = 0;
let letraActual = 0;
let juegoActivo = true;

const tablero = document.getElementById("tablero");

// Cargar JSON
async function cargarPalabras() {
  const res = await fetch("palabras.json");
  palabras = await res.json();
}

// Crear tablero
function crearTablero() {
  tablero.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    const fila = document.createElement("div");
    fila.className = "fila";

    for (let j = 0; j < 5; j++) {
      const celda = document.createElement("div");
      celda.className = "celda";
      fila.appendChild(celda);
    }

    tablero.appendChild(fila);
  }
}

// Elegir palabra
function elegirPalabra() {
  palabraSecreta = palabras[Math.floor(Math.random() * palabras.length)];
  console.log("Palabra:", palabraSecreta);
}

// Nueva partida
function nuevaPartida() {
  filaActual = 0;
  letraActual = 0;
  juegoActivo = true;
  crearTablero();
  elegirPalabra();
}

// Escribir letra
function escribirLetra(letra) {
  if (!juegoActivo || letraActual >= 5) return;

  const fila = tablero.children[filaActual];
  const celda = fila.children[letraActual];

  celda.textContent = letra;
  letraActual++;
}

//  Pintar la letra
function pintarTecla(letra, estado) {
  const tecla = document.getElementById("tecla-" + letra);
  if (!tecla) return;

  // Prioridad: verde > amarillo > gris
  if (estado === "verde") {
    tecla.classList.remove("amarillo", "gris");
    tecla.classList.add("verde");
  } else if (estado === "amarillo") {
    if (!tecla.classList.contains("verde")) {
      tecla.classList.remove("gris");
      tecla.classList.add("amarillo");
    }
  } else {
    if (!tecla.classList.contains("verde") && !tecla.classList.contains("amarillo")) {
      tecla.classList.add("gris");
    }
  }
}

// Borrar letra
function borrarLetra() {
  if (letraActual <= 0) return;

  letraActual--;
  const fila = tablero.children[filaActual];
  fila.children[letraActual].textContent = "";
}

// Enviar intento
function enviarIntento() {
  if (letraActual < 5) return;

  const fila = tablero.children[filaActual];
  let intento = "";

  for (let i = 0; i < 5; i++) {
    intento += fila.children[i].textContent;
  }

  comprobarIntento(intento, fila);

  if (intento === palabraSecreta) {
    alert("¡Has ganado!");
    juegoActivo = false;
    return;
  }

  filaActual++;
  letraActual = 0;

  if (filaActual === 6) {
    alert("Has perdido. Era: " + palabraSecreta);
    juegoActivo = false;
  }
}

// Comprobar letras
function comprobarIntento(intento, fila) {
  for (let i = 0; i < 5; i++) {
    const letra = intento[i];
    const celda = fila.children[i];

  if (letra === palabraSecreta[i]) {
    celda.classList.add("verde");
    pintarTecla(letra, "verde");

  } else if (palabraSecreta.includes(letra)) {
    celda.classList.add("amarillo");
    pintarTecla(letra, "amarillo");

  } else {
    celda.classList.add("gris");
    pintarTecla(letra, "gris");
  }
  }
}

// Teclado
document.addEventListener("keydown", (e) => {
  if (!juegoActivo) return;

  if (e.key === "Enter") {
    enviarIntento();
  } else if (e.key === "Backspace") {
    borrarLetra();
  } else if (/^[a-zA-ZñÑ]$/.test(e.key)) {
    escribirLetra(e.key.toUpperCase());
  }
});

// Iniciar
async function iniciarJuego() {
  await cargarPalabras();
  crearTablero();
  elegirPalabra();
}

iniciarJuego();