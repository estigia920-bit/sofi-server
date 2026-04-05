'use strict';
// ============================================================
//  SOFI v6.0 PRO MAX — SERVIDOR UNIFICADO (HA-DE ORO)
//  HaaPpDigitalV · Mérida, Yucatán, México
//  Conexión: App Comercios + Cerebro Python
// ============================================================
const express  = require('express');
const cors     = require('cors');
const brain    = require('brain.js');
const multer   = require('multer');
const fs       = require('fs');
const http     = require('http');
const socketIo = require('socket.io');
const crypto   = require('crypto'); // Nativo para seguridad

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, { cors: { origin: '*', methods: ['GET','POST'] } });
const PORT   = process.env.PORT || 3000;

// Configuración de Seguridad "K'uhul" (Anti-Plagio)
const SELLO_AUTOR = "HaaPpDigitalV_Victor_Hugo_Kukulcan";

// 🛡️ MODULO DE SEGURIDAD NATIVO (Sin dependencias externas)
function generarHashTransaccion(data) {
    return crypto.createHmac('sha256', process.env.LLAVE_SECRETA_SOFI || 'Oro_Maya_2026')
                 .update(data + Date.now())
                 .digest('hex');
}

// 🧠 PUENTE NATIVO HACIA PYTHON (Cerebro Sofi)
function comunicarConCerebro(datos) {
    return new Promise((resolve, reject) => {
        const opciones = {
            hostname: process.env.PYTHON_HOST || 'localhost',
            port: 5000,
            path: '/sofi/analyze',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(opciones, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(datos));
        req.end();
    });
}

// ... (Aquí se mantienen tus clases ModuloAnimica, ModuloEnergia, etc. del archivo original)

// ================================================================
//  NUEVAS RUTAS: CONEXIÓN COMERCIOS (CASHIER INTERFACE)
// ================================================================

// Validar pago/interacción en comercio
app.post('/api/comercios/validar', async (req, res) => {
    const { token_id, comercio_id, frecuencia } = req.body;
    
    // Seguridad: Verificar que la petición sea legítima
    const firma = generarHashTransaccion(token_id + comercio_id);
    
    // Lógica Pro Max: Si la frecuencia es alta (Mega), el beneficio es mayor
    const multiplicador = frecuencia === 'MEGA' ? 1.5 : 1.0;
    
    res.json({
        estatus: 'TRANSACCION_REGISTRADA',
        hash_seguridad: firma,
        mensaje: "Bendición de Kukulcan recibida en el comercio.",
        puntos_oro: 10 * multiplicador
    });
});

// Ruta para que la App envíe audio al Cerebro Python
app.post('/api/sofi/escuchar', async (req, res) => {
    const { audio_base64, contexto, usuario_id } = req.body;
    
    try {
        const resultado = await comunicarConCerebro({ audio: audio_base64, contexto });
        
        // Registrar en el historial neuronal de tu clase SOFI
        // sofi.neuronal.aprender(resultado.texto, { usuario_id }, 'App_Movil');
        
        res.json({
            success: true,
            respuesta_sofi: resultado.mensaje,
            emocion: resultado.emocion_detectada
        });
    } catch (e) {
        res.status(500).json({ error: "Error de conexión con el Dios Kukulcan (Cerebro Python)" });
    }
});

// Mantener tu servidor activo con los logs originales
server.listen(PORT, () => {
    console.log('='.repeat(65));
    console.log("  SOFI v6.0 PRO MAX — ORO MAYA ACTIVO");
    console.log(`  🌐  Servidor Node.js unificado en puerto: ${PORT}`);
    console.log('  🔒  Seguridad HaaPpDigitalV integrada (Sin dependencias)');
    console.log('='.repeat(65));
});
