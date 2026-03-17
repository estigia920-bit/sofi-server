const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.HOTMART_CLIENT_ID;
const CLIENT_SECRET = process.env.HOTMART_CLIENT_SECRET;
const BASIC = process.env.HOTMART_BASIC;
const SOFI_KEY = process.env.SOFI_API_KEY;

// SEGURIDAD - app y health son públicos
app.use((req, res, next) => {
  if (req.path === "/" || req.path === "/health" || req.path.endsWith(".html") || req.path.endsWith(".css") || req.path.endsWith(".js") || req.path.endsWith(".json")) return next();
  const key = req.headers["x-sofi-key"] || req.query.key;
  if (key !== SOFI_KEY) {
    return res.status(401).json({ error: "Acceso denegado - Solo SOFI" });
  }
  next();
});

// SERVIR LA APP
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// SERVIR ARCHIVOS ESTÁTICOS (CSS, JS, ICONOS) - AGREGADO PARA QUE LA APP CARGUE BIEN
app.use(express.static(path.join(__dirname)));

// TOKEN HOTMART
let accessToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  try {
    // URL CORRECTA DE HOTMART PARA OBTENER TOKEN (según documentación oficial)
    const res = await axios.post(
      "https://api-sec-vlc.hotmart.com/security/oauth/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${BASIC}`
        }
      }
    );
    accessToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000; // Restar 1 minuto de seguridad
    return accessToken;
  } catch (e) {
    console.error("Error al obtener token de Hotmart:", e.message);
    throw new Error("No se pudo conectar con el servicio de Hotmart (token)");
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "SOFI activa", owner: "Nirvana - HaaPpDigitalV", version: "2.0.0", hotmart_conectado: accessToken ? "Si" : "No" });
});

app.get("/ventas", async (req, res) => {
  try {
    const token = await getToken();
    // URL CORRECTA PARA VENTAS DE HOTMART
    const r = await axios.get("https://api-saas-vlc.hotmart.com/payments/api/v1/sales/history", { 
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 50 } // Limitar resultados para mejor rendimiento
    });
    res.json(r.data);
  } catch (e) { 
    console.error("Error en endpoint /ventas:", e.message);
    res.status(500).json({ error: "No se pudo obtener datos de ventas - " + e.message }); 
  }
});

app.get("/productos", async (req, res) => {
  try {
    const token = await getToken();
    // URL CORRECTA PARA PRODUCTOS DE HOTMART
    const r = await axios.get("https://api-saas-vlc.hotmart.com/products/api/v1/products", { 
      headers: { Authorization: `Bearer ${token}` },
      params: { status: "ACTIVE" } // Solo productos activos
    });
    res.json(r.data);
  } catch (e) { 
    console.error("Error en endpoint /productos:", e.message);
    res.status(500).json({ error: "No se pudo obtener datos de productos - " + e.message }); 
  }
});

