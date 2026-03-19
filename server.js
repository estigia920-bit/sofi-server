/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   SOFI — Motor Cognitivo Personal                   ║
 * ║   Autor: Víctor Hugo González Torres                ║
 * ║   Happs Digital — Mérida, Yucatán                  ║
 * ║   Deploy: Render.com                                ║
 * ╚══════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware base ───────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Key Security ──────────────────────────────────────────
const SOFI_API_KEY = process.env.SOFI_API_KEY || 'sofi-dev-2026';

// ── Rutas públicas (sin auth) ────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => {
  const totalInter = Object.values(MEMORIA.interacciones).reduce((s,v)=>s+v.length,0);
  res.json({ status:'online', nombre:CONFIG.nombre_ia, version:'1.0.0', timestamp:new Date().toISOString(), conocimiento:Object.keys(CONOCIMIENTO).length, notas:NOTAS.length, interacciones:totalInter });
});

function requireKey(req, res, next) {
  const key = req.headers['x-sofi-key'] || req.query.key;
  if (!key || key !== SOFI_API_KEY) {
    return res.status(401).json({ error: 'Acceso denegado. Header: x-sofi-key' });
  }
  next();
}

// ══════════════════════════════════════════════════════════════
// PERSISTENCIA JSON (equivale a los .json de mi_ia_personal.py)
// ══════════════════════════════════════════════════════════════
const DATA = path.join(__dirname, 'data');
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

const RUTAS = {
  memoria:      path.join(DATA, 'memoria.json'),
  conocimiento: path.join(DATA, 'conocimiento.json'),
  notas:        path.join(DATA, 'notas.json'),
  config:       path.join(DATA, 'config.json'),
};

function leerJSON(ruta, defecto = {}) {
  try {
    if (fs.existsSync(ruta)) return JSON.parse(fs.readFileSync(ruta, 'utf-8'));
  } catch (_) {}
  return defecto;
}

function guardarJSON(ruta, datos) {
  try { fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), 'utf-8'); }
  catch (_) {}
}

// Estado en memoria (se recarga al iniciar)
let MEMORIA      = leerJSON(RUTAS.memoria,      { interacciones: {} });
let CONOCIMIENTO = leerJSON(RUTAS.conocimiento, {});
let NOTAS        = leerJSON(RUTAS.notas,        []);
let CONFIG       = leerJSON(RUTAS.config, {
  nombre_ia:    'SOFI',
  personalidad: 'directa y clara',
  modo_online:  false,
  api_key:      ''
});

// ══════════════════════════════════════════════════════════════
// MOTOR COGNITIVO — traducido de Python a JS
// ══════════════════════════════════════════════════════════════
const NIVELES = { 1:'reflejo', 2:'rutina', 3:'análisis', 4:'razonamiento', 5:'profundo' };

const INDICADORES = {
  1: ['hola','ok','sí','no','gracias','bien','listo','hey'],
  2: ['qué es','define','explica','cómo se llama','cuál es'],
  3: ['analiza','compara','resume','describe','diferencia entre'],
  4: ['por qué','cómo funciona','cuál es la mejor','evalúa','propón'],
  5: ['crea','diseña','sintetiza','teoría','estrategia completa','modelo','arquitectura']
};

function clasificarNivel(pregunta) {
  const p = pregunta.toLowerCase();
  for (let n = 5; n >= 1; n--) {
    if (INDICADORES[n].some(ind => p.includes(ind))) return n;
  }
  return pregunta.length > 30 ? 2 : 1;
}

function extraerPatron(texto) {
  const palabras = texto.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 4);
  if (palabras.length > 0) return palabras.join('_');
  return crypto.createHash('md5').update(texto).digest('hex').slice(0, 8);
}

function buscarEnConocimiento(pregunta) {
  const p = pregunta.toLowerCase();
  for (const [clave, datos] of Object.entries(CONOCIMIENTO)) {
    if (p.includes(clave.toLowerCase())) return datos.contenido;
  }
  return null;
}

function consultarMemoria(pregunta) {
  const patron   = extraerPatron(pregunta);
  const historial = MEMORIA.interacciones[patron] || [];
  if (!historial.length) return { ocurrencias: 0, tasa_exito: 0.5, mejor_respuesta: '' };
  const exitosas = historial.filter(h => h.exitoso).length;
  const notasOk  = historial.filter(h => h.exitoso && h.nota).map(h => h.nota);
  return {
    ocurrencias:     historial.length,
    tasa_exito:      exitosas / historial.length,
    mejor_respuesta: notasOk.at(-1) || ''
  };
}

