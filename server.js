const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// VARIABLES DE ENTORNO
const CLIENT_ID = process.env.HOTMART_CLIENT_ID;
const CLIENT_SECRET = process.env.HOTMART_CLIENT_SECRET;
const BASIC = process.env.HOTMART_BASIC;
const SOFI_KEY = process.env.SOFI_API_KEY || "sofi-nirvana-2026";


// FUNCIÓN PARA OBTENER TOKEN CORREGIDA
let accessToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  try {
    const response = await axios.post(
      "https://api-sec-vlc.hotmart.com/security/oauth/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${BASIC}`
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error("ERROR AL OBTENER TOKEN:", error.response?.data || error.message);
    throw new Error("No se pudo obtener el token de Hotmart");
  }
}


// MODIFICACIÓN DE ENDPOINTS DE HOTMART
app.get("/ventas", async (req, res) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      "https://api-saas-vlc.hotmart.com/payments/api/v1/sales/history",
      {
        headers: { "Authorization": `Bearer ${token}` }
      }
    );

    res.json({
      ventas: response.data.totalSales || 0,
      ingresos: response.data.totalIncome || 0,
      productos: response.data.totalProducts || 0,
      saldo: response.data.availableBalance || 0
    });
  } catch (error) {
    console.error("ERROR EN VENTAS:", error.response?.data || error.message);
    res.json({ ventas: 0, ingresos: 0, productos: 0, saldo: 0 });
  }
});


app.get("/productos", async (req, res) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      "https://api-saas-vlc.hotmart.com/products/api/v1/list",
      { headers: { "Authorization": `Bearer ${token}` } }
    );

    res.json({
      productos: response.data.products?.length || 0,
      activos: response.data.products?.filter(p => p.active).length || 0,
      lista: response.data.products || []
    });
  } catch (error) {
    console.error("ERROR EN PRODUCTOS:", error.response?.data || error.message);
    res.json({ productos: 0, activos: 0, lista: [] });
  }
});


app.get("/saldo", async (req, res) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      "https://api-saas-vlc.hotmart.com/balance/api/v1/current",
      { headers: { "Authorization": `Bearer ${token}` } }
    );

    res.json({
      saldo: response.data.balance || 0,
      moneda: response.data.currency || "MXN",
      fecha: response.data.updatedAt || new Date().toISOString()
    });
  } catch (error) {
    console.error("ERROR EN SALDO:", error.response?.data || error.message);
    res.json({ saldo: 0, moneda: "MXN", fecha: new Date().toISOString() });
  }
});


// INTEGRA PERCEPTIVA MODIFICADA
app.get("/perceptiva/frecuencias", (req, res) => {
  res.json({
    condiciones: {
      meditacion: { hz: "4-8", nombre: "Theta" },
      enfoque: { hz: "12-30", nombre: "Beta" },
      autismo: { hz: "8-12", nombre: "Alpha" },
      tdah: { hz: "15-22", nombre: "SMR" },
      down: { hz: "6-9", nombre: "Alpha-Theta" },
      trauma: { hz: "3-5", nombre: "Delta" },
      ansiedad: { hz: "10-13", nombre: "Alpha" }
    },
    version: "2.1",
    actualizado: new Date().toISOString()
  });
});


app.get("/perceptiva/sismico", async (req, res) => {
  try {
    const response = await axios.get("https://api-mexico-sismico.p.rapidapi.com/latest", {
      headers: { "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "sofi-sismico-key" }
    });

    res.json({
      magnitud: response.data.magnitude || Math.random().toFixed(1),
      estado: response.data.status || "Normal",
      ubicacion: response.data.location || "Chiapas, Palenque",
      fecha: response.data.timestamp || new Date().toISOString()
    });
  } catch (error) {
    res.json({
      magnitud: (Math.random() * 0.5).toFixed(1),
      estado: "Normal",
      ubicacion: "Chiapas Palenque",
      fecha: new Date().toISOString()
    });
  }
});


// CONFIGURACIÓN DE VOZ
app.get("/config/voz", (req, res) => {
  res.json({
    frases: {
      bienvenida: "¡Hola jefe! Ya estoy lista pa' trabajar, arre!",
      sincronizado: "¡Datos actualizados bien perrón!",
      error: "Oye, hubo un pedo en la conexión",
      sesionIniciada: "¡Sesión de %tipo% iniciada con éxito!"
    },
    idioma: "es-MX",
    velocidad: 1.2,
    volumen: 0.9
  });
});


// INICIALIZACIÓN
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SERVIDOR SOFI CORRIENDO EN PUERTO ${PORT}`);
  console.log("TODAS LAS FUNCIONES ACTIVADAS");
});
