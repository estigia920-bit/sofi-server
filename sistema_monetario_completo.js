const express = require('express');
const axios = require('axios'); // ✅✅✅ AQUÍ ESTÁ EL AXIOS QUE FALTABA
const app = express();
const PORT = 3000;

// Middleware para leer JSON
app.use(express.json());

// Datos del sistema
let saldoBanco = 0;

// ✅✅✅ AQUÍ PONES LA URL DE TU SERVIDOR PYTHON (CÓDIGO 2)
const URL_BANCO_PRINCIPAL = "http://localhost:5000";

// =============================================
// FUNCIÓN PARA MANDAR DATOS AL PYTHON
// =============================================
async function enviarAlBanco(ruta, datos) {
    try {
        const respuesta = await axios.post(`${URL_BANCO_PRINCIPAL}/${ruta}`, datos);
        console.log(`✅ Enviado a ${ruta}:`, respuesta.data);
    } catch (error) {
        console.error(`❌ Error al enviar a ${ruta}:`, error.message);
    }
}

// =============================================
// MINERÍA
// =============================================
function generarMonedas() {
    setInterval(() => {
        const ganancia = (Math.random() * 0.1).toFixed(4);
        saldoBanco = parseFloat(saldoBanco) + parseFloat(ganancia);

        console.log(`⛏️ Minado: +${ganancia} monedas | Saldo: ${saldoBanco}`);

        // 🟢 ENVIAR DIRECTO AL BANCO DE PYTHON
        enviarAlBanco('recibir-mineria', {
            usuario: "minero",
            cantidad: parseFloat(ganancia)
        });

    }, 3000);
}

// =============================================
// TRANSFERIR TODO EL SALDO INICIAL
// =============================================
async function transferirSaldoTotal() {
    if (saldoBanco > 0) {
        console.log(`📤 Transfiriendo saldo total: ${saldoBanco}`);
        await enviarAlBanco('transferencia-total', {
            usuario: "sistema",
            saldo_total: saldoBanco
        });
        saldoBanco = 0; // 💸 Se vacía este banco
    }
}

// =============================================
// RUTAS
// =============================================
app.get('/', (req, res) => {
    res.json({
        sistema: "Minería NodeJS",
        estado: "activo",
        saldo_actual: saldoBanco
    });
});

// =============================================
// INICIAR
// =============================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor Node corriendo en puerto ${PORT}`);
    transferirSaldoTotal();
    generarMonedas();
});