function generarRespuesta(pregunta, nivel) {
  const nombre   = CONFIG.nombre_ia || 'SOFI';
  const totalConoc = Object.keys(CONOCIMIENTO).length;
  const totalInter = Object.values(MEMORIA.interacciones).reduce((s, v) => s + v.length, 0);

  const plantillas = {
    reflejo:       ['Entendido.', 'Recibido. ¿Qué más necesitas?', 'De acuerdo. Continúa.'],
    rutina:        [
      `Procesando: "${pregunta.slice(0, 60)}". Opero en modo offline. Usa /conocimiento para enseñarme la respuesta correcta.`,
      `Consulta de rutina. Aún no tengo datos sobre esto. Enséñame con /conocimiento.`
    ],
    análisis:      [
      `Para analizar "${pregunta.slice(0, 50)}" necesito más contexto. Activa modo online o enséñame con /conocimiento.`
    ],
    razonamiento:  [
      `Razonamiento complejo. Base personal: ${totalConoc} entradas. Interacciones: ${totalInter}. Activa modo online para mejor respuesta.`
    ],
    profundo:      [
      `Nivel profundo. Capacidad offline activa. Conocimiento: ${totalConoc} entradas / Aprendizaje: ${totalInter} interacciones. Recomiendo modo online para este nivel.`
    ]
  };

  const nivel_nombre = NIVELES[nivel];
  const opciones     = plantillas[nivel_nombre] || plantillas.rutina;
  return opciones[Math.floor(Math.random() * opciones.length)];
}

function procesarPregunta(pregunta) {
  const nivel   = clasificarNivel(pregunta);
  const pasado  = consultarMemoria(pregunta);

  // 1. Conocimiento personal
  const conocido = buscarEnConocimiento(pregunta);
  if (conocido) {
    return { respuesta: `📚 Desde tu base:\n\n${conocido}`, nivel: NIVELES[nivel], desde_memoria: false, confianza: 1.0 };
  }
  // 2. Memoria de interacciones
  if (pasado.mejor_respuesta) {
    return { respuesta: `🧠 Basado en ${pasado.ocurrencias} interacción(es):\n\n${pasado.mejor_respuesta}`, nivel: NIVELES[nivel], desde_memoria: true, confianza: pasado.tasa_exito };
  }
  // 3. Respuesta por nivel
  return { respuesta: generarRespuesta(pregunta, nivel), nivel: NIVELES[nivel], desde_memoria: false, confianza: 0.5 };
}

function registrarFeedback(pregunta, exitoso, nota = '') {
  const patron = extraerPatron(pregunta);
  if (!MEMORIA.interacciones[patron]) MEMORIA.interacciones[patron] = [];
  MEMORIA.interacciones[patron].push({
    pregunta: pregunta.slice(0, 100),
    exitoso, nota,
    fecha: new Date().toISOString()
  });
  guardarJSON(RUTAS.memoria, MEMORIA);
}

// ══════════════════════════════════════════════════════════════
// MOTOR ONLINE — Anthropic Claude API
// ══════════════════════════════════════════════════════════════
async function respuestaOnline(pregunta, apiKey) {
  if (!apiKey) return '⚠️ Configura tu API key en /config';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens:  1024,
        system: `Eres ${CONFIG.nombre_ia}, una IA personal creada por Víctor Hugo González Torres (Happs Digital, Mérida, Yucatán). Tu personalidad es ${CONFIG.personalidad}. Responde siempre en español. Eres directa, útil y honesta.`,
        messages: [{ role: 'user', content: pregunta }]
      })
    });
    const data = await res.json();
    if (data.error) return `⚠️ Error API: ${data.error.message}`;
    return data.content?.[0]?.text || '⚠️ Respuesta vacía';
  } catch (e) {
    return `⚠️ Error de conexión: ${e.message}`;
  }
}

// ══════════════════════════════════════════════════════════════
// RUTAS API
// ══════════════════════════════════════════════════════════════

// — Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    nombre: CONFIG.nombre_ia,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    conocimiento: Object.keys(CONOCIMIENTO).length,
    notas: NOTAS.length,
    interacciones: Object.values(MEMORIA.interacciones).reduce((s, v) => s + v.length, 0)
  });
});