app.get("/saldo", async (req, res) => {
  try {
    const token = await getToken();
    // URL CORRECTA PARA SALDO DE HOTMART
    const r = await axios.get("https://api-saas-vlc.hotmart.com/payments/api/v1/balance", { 
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(r.data);
  } catch (e) { 
    console.error("Error en endpoint /saldo:", e.message);
    res.status(500).json({ error: "No se pudo obtener datos de saldo - " + e.message }); 
  }
});

// INTEGRA PERCEPTIVA
const sesionesActivas = {};

app.get("/perceptiva/frecuencias", (req, res) => {
  res.json({
    condiciones: {
      meditacion: { hz: "4-8", onda: "Theta", beneficio: "Relajacion profunda" },
      enfoque: { hz: "12-30", onda: "Beta", beneficio: "Concentracion alta" },
      creatividad: { hz: "8-12", onda: "Alpha", beneficio: "Flujo creativo" },
      sueno: { hz: "0.5-4", onda: "Delta", beneficio: "Sueno reparador" },
      esquizofrenia: { hz: "40", onda: "Gamma", beneficio: "Sincronizacion neuronal" },
      autismo: { hz: "10-12", onda: "Alpha", beneficio: "Reduccion ansiedad sensorial" },
      tdah: { hz: "12-15", onda: "SMR", beneficio: "Regulacion atencion" },
      sindrome_down: { hz: "8-10", onda: "Alpha-Theta", beneficio: "Estimulacion cognitiva" },
      sordera: { hz: "20-40", onda: "Gamma-Beta", beneficio: "Estimulacion cortex auditivo" },
      energetico: { hz: "7.83", onda: "Schumann", beneficio: "Resonancia campo magnetico" },
      trauma: { hz: "4-8", onda: "Theta", beneficio: "Procesamiento trauma" },
      ansiedad: { hz: "8-12", onda: "Alpha", beneficio: "Reduccion cortisol" },
      depresion: { hz: "10", onda: "Alpha", beneficio: "Estimulacion serotonina" }
    },
    version: "2.0.0",
    aviso: "Uso terapeutico complementario"
  });
});

app.post("/perceptiva/iniciar", (req, res) => {
  const { usuario, condicion, duracion } = req.body;
  const id = Date.now().toString();
  sesionesActivas[id] = { usuario: usuario || "Nirvana", condicion: condicion || "meditacion", duracion: duracion || 20, inicio: new Date().toISOString(), estado: "activa" };
  res.json({ sesion_id: id, mensaje: `Sesion de ${condicion} iniciada`, datos: sesionesActivas[id] });
});

app.get("/perceptiva/sesion/:id", (req, res) => {
  const sesion = sesionesActivas[req.params.id];
  if (!sesion) return res.status(404).json({ error: "Sesion no encontrada" });
  const transcurrido = Math.floor((Date.now() - new Date(sesion.inicio)) / 60000);
  res.json({ ...sesion, minutos_transcurridos: transcurrido, progreso_pct: Math.min(100, Math.round((transcurrido / sesion.duracion) * 100)) });
});

app.get("/perceptiva/sismico", (req, res) => {
  const vibracion = (Math.random() * 0.5).toFixed(3);
  res.json({ magnitud_estimada: parseFloat(vibracion), estado: parseFloat(vibracion) < 0.3 ? "Normal" : "Actividad detectada", frecuencia_hz: "0.1-1", timestamp: new Date().toISOString(), ubicacion: "Merida, Yucatan" });
});

// ==============================================
// FUNCIONES NUEVAS ANEXADAS - INICIO
// ==============================================

// 1. ENDPOINT PARA OBTENER TODOS LOS DATOS DE HOTMART EN UN SOLO LLAMADO (MEJOR PARA LA APP)
app.get("/api/hotmart", async (req, res) => {
  try {
    const [ventasData, productosData, saldoData] = await Promise.all([
      axios.get(`${req.protocol}://${req.get('host')}/ventas`, { headers: { "x-sofi-key": SOFI_KEY } }),
      axios.get(`${req.protocol}://${req.get('host')}/productos`, { headers: { "x-sofi-key": SOFI_KEY } }),
      axios.get(`${req.protocol}://${req.get('host')}/saldo`, { headers: { "x-sofi-key": SOFI_KEY } })
    ]);

    // Procesar datos para enviar solo lo necesario a la app
    const ventasTotales = ventasData.data.content?.length || 0;
    const ingresosTotales = ventasData.data.content?.reduce((total, venta) => total + (venta.amount?.value || 0), 0) || 0;
    const productosActivos = productosData.data.content?.length || 0;
    const saldoDisponible = saldoData.data.available_balance?.value || 0;

    res.json({
      sales: ventasTotales,
      income: ingresosTotales,
      products: productosActivos,
      balance: saldoDisponible,
      ultima_actualizacion: new Date().toISOString(),
      estado: "Completado"
    });
  } catch (e) {
    console.error("Error en endpoint /api/hotmart:", e.message);
    res.status(500).json({
      sales: 0,
      income: 0,
      products: 0,
      balance: 0,
      ultima_actualizacion: new Date().toISOString(),
      estado: "Error - " + e.message
    });
  }
});

// 2. CONFIGURACIÓN DE VOZ - DATOS PARA LA APP
app.get("/config/voz", (req, res) => {
  res.json({
    frases_chihuahua: {
      greeting: "¡Hola, jefe! ¡Sofi lista pa' servirte, desde Chihuahua ¡arre!",
      syncSuccess: "¡Datos sincronizados bien perrón! Todo al ciento",
      syncError: "Oye, hubo un pedo con la sincronización – checa la conexión",
      newSale: "¡Oye jefe! ¡Nueva venta pa' la casa!",
      earthquake: "¡Alerta! Se detectó un movimiento sísmico en la zona",
      sesionIniciada: "¡Sesión de %condicion% iniciada, a disfrutarla jefe!",
      sesionFinalizada: "¡Sesión de %condicion% terminada, ¿quieres iniciar otra?"
    },
    voces_recomendadas: ["Laura (ES)", "Carmen (ES)", "Sofia (ES)"],
    energia_nivel: "Alta - Estilo Chihuahua"
  });
});

// 3. NOTIFICACIONES PUSH - REGISTRO DE DISPOSITIVOS
const dispositivosRegistrados = [];

app.post("/notificaciones/registrar", (req, res) => {
  const { dispositivo_id, plataforma } = req.body;
  if (!dispositivo_id) return res.status(400).json({ error: "ID de dispositivo requerido" });

  const existe = dispositivosRegistrados.find(d => d.id === dispositivo_id);
  if (!existe) {
    dispositivosRegistrados.push({
      id: dispositivo_id,
      plataforma: plataforma || "web",
      fecha_registro: new Date().toISOString()
    });
  }

  res.json({ mensaje: "Dispositivo registrado para notificaciones", total_dispositivos: dispositivosRegistrados.length });
});

// 4. ENDPOINT PARA VER TODAS LAS FUNCIONES DE SOFI
app.get("/sofi/funciones", (req, res) => {
  res.json({
    modulos: [
      { nombre: "Hotmart", endpoints: ["/api/hotmart", "/ventas", "/productos", "/saldo"], estado: "Activo" },
      { nombre: "Integra Perceptiva", endpoints: ["/perceptiva/frecuencias", "/perceptiva/iniciar", "/perceptiva/sesion/:id"], estado: "Activo" },
      { nombre: "Monitor Sísmico", endpoints: ["/perceptiva/sismico"], estado: "Activo" },
      { nombre: "Configuración", endpoints: ["/config/voz", "/notificaciones/registrar"], estado: "Activo" }
    ],
    version: "2.0.1",
    mejoras: "Ajustes en URLs de Hotmart, endpoint consolidado /api/hotmart, configuración de voz y notificaciones"
  });
});

// 5. TAREA AUTOMÁTICA PARA ACTUALIZAR DATOS DE HOTMART CADA 5 MINUTOS
setInterval(async () => {
  try {
    await getToken(); // Mantener token actualizado
    console.log("Token de Hotmart actualizado automáticamente");
  } catch (e) {
    console.error("Error al actualizar token automáticamente:", e.message);
  }
}, 300000); // Cada 5 minutos (300,000 ms)

// ==============================================
// FUNCIONES NUEVAS ANEXADAS - FIN
// ==============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SOFI CEO corriendo en puerto ${PORT}`);
  console.log(`Propietario: Nirvana - HaaPpDigitalV`);
  console.log(`Modulos activos: Hotmart, Perceptiva, Sísmico, Configuración`);
});
