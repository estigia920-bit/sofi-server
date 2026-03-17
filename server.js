const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

// CONFIG BASICA - NO CAMBIES NADA
app.use(cors());
app.use(express.json());

// VARIABLES DE ENTORNO - SOLO CAMBIA LOS VALORES SI QUIERES
const CONFIG = {
  HOTMART_URL: "https://api-sec-vlc.hotmart.com",
  PORT: process.env.PORT || 3000
};

// ENDPOINTS QUE YA TENIAS - TODO IGUAL
app.get("/ventas", async (req, res) => {
  try {
    const respuesta = await axios.get(`${CONFIG.HOTMART_URL}/sales`);
    res.json({ total: respuesta.data.total || 0, lista: respuesta.data.items || [] });
  } catch (e) {
    res.json({ total: 0, lista: [] });
  }
});

app.get("/productos", async (req, res) => {
  try {
    const respuesta = await axios.get(`${CONFIG.HOTMART_URL}/products`);
    res.json({ total: respuesta.data.total || 0, activos: respuesta.data.active || 0 });
  } catch (e) {
    res.json({ total: 0, activos: 0 });
  }
});

app.get("/perceptiva", (req, res) => {
  res.json({
    modos: ["Meditación", "Enfoque", "Autismo", "TDAH"],
    sesionActiva: false,
    progreso: 0
  });
});

app.get("/sismico", (req, res) => {
  res.json({
    magnitud: (Math.random() * 0.5).toFixed(1),
    estado: "Normal",
    ubicacion: "Chiapas Palenque"
  });
});

app.get("/voz", (req, res) => {
  res.json({
    frases: [
      "¡Hola jefe!",
      "Datos actualizados bien perrón",
      "Sesión iniciada arre"
    ],
    idioma: "es-MX",
    velocidad: 1.2
  });
});

// INICIO DEL SERVIDOR
app.listen(CONFIG.PORT, () => {
  console.log(`Servidor corriendo en puerto ${CONFIG.PORT}`);
});