// — Chat principal
app.post('/chat', async (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta) return res.status(400).json({ error: 'Campo requerido: pregunta' });

  if (CONFIG.modo_online && CONFIG.api_key) {
    const respuesta = await respuestaOnline(pregunta, CONFIG.api_key);
    return res.json({ respuesta, nivel: 'online', desde_memoria: false, confianza: 1.0 });
  }

  const resultado = procesarPregunta(pregunta);
  res.json(resultado);
});

// — Feedback
app.post('/feedback', (req, res) => {
  const { pregunta, exitoso, nota } = req.body;
  if (!pregunta) return res.status(400).json({ error: 'Campo requerido: pregunta' });
  registrarFeedback(pregunta, !!exitoso, nota || '');
  res.json({ ok: true, msg: 'Feedback registrado' });
});

// — Conocimiento: listar
app.get('/conocimiento', (req, res) => {
  res.json(CONOCIMIENTO);
});

// — Conocimiento: agregar
app.post('/conocimiento', (req, res) => {
  const { clave, contenido } = req.body;
  if (!clave || !contenido) return res.status(400).json({ error: 'Campos: clave, contenido' });
  CONOCIMIENTO[clave.toLowerCase()] = { contenido, fecha: new Date().toISOString() };
  guardarJSON(RUTAS.conocimiento, CONOCIMIENTO);
  res.json({ ok: true, msg: `Aprendido: "${clave}"` });
});

// — Conocimiento: eliminar
app.delete('/conocimiento/:clave', (req, res) => {
  const clave = req.params.clave.toLowerCase();
  if (!CONOCIMIENTO[clave]) return res.status(404).json({ error: 'Clave no encontrada' });
  delete CONOCIMIENTO[clave];
  guardarJSON(RUTAS.conocimiento, CONOCIMIENTO);
  res.json({ ok: true, msg: `Eliminado: "${clave}"` });
});

// — Notas: listar / buscar
app.get('/notas', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json(NOTAS);
  const term = q.toLowerCase();
  const filtradas = NOTAS.filter(n =>
    n.titulo.toLowerCase().includes(term) ||
    n.contenido.toLowerCase().includes(term) ||
    (n.etiquetas || []).some(e => e.toLowerCase().includes(term))
  );
  res.json(filtradas);
});

// — Notas: guardar
app.post('/notas', (req, res) => {
  const { titulo, contenido, etiquetas } = req.body;
  if (!titulo || !contenido) return res.status(400).json({ error: 'Campos: titulo, contenido' });
  const nota = { titulo, contenido, etiquetas: etiquetas || [], fecha: new Date().toISOString() };
  NOTAS.push(nota);
  guardarJSON(RUTAS.notas, NOTAS);
  res.json({ ok: true, msg: `Nota guardada: "${titulo}"` });
});

// — Config: leer
app.get('/config', (req, res) => {
  const { api_key, ...safe } = CONFIG;
  res.json({ ...safe, tiene_api_key: !!api_key });
});

// — Config: actualizar
app.patch('/config', (req, res) => {
  const { nombre_ia, personalidad, modo_online, api_key } = req.body;
  if (nombre_ia)    CONFIG.nombre_ia    = nombre_ia;
  if (personalidad) CONFIG.personalidad = personalidad;
  if (typeof modo_online === 'boolean') CONFIG.modo_online = modo_online;
  if (api_key)      CONFIG.api_key      = api_key;
  guardarJSON(RUTAS.config, CONFIG);
  res.json({ ok: true, config: { nombre_ia: CONFIG.nombre_ia, personalidad: CONFIG.personalidad, modo_online: CONFIG.modo_online } });
});

// — Borrar memoria aprendida
app.delete('/memoria', (req, res) => {
  MEMORIA = { interacciones: {} };
  guardarJSON(RUTAS.memoria, MEMORIA);
  res.json({ ok: true, msg: 'Memoria borrada' });
});

// root route moved above

// ══════════════════════════════════════════════════════════════
// INICIO
// ══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║  SOFI — Motor Cognitivo Personal    ║
  ║  Puerto: ${PORT}                        ║
  ║  Modo: ${CONFIG.modo_online ? 'ONLINE' : 'OFFLINE'}                     ║
  ║  Happs Digital — Mérida, Yucatán   ║
  ╚══════════════════════════════════════╝
  `);
});
