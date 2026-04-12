// ============================================================
// CÓDIGO 1 — MINERO NODE.JS
// Solo mina y envía todo al banco Python (Código 2)
// ❌ Sin banco local — Flask es el único banco
// ============================================================

const express = require('express');
const axios   = require('axios');

const app  = express();
const PORT = 3000;

// ⚠️ En producción usa variable de entorno:
// const URL_BANCO = process.env.URL_BANCO_PRINCIPAL || "http://localhost:5000";
const URL_BANCO = process.env.URL_BANCO_PRINCIPAL || "http://localhost:5000";

app.use(express.json());

// ============================================================
// ENVIAR AL BANCO PYTHON — con reintentos automáticos
// ============================================================
async function enviarAlBanco(ruta, datos, intentos = 3) {
    for (let i = 1; i <= intentos; i++) {
        try {
            const respuesta = await axios.post(`${URL_BANCO}/${ruta}`, datos, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' }
            });
            console.log(`✅ [${ruta}] Enviado:`, respuesta.data);
            return respuesta.data;
        } catch (error) {
            console.error(`❌ [${ruta}] Intento ${i}/${intentos}: ${error.message}`);
            if (i < intentos) await new Promise(r => setTimeout(r, 2000 * i));
        }
    }
    console.error(`🔴 [${ruta}] Falló después de ${intentos} intentos. Se perdió el dato.`);
    return null;
}

// ============================================================
// MINERÍA — genera monedas y las manda directo al Flask
// ❌ No acumula nada aquí
// ============================================================
function iniciarMineria() {
    console.log("⛏️  Minería iniciada — enviando directo al banco Python");

    setInterval(async () => {
        // Simula dificultad variable (entre 0.001 y 0.05)
        const ganancia = parseFloat((Math.random() * 0.049 + 0.001).toFixed(6));

        console.log(`⛏️  Minado: +${ganancia} monedas → enviando al banco...`);

        await enviarAlBanco('recibir-mineria', {
            usuario: "minero",
            cantidad: ganancia,
            timestamp: Date.now()
        });

    }, 3000); // cada 3 segundos
}

// ============================================================
// RUTAS
// ============================================================
app.get('/', (req, res) => {
    res.json({
        sistema : "Minero NodeJS",
        version : "2.0",
        estado  : "activo",
        banco   : URL_BANCO,
        nota    : "Sin banco local — todo va al banco Python"
    });
});

app.get('/ping', (req, res) => {
    res.json({ status: "ok", ts: Date.now() });
});

// ============================================================
// ARRANQUE
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 Minero Node corriendo en puerto ${PORT}`);
    console.log(`🏦 Banco destino: ${URL_BANCO}`);
    iniciarMineria();
});
