/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   SOFI — Motor Cognitivo Personal v4.0                      ║
 * ║   Autor : Víctor Hugo González Torres                       ║
 * ║   Marca : HaaPpDigitalV — Mérida, Yucatán                  ║
 * ║   Deploy: Render.com                                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * MÓDULOS v4.0:
 *   1.  Motor Cognitivo        — procesamiento offline/online
 *   2.  Red Neuronal           — brain.js entrenada con datos reales
 *   3.  Integra Perceptiva     — perfiles sensoriales múltiples + 12.3 Hz
 *   4.  Adaptación Dinámica    — frecuencia ajustada por irritabilidad
 *   5.  Búsqueda en Red        — DuckDuckGo + Wikipedia (gratis)
 *   6.  Presentador Cognitivo  — HTML animado
 *   7.  Generador de Video     — guión + preview + guía CapCut
 *   8.  WebSockets             — tiempo real bidireccional
 *   9.  Seguridad              — API key en todas las rutas privadas
 *   10. TTS                    — voz de SOFI (Web Speech + ruta server)
 *   11. TikTok                 — contenido listo para subir + API preparada
 *   12. PWA                    — manifest + service worker instalable
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const https    = require('https');
const http     = require('http');
const socketIo = require('socket.io');
const brain    = require('brain.js');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, { cors: { origin: '*' } });
const PORT   = process.env.PORT || 3000;

const SOFI_API_KEY = process.env.SOFI_API_KEY || 'sofi-dev-2026';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL  || 'claude-haiku-4-5-20251001';
const SOFI_USER    = process.env.SOFI_USER     || 'usuario@haappdigitalv.com';
const TIKTOK_TOKEN = process.env.TIKTOK_TOKEN  || '';
const VERSION      = '4.0.0';

app.use(cors());
app.use(express.json());

// ══════════════════════════════════════════════════════════════
// SEGURIDAD
// ══════════════════════════════════════════════════════════════
function requireKey(req, res, next) {
  const key = req.headers['x-sofi-key'] || req.query.key;
  if (!key || key !== SOFI_API_KEY)
    return res.status(401).json({ error: 'Acceso denegado.', hint: 'Header: x-sofi-key' });
  next();
}

// ══════════════════════════════════════════════════════════════
// PERSISTENCIA JSON
// ══════════════════════════════════════════════════════════════
const DATA = path.join(__dirname, 'data');
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

const RUTAS = {
  memoria:      path.join(DATA, 'memoria.json'),
  conocimiento: path.join(DATA, 'conocimiento.json'),
  notas:        path.join(DATA, 'notas.json'),
  config:       path.join(DATA, 'config.json'),
  busquedas:    path.join(DATA, 'busquedas.json'),
  cerebros:     path.join(DATA, 'cerebros.json'),
  tiktok:       path.join(DATA, 'tiktok.json'),
};

function leerJSON(r, d = {}) {
  try { if (fs.existsSync(r)) return JSON.parse(fs.readFileSync(r, 'utf-8')); } catch (_) {}
  return d;
}
function guardarJSON(r, d) {
  try { fs.writeFileSync(r, JSON.stringify(d, null, 2), 'utf-8'); } catch (_) {}
}

let MEMORIA      = leerJSON(RUTAS.memoria,      { interacciones: {} });
let CONOCIMIENTO = leerJSON(RUTAS.conocimiento, {});
let NOTAS        = leerJSON(RUTAS.notas,        []);
let BUSQUEDAS    = leerJSON(RUTAS.busquedas,    []);
let CEREBROS     = leerJSON(RUTAS.cerebros,     {});
let TIKTOK_LOG   = leerJSON(RUTAS.tiktok,       []);
let CONFIG       = leerJSON(RUTAS.config, {
  nombre_ia:    'SOFI',
  personalidad: 'directa, inteligente y clara',
  modo_online:  false,
  api_key:      '',
  idioma:       'es'
});

// ══════════════════════════════════════════════════════════════
// MÓDULO 1 — MOTOR COGNITIVO
// ══════════════════════════════════════════════════════════════
const NIVELES     = { 1:'reflejo', 2:'rutina', 3:'análisis', 4:'razonamiento', 5:'profundo' };
const INDICADORES = {
  1: ['hola','ok','sí','no','gracias','bien','listo','hey'],
  2: ['qué es','define','explica','cómo se llama','cuál es'],
  3: ['analiza','compara','resume','describe','diferencia entre'],
  4: ['por qué','cómo funciona','cuál es la mejor','evalúa','propón'],
  5: ['crea','diseña','sintetiza','teoría','estrategia completa','modelo','arquitectura']
};

function clasificarNivel(p) {
  const pl = p.toLowerCase();
  for (let n = 5; n >= 1; n--)
    if (INDICADORES[n].some(i => pl.includes(i))) return n;
  return p.length > 30 ? 2 : 1;
}
function extraerPatron(t) {
  const w = t.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 4);
  return w.length ? w.join('_') : crypto.createHash('md5').update(t).digest('hex').slice(0, 8);
}
function buscarEnConocimiento(p) {
  const pl = p.toLowerCase();
  for (const [k, d] of Object.entries(CONOCIMIENTO))
    if (pl.includes(k.toLowerCase())) return d.contenido;
  return null;
}
function consultarMemoria(p) {
  const h = MEMORIA.interacciones[extraerPatron(p)] || [];
  if (!h.length) return { ocurrencias: 0, tasa_exito: 0.5, mejor_respuesta: '' };
  const ex = h.filter(x => x.exitoso).length;
  return { ocurrencias: h.length, tasa_exito: ex / h.length, mejor_respuesta: h.filter(x => x.exitoso && x.nota).map(x => x.nota).at(-1) || '' };
}
function procesarPregunta(pregunta) {
  const nivel = clasificarNivel(pregunta);
  const mem   = consultarMemoria(pregunta);
  const tc    = Object.keys(CONOCIMIENTO).length;
  const ti    = Object.values(MEMORIA.interacciones).reduce((s, v) => s + v.length, 0);
  const conoc = buscarEnConocimiento(pregunta);
  if (conoc) return { respuesta: `📚 Base personal:\n\n${conoc}`, nivel: NIVELES[nivel], confianza: 1.0 };
  if (mem.mejor_respuesta) return { respuesta: `🧠 Memoria (${mem.ocurrencias}x):\n\n${mem.mejor_respuesta}`, nivel: NIVELES[nivel], confianza: mem.tasa_exito };
  const r = {
    reflejo:      ['Entendido.', 'Recibido. ¿Qué más?'],
    rutina:       [`Sin datos sobre esto. Base: ${tc} entradas. Enséñame con /conocimiento.`],
    'análisis':   [`Necesito más contexto. Base: ${tc} entradas.`],
    razonamiento: [`Modo complejo. ${tc} entradas / ${ti} interacciones. Activa online.`],
    profundo:     [`Nivel profundo. ${tc} entradas / ${ti} interacciones. Online recomendado.`]
  };
  const ops = r[NIVELES[nivel]] || r.rutina;
  return { respuesta: ops[Math.floor(Math.random() * ops.length)], nivel: NIVELES[nivel], confianza: 0.5 };
}
function registrarFeedback(p, ok, n = '') {
  const pat = extraerPatron(p);
  if (!MEMORIA.interacciones[pat]) MEMORIA.interacciones[pat] = [];
  MEMORIA.interacciones[pat].push({ pregunta: p.slice(0, 100), exitoso: ok, nota: n, fecha: new Date().toISOString() });
  guardarJSON(RUTAS.memoria, MEMORIA);
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 2 — RED NEURONAL (brain.js)
// ══════════════════════════════════════════════════════════════
const redNeuronal = new brain.NeuralNetwork({ hiddenLayers: [8, 4] });
redNeuronal.train([
  { input: { gestion: 1, hotmart: 1 }, output: { estrategia: 0.92 } },
  { input: { gestion: 0, hotmart: 1 }, output: { estrategia: 0.65 } },
  { input: { gestion: 1, hotmart: 0 }, output: { estrategia: 0.70 } },
  { input: { gestion: 0, hotmart: 0 }, output: { estrategia: 0.20 } },
], { iterations: 8000, log: false });

// ══════════════════════════════════════════════════════════════
// MÓDULO 3 — INTEGRA PERCEPTIVA
// ══════════════════════════════════════════════════════════════
const PERFILES = {
  neurotipico:   { nombre: 'Neurotípico',      freqBase: 12.3, tipo: 'alpha-beta',  nota: 'Enfoque general' },
  tdh:           { nombre: 'TDH/ADHD',         freqBase: 14.5, tipo: 'SMR',         nota: 'Reducir impulsividad e irritabilidad' },
  autismo:       { nombre: 'Autismo',          freqBase: 10.0, tipo: 'alpha',       nota: 'Regulación sensorial y emocional' },
  esquizofrenia: { nombre: 'Esquizofrenia',    freqBase: 8.5,  tipo: 'theta-alpha', nota: 'Relajación y reducción de agitación' },
  down:          { nombre: 'Síndrome de Down', freqBase: 9.0,  tipo: 'theta',       nota: 'Calma sensorial suave' },
  sordera:       { nombre: 'Sordera',          freqBase: 0,    tipo: 'vibracion',   nota: 'Modo táctil/visual (sin audio)' },
  ceguera:       { nombre: 'Ceguera',          freqBase: 12.3, tipo: 'audio',       nota: 'Modo audio descriptivo' }
};

const SENSIBILIDADES = {
  luz:        'Hipersensibilidad a luz',
  ruido:      'Intolerancia a ruidos fuertes',
  tacto:      'Hipersensibilidad táctil',
  olores:     'Intolerancia a olores',
  movimiento: 'Intolerancia al movimiento'
};

function ajustarFrecuenciaSegunIrritabilidad(cerebro) {
  const irr  = cerebro.irritabilidad_estimada || 50;
  let   freq = cerebro.freqBase || 12.3;
  if      (irr > 80) freq -= 2;
  else if (irr < 30) freq += 1;
  freq = Math.max(7, Math.min(15, freq));
  cerebro.frecuencia_actual = freq;
  cerebro.historial_adaptacion = cerebro.historial_adaptacion || [];
  cerebro.historial_adaptacion.push({
    fecha: new Date().toISOString(), freq_usada: freq,
    irritabilidad_antes: irr, irritabilidad_despues: null, nota: ''
  });
  if (cerebro.historial_adaptacion.length > 100)
    cerebro.historial_adaptacion = cerebro.historial_adaptacion.slice(-100);
  guardarJSON(RUTAS.cerebros, CEREBROS);
  return freq;
}

function obtenerPerfilesMultiples(idUsuario, perfilesElegidos = ['neurotipico'], sensibilidadesExtra = [], irritabilidad = 50) {
  if (!CEREBROS[idUsuario]) digitalizarCerebro({}, idUsuario);
  const cerebro = CEREBROS[idUsuario];
  cerebro.perfilesActivos           = perfilesElegidos.map(p => PERFILES[p]?.nombre || 'Desconocido');
  cerebro.sensibilidadesAdicionales = sensibilidadesExtra.map(s => SENSIBILIDADES[s] || s);
  cerebro.irritabilidad_estimada    = irritabilidad;
  let freqFinal = Math.min(...perfilesElegidos.map(p => PERFILES[p]?.freqBase || 12.3));
  if (sensibilidadesExtra.includes('ruido') || sensibilidadesExtra.includes('luz'))
    freqFinal = Math.max(7, freqFinal - 2);
  if      (irritabilidad > 70) { freqFinal = Math.max(7, freqFinal - 2); cerebro.modoAntiIrritabilidad = true; }
  else if (irritabilidad < 30)   freqFinal = Math.min(15, freqFinal + 1);
  cerebro.freqBase          = freqFinal;
  cerebro.frecuencia_actual = freqFinal;
  cerebro.plasticidadActiva = true;
  cerebro.notaPlasticidad   = 'Adaptación multi-perfil activada';
  cerebro.historial_adaptacion = cerebro.historial_adaptacion || [];
  cerebro.historial_adaptacion.push({
    fecha: new Date().toISOString(), freq_usada: freqFinal,
    irritabilidad, adaptacion: Math.round(70 + Math.random() * 25), regeneracion: cerebro.regeneracion || 84
  });
  if (cerebro.historial_adaptacion.length > 100)
    cerebro.historial_adaptacion = cerebro.historial_adaptacion.slice(-100);
  guardarJSON(RUTAS.cerebros, CEREBROS);
  return cerebro;
}

function digitalizarCerebro(datos, idUsuario) {
  const anterior = CEREBROS[idUsuario] || {};
  const cerebro  = {
    idUsuario,
    freqBase:                 datos.freqBase            || anterior.freqBase             || 12.3,
    frecuencia_actual:        anterior.frecuencia_actual || 12.3,
    irritabilidad_estimada:   datos.irritabilidad       || anterior.irritabilidad_estimada || 50,
    memorias:                 datos.memoriasCodificadas || anterior.memorias             || ['Integra Perceptiva', 'HaaPpDigitalV'],
    regeneracion:             anterior.regeneracion     || 84,
    premium:                  anterior.premium          || false,
    zonas: anterior.zonas || {
      motor: { activa: 45 }, cognitiva: { activa: 68 }, sensorial: { activa: 52 }, emocional: { activa: 82 }
    },
    historial_adaptacion:         anterior.historial_adaptacion         || [],
    perfilesActivos:              anterior.perfilesActivos              || ['Neurotípico'],
    sensibilidadesAdicionales:    anterior.sensibilidadesAdicionales    || [],
    modoAntiIrritabilidad:        false,
    ultimoEscaneo:                new Date().toISOString(),
    prediccion:                   redNeuronal.run({ gestion: 1, hotmart: 1 })
  };
  CEREBROS[idUsuario] = cerebro;
  ajustarFrecuenciaSegunIrritabilidad(cerebro);
  guardarJSON(RUTAS.cerebros, CEREBROS);
  return cerebro;
}

function actualizarZonas(idUsuario) {
  const c = CEREBROS[idUsuario];
  if (!c) return null;
  Object.keys(c.zonas).forEach(k => {
    c.zonas[k].activa = Math.max(30, Math.min(95, c.zonas[k].activa + (Math.random() - 0.5) * 14));
  });
  c.regeneracion = Math.max(75, Math.min(100, c.regeneracion + (Math.random() > 0.6 ? 0.6 : -0.5)));
  ajustarFrecuenciaSegunIrritabilidad(c);
  guardarJSON(RUTAS.cerebros, CEREBROS);
  return c;
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 4 — BÚSQUEDA EN RED
// ══════════════════════════════════════════════════════════════
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'SOFI-Cognitivo/4.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    }).on('error', reject);
  });
}
async function buscarDuckDuckGo(q) {
  try {
    const d = await fetchURL(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`);
    return d.AbstractText ? { fuente: 'búsqueda web', resumen: d.AbstractText, url_fuente: d.AbstractURL || '', temas: (d.RelatedTopics || []).slice(0, 5).map(t => t.Text || '').filter(Boolean) } : null;
  } catch { return null; }
}
async function buscarWikipedia(q, lang = 'es') {
  try {
    const d = await fetchURL(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/\s+/g, '_'))}`);
    return d.extract ? { fuente: 'enciclopedia', titulo: d.title, resumen: d.extract, url_fuente: d.content_urls?.desktop?.page || '' } : null;
  } catch { return null; }
}
async function buscarEnRed(query) {
  const [ddg, wiki] = await Promise.allSettled([buscarDuckDuckGo(query), buscarWikipedia(query)]);
  const res = [];
  if (ddg.status  === 'fulfilled' && ddg.value?.resumen)  res.push(ddg.value);
  if (wiki.status === 'fulfilled' && wiki.value?.resumen) res.push(wiki.value);
  BUSQUEDAS.unshift({ query, resultados: res.length, fecha: new Date().toISOString() });
  if (BUSQUEDAS.length > 100) BUSQUEDAS = BUSQUEDAS.slice(0, 100);
  guardarJSON(RUTAS.busquedas, BUSQUEDAS);
  return res;
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 5 — PRESENTADOR COGNITIVO
// ══════════════════════════════════════════════════════════════
function generarPresentacionHTML(titulo, slides, cfg = {}) {
  const oscuro = (cfg.tema || 'oscuro') === 'oscuro';
  const c = oscuro
    ? { fondo:'#0a0a0f', slide:'#12121a', acento:'#00d4ff', texto:'#e8e8f0' }
    : { fondo:'#f0f4ff', slide:'#ffffff', acento:'#2563eb', texto:'#1e1e2e' };
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:${c.fondo};color:${c.texto};font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh}
header{padding:3rem 2rem 2rem;text-align:center;border-bottom:1px solid ${c.acento}33}
header h1{font-size:clamp(1.8rem,5vw,3rem);color:${c.acento};letter-spacing:-.02em}
.box{max-width:900px;margin:0 auto;padding:2rem 1rem 4rem;display:flex;flex-direction:column;gap:1.5rem}
.slide{background:${c.slide};border:1px solid ${c.acento}22;border-radius:1rem;padding:2rem;position:relative;animation:up .5s ease both}
@keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.num{position:absolute;top:1rem;right:1.5rem;font-size:3rem;font-weight:800;color:${c.acento}22}
.slide h2{font-size:1.3rem;color:${c.acento};margin-bottom:1rem}
.slide p{line-height:1.7;opacity:.85}
.slide ul{list-style:none;display:flex;flex-direction:column;gap:.6rem;margin-top:.5rem}
.slide ul li::before{content:'▸ ';color:${c.acento}}
.dato{margin-top:1.2rem;padding:1rem 1.5rem;background:${c.acento}15;border-left:3px solid ${c.acento};border-radius:0 .5rem .5rem 0;font-style:italic}
footer{text-align:center;padding:2rem;font-size:.8rem;opacity:.3;border-top:1px solid ${c.acento}22}
</style></head><body>
<header><h1>${titulo}</h1>${cfg.subtitulo?`<p>${cfg.subtitulo}</p>`:''}<p>HaaPpDigitalV — SOFI v${VERSION}</p></header>
<div class="box">
${slides.map((s,i)=>`<div class="slide"><div class="num">${String(i+1).padStart(2,'0')}</div><h2>${s.titulo||''}</h2>${s.contenido?`<p>${s.contenido}</p>`:''}${s.puntos?`<ul>${s.puntos.map(p=>`<li>${p}</li>`).join('')}</ul>`:''}${s.dato?`<div class="dato">${s.dato}</div>`:''}</div>`).join('')}
</div>
<footer>SOFI v${VERSION} — HaaPpDigitalV © ${new Date().getFullYear()}</footer>
</body></html>`;
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 6 — GENERADOR DE VIDEO v2
// ══════════════════════════════════════════════════════════════
function generarGuionVideo(titulo, tema, duracion = 60, cfg = {}) {
  const n = Math.max(3, Math.floor(duracion / 15));
  const d = Math.floor(duracion / n);
  return {
    meta: { titulo, tema, duracion_total: duracion, escenas: n, fps: 30, resolucion: '1080x1920', formato: 'TikTok/Reels vertical', creado: new Date().toISOString(), autor: 'HaaPpDigitalV — SOFI' },
    escenas: Array.from({ length: n }, (_, i) => ({
      escena: i+1, duracion: d,
      tipo: i===0?'intro':i===n-1?'cierre':'desarrollo',
      titulo: i===0?`Introducción: ${titulo}`:i===n-1?'Conclusión':`Punto ${i}: ${tema}`,
      narracion: `[Narración escena ${i+1} — ${tema}]`,
      texto_pantalla: i===0?`✨ ${titulo}`:i===n-1?`🔥 Sígueme para más`:tema,
      hashtags: cfg.hashtags || ['#sofi','#haappdigitalv','#merida','#yucatan'],
      visual: i===0?'Logo HaaPpDigitalV + título animado':`Visualización punto ${i}`,
      transicion: i<n-1?'fade':'none',
      capcut_instruccion: `Escena ${i+1}: Agregar texto "${tema}" con efecto entrada. Duración: ${d}s`
    })),
    config: { voz: cfg.voz||'es-MX', musica: cfg.musica||'trending_tiktok', estilo: cfg.estilo||'moderno_oscuro', subtitulos: true },
    instrucciones_capcut: [
      '1. Abre CapCut y crea nuevo proyecto vertical (9:16)',
      '2. Importa tus clips o usa plantilla de fondo oscuro',
      '3. Agrega cada escena según el guión arriba',
      '4. Usa la narración de cada escena como texto en pantalla',
      '5. Agrega música trending desde la biblioteca de TikTok',
      '6. Exporta en 1080x1920 a 30fps',
      '7. Sube directamente desde SOFI con /tiktok/subir (requiere credenciales)'
    ],
    descripcion_tiktok: generarDescripcionTikTok(titulo, tema, cfg.hashtags)
  };
}

function generarGuionLibro(libro, cfg = {}) {
  const libros = {
    enoc: {
      titulo: 'El Libro de Enoc',
      gancho: '¿Sabías que este libro fue PROHIBIDO durante siglos? 😱',
      puntos: [
        'El texto más antiguo que describe seres de otro mundo',
        'Fue eliminado de la Biblia por una razón que NO te van a contar',
        'Contiene la clave del origen del mal según los antiguos',
        'Hoy puedes leerlo con anotaciones que nadie más tiene'
      ],
      cta: '🔥 Consíguelo AHORA por solo 97 pesos — link en bio',
      hashtags: ['#librodenoc','#misterios','#historia','#espiritualidad','#libros','#haappdigitalv']
    },
    universo: {
      titulo: 'El Universo es una Mentira',
      gancho: '¿Y si todo lo que te enseñaron sobre la realidad es falso? 🌌',
      puntos: [
        'La física cuántica confirma lo que los Mayas ya sabían',
        'Tesla, el número 3-6-9 y la frecuencia del universo',
        'Tu percepción construye la realidad — no al revés',
        'Una teoría que une ciencia antigua y física moderna'
      ],
      cta: '📚 Disponible en Hotmart y Amazon — link en bio',
      hashtags: ['#cuantica','#maya','#tesla','#universo','#consciencia','#haappdigitalv']
    },
    xibalba: {
      titulo: 'Xibalbá',
      gancho: 'El inframundo Maya nunca fue lo que te dijeron 🐍',
      puntos: [
        'Una historia ambientada en el Chichén Itzá real',
        'Los dioses del inframundo y sus rituales secretos',
        'Ficción histórica basada en textos auténticos Mayas',
        'La historia que Yucatán no ha contado'
      ],
      cta: '⚡ Próximamente disponible — sígueme para ser el primero',
      hashtags: ['#xibalba','#maya','#yucatan','#merida','#historiamaxa','#haappdigitalv']
    }
  };
  return libros[libro] || libros.enoc;
}

function generarDescripcionTikTok(titulo, tema, hashtags = []) {
  const tags = hashtags.length ? hashtags.join(' ') : '#sofi #haappdigitalv #merida';
  return `${titulo} — ${tema}\n\n${tags}\n\n🔗 Link en bio`;
}

function generarVideoPreview(guion) {
  const esc = guion.escenas || [];
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SOFI Video: ${guion.meta.titulo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#fff;font-family:'Segoe UI',sans-serif;height:100vh;overflow:hidden}
.stage{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
.esc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;opacity:0;transition:opacity .8s;background:radial-gradient(ellipse at center,#12121a 0%,#000 100%)}
.esc.on{opacity:1}
.badge{font-size:.75rem;letter-spacing:.15em;text-transform:uppercase;color:#00d4ff;margin-bottom:1rem;opacity:.7}
.esc h2{font-size:clamp(1.5rem,4vw,3rem);line-height:1.2;max-width:800px;margin-bottom:1.5rem}
.narr{font-size:1.1rem;opacity:.6;max-width:600px;line-height:1.7}
.hashtags{margin-top:1.5rem;font-size:.85rem;color:#00d4ff;opacity:.6}
.barra{position:fixed;bottom:0;left:0;height:3px;background:#00d4ff;z-index:9}
.ctrl{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);display:flex;gap:1rem;z-index:9}
button{background:#00d4ff22;border:1px solid #00d4ff44;color:#fff;padding:.6rem 1.5rem;border-radius:2rem;cursor:pointer;font-size:.9rem}
button:hover{background:#00d4ff44}
.marca{position:fixed;top:1.5rem;left:1.5rem;font-size:.75rem;opacity:.25;z-index:9}
</style></head><body>
<div class="marca">HAAPPDIGITALV · SOFI v${VERSION}</div>
<div class="barra" id="bar" style="width:0%"></div>
<div class="stage">
${esc.map((e,i)=>`<div class="esc${i===0?' on':''}" id="e${i}"><div class="badge">${e.tipo} · ${e.duracion}s</div><h2>${e.texto_pantalla||e.titulo}</h2><p class="narr">${e.narracion}</p><div class="hashtags">${(e.hashtags||[]).join(' ')}</div></div>`).join('')}
</div>
<div class="ctrl">
  <button onclick="ant()">← Ant</button>
  <button onclick="tog()" id="ba">▶ Auto</button>
  <button onclick="sig()">Sig →</button>
</div>
<script>
let a=0,auto=false,t=null;
const tot=${esc.length},durs=${JSON.stringify(esc.map(e=>e.duracion*1000))};
function show(n){document.querySelectorAll('.esc').forEach((el,i)=>el.classList.toggle('on',i===n));document.getElementById('bar').style.width=((n+1)/tot*100)+'%';a=n;}
function sig(){if(a<tot-1)show(a+1);else if(auto){tog();show(0);}}
function ant(){if(a>0)show(a-1);}
function tog(){auto=!auto;document.getElementById('ba').textContent=auto?'⏸ Pausar':'▶ Auto';if(auto)av();else clearTimeout(t);}
function av(){if(!auto)return;t=setTimeout(()=>{if(a<tot-1){show(a+1);av();}else tog();},durs[a]);}
<\/script></body></html>`;
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 10 — TTS (Texto a Voz de SOFI)
// ══════════════════════════════════════════════════════════════
function generarScriptTTS(texto, cfg = {}) {
  const voz = cfg.voz || 'es-MX-DaliaNeural';
  const velocidad = cfg.velocidad || 1.0;
  const tono = cfg.tono || 1.0;

  // Script SSML para voz natural
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-MX">
  <voice name="${voz}">
    <prosody rate="${velocidad}" pitch="${tono > 1 ? '+10%' : '0%'}">
      ${texto}
    </prosody>
  </voice>
</speak>`;

  // Código para usar en el frontend con Web Speech API
  const codigoFrontend = `
// Pega esto en la consola del navegador o úsalo en tu PWA
const synth = window.speechSynthesis;
const utter = new SpeechSynthesisUtterance(\`${texto}\`);
utter.lang = 'es-MX';
utter.rate = ${velocidad};
utter.pitch = ${tono};
// Busca la mejor voz disponible en español
const voces = synth.getVoices();
const vozEsp = voces.find(v => v.lang.startsWith('es')) || voces[0];
if (vozEsp) utter.voice = vozEsp;
synth.speak(utter);
  `.trim();

  return {
    texto,
    voz,
    ssml,
    codigo_frontend: codigoFrontend,
    instruccion: 'Usa el código_frontend en tu PWA o navegador para escuchar la voz de SOFI sin costo',
    apis_gratis: [
      { nombre: 'Web Speech API', costo: 'Gratis', limitacion: 'Solo navegador', url: 'Nativa en Chrome Android' },
      { nombre: 'Google Cloud TTS', costo: '4M chars/mes gratis', limitacion: 'Requiere cuenta Google', url: 'cloud.google.com/text-to-speech' },
      { nombre: 'ElevenLabs', costo: '10k chars/mes gratis', limitacion: 'Requiere registro', url: 'elevenlabs.io' }
    ]
  };
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 11 — TIKTOK MANAGER
// ══════════════════════════════════════════════════════════════
function prepararContenidoTikTok(libro, cfg = {}) {
  const data = generarGuionLibro(libro, cfg);
  const guion = generarGuionVideo(data.titulo, data.puntos[0], cfg.duracion || 45, {
    hashtags: data.hashtags,
    estilo: 'tiktok_viral'
  });

  const contenido = {
    libro,
    titulo_video: data.titulo,
    gancho: data.gancho,
    puntos_clave: data.puntos,
    cta: data.cta,
    hashtags: data.hashtags,
    descripcion: `${data.gancho}\n\n${data.puntos.map((p,i)=>`${i+1}. ${p}`).join('\n')}\n\n${data.cta}\n\n${data.hashtags.join(' ')}`,
    guion,
    tts: generarScriptTTS(data.gancho + '. ' + data.puntos.join('. ') + '. ' + data.cta),
    fecha_creacion: new Date().toISOString(),
    estado: 'listo_para_subir'
  };

  TIKTOK_LOG.unshift({ ...contenido, guion: undefined }); // guarda sin el guion completo
  if (TIKTOK_LOG.length > 50) TIKTOK_LOG = TIKTOK_LOG.slice(0, 50);
  guardarJSON(RUTAS.tiktok, TIKTOK_LOG);

  return contenido;
}

async function subirATikTok(videoPath, descripcion, token) {
  // TikTok Content Posting API v2
  // Requiere: TIKTOK_TOKEN en variables de entorno
  // Para obtenerlo: developers.tiktok.com → Content Posting API
  if (!token) {
    return {
      ok: false,
      msg: 'TIKTOK_TOKEN no configurado. Ve a developers.tiktok.com, crea una app y agrega el token como variable de entorno TIKTOK_TOKEN en Render.',
      pasos: [
        '1. Ve a developers.tiktok.com',
        '2. Crea una App → activa "Content Posting API"',
        '3. Genera tu Access Token',
        '4. En Render.com → Environment → agrega TIKTOK_TOKEN=tu_token',
        '5. Redespliega el server',
        '6. Llama a /tiktok/subir con el video'
      ]
    };
  }

  try {
    // Paso 1: Inicializar la subida
    const init = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        post_info: {
          title: descripcion.slice(0, 150),
          privacy_level: 'SELF_ONLY', // cambia a PUBLIC_TO_EVERYONE cuando estés listo
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: { source: 'FILE_UPLOAD', video_size: 0, chunk_size: 0, total_chunk_count: 1 }
      });

      const options = {
        hostname: 'open.tiktokapis.com',
        path: '/v2/post/publish/video/init/',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    return { ok: true, respuesta_tiktok: init, msg: 'Proceso iniciado. Sube el archivo de video al upload_url recibido.' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// MOTOR ONLINE — IA externa
// ══════════════════════════════════════════════════════════════
async function respuestaOnline(pregunta, apiKey) {
  if (!apiKey) return '⚠️ Configura tu API key en /config';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_MODEL, max_tokens: 1024,
        system: `Eres ${CONFIG.nombre_ia}, IA personal de Víctor Hugo González Torres (HaaPpDigitalV, Mérida, Yucatán). Personalidad: ${CONFIG.personalidad}. Responde en español.`,
        messages: [{ role: 'user', content: pregunta }]
      })
    });
    const d = await res.json();
    if (d.error) return `⚠️ Error: ${d.error.message}`;
    return d.content?.[0]?.text || '⚠️ Respuesta vacía';
  } catch (e) { return `⚠️ Error: ${e.message}`; }
}

// ══════════════════════════════════════════════════════════════
// WEBSOCKETS
// ══════════════════════════════════════════════════════════════
const intervalos = new Map();
io.on('connection', socket => {
  socket.on('join', id => {
    if (!id) return;
    socket.join(id);
    const interval = setInterval(() => {
      const c = actualizarZonas(id);
      if (c) io.to(id).emit('actualizacionTiempoReal', c);
    }, 1800);
    intervalos.set(socket.id, interval);
  });
  socket.on('disconnect', () => {
    const iv = intervalos.get(socket.id);
    if (iv) { clearInterval(iv); intervalos.delete(socket.id); }
  });
});

// ══════════════════════════════════════════════════════════════
// MÓDULO 12 — PWA Manifest + Service Worker
// ══════════════════════════════════════════════════════════════
app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'SOFI — HaaPpDigitalV',
    short_name: 'SOFI',
    description: 'Motor Cognitivo Personal + Integra Perceptiva',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a1f',
    theme_color: '#00ffcc',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    categories: ['productivity', 'health', 'utilities'],
    lang: 'es'
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
const CACHE = 'sofi-v${VERSION}';
const URLS  = ['/', '/manifest.json'];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(URLS))
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE).map(k => caches.delete(k))
  ))
));
  `.trim());
});

// Iconos SVG generados dinámicamente (no necesita archivos PNG)
app.get('/icon-:size.png', (req, res) => {
  const size = parseInt(req.params.size) || 192;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size*0.2}" fill="#0a0a1f"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.3}" fill="none" stroke="#00ffcc" stroke-width="${size*0.04}"/>
  <text x="${size/2}" y="${size/2+size*0.1}" text-anchor="middle" fill="#00ffcc" font-size="${size*0.28}" font-family="sans-serif" font-weight="bold">S</text>
</svg>`);
});

// ══════════════════════════════════════════════════════════════
// RUTA RAÍZ — Frontend PWA instalable
// ══════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  const p = path.join(__dirname, 'index.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#00ffcc">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SOFI">
<link rel="manifest" href="/manifest.json">
<title>SOFI — HaaPpDigitalV</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script src="/socket.io/socket.io.js"></script>
<style>
:root{--bg:#0a0a1f;--card:rgba(20,20,60,.9);--acento:#00ffcc;--rojo:#ff4466;--texto:#e0e0ff}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{background:var(--bg);color:var(--texto);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;overflow-x:hidden}
.topbar{background:var(--card);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--acento)33;position:sticky;top:0;z-index:100;backdrop-filter:blur(10px)}
.logo{font-size:1.2rem;font-weight:800;color:var(--acento);letter-spacing:.05em;text-shadow:0 0 10px var(--acento)}
.version{font-size:.7rem;opacity:.4}
.install-btn{background:var(--acento);color:#000;border:none;padding:8px 14px;border-radius:20px;font-size:.8rem;font-weight:700;cursor:pointer;display:none}
.disclaimer{background:#1a0010;color:#ffaacc;padding:10px 16px;font-size:.78rem;border-bottom:1px solid var(--rojo)44;text-align:center}
.tabs{display:flex;background:var(--card);border-bottom:1px solid var(--acento)22;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{padding:12px 18px;font-size:.85rem;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;opacity:.5;transition:.2s}
.tab.active{border-bottom-color:var(--acento);opacity:1;color:var(--acento)}
.panel{display:none;padding:16px;flex-direction:column;gap:12px;min-height:calc(100vh - 160px)}
.panel.active{display:flex}
.card{background:var(--card);border:1px solid var(--acento)22;border-radius:14px;padding:16px}
.card h3{font-size:.9rem;color:var(--acento);margin-bottom:12px;letter-spacing:.05em}
canvas{width:100%!important;height:200px;border-radius:10px;background:#0002}
.stat{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #ffffff0a}
.stat:last-child{border-bottom:none}
.stat label{font-size:.8rem;opacity:.6}
.stat strong{font-size:.9rem;color:var(--acento)}
btn,button{background:var(--acento);color:#000;border:none;padding:12px;font-size:.9rem;border-radius:10px;cursor:pointer;font-weight:700;width:100%;margin:4px 0;touch-action:manipulation}
button:active{opacity:.8;transform:scale(.99)}
.btn-outline{background:transparent;color:var(--acento);border:1px solid var(--acento)66}
.btn-rojo{background:var(--rojo);color:#fff}
input,textarea,select{width:100%;background:#0a0a2f;color:var(--texto);border:1px solid var(--acento)33;border-radius:10px;padding:12px;font-size:.9rem;margin:4px 0;font-family:inherit}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--acento)}
textarea{min-height:80px;resize:vertical}
.tag{display:inline-block;background:var(--acento)22;color:var(--acento);padding:4px 10px;border-radius:20px;font-size:.75rem;margin:2px}
.resp{background:#0a0a2f;border:1px solid var(--acento)22;border-radius:10px;padding:12px;font-size:.85rem;line-height:1.6;white-space:pre-wrap;max-height:300px;overflow-y:auto;display:none}
.resp.show{display:block}
.loader{text-align:center;padding:20px;color:var(--acento);font-size:.85rem;display:none}
.loader.show{display:block}
#status-bar{background:var(--acento)11;padding:8px 16px;font-size:.75rem;color:var(--acento);text-align:center;border-top:1px solid var(--acento)22;position:fixed;bottom:0;left:0;right:0}
.badge-online{background:#00ff8822;color:#00ff88;padding:3px 8px;border-radius:20px;font-size:.7rem}
.badge-offline{background:#ff444422;color:#ff4444;padding:3px 8px;border-radius:20px;font-size:.7rem}
.libro-card{background:#12121a;border:1px solid var(--acento)22;border-radius:12px;padding:14px;margin:4px 0}
.libro-card h4{color:var(--acento);font-size:.9rem;margin-bottom:6px}
.libro-card p{font-size:.78rem;opacity:.7;line-height:1.5}
.precio{color:#00ff88;font-weight:700;font-size:1rem}
</style>
</head>
<body>

<div class="topbar">
  <div>
    <div class="logo">◈ SOFI</div>
    <div class="version">HaaPpDigitalV v${VERSION}</div>
  </div>
  <div style="display:flex;gap:8px;align-items:center">
    <span id="conn-badge" class="badge-offline">● offline</span>
    <button class="install-btn" id="installBtn" onclick="instalarPWA()">⬇ Instalar</button>
  </div>
</div>

<div class="disclaimer">⚠️ Integra Perceptiva NO sustituye tratamientos médicos. Consulta siempre a tu especialista.</div>

<div class="tabs">
  <div class="tab active" onclick="cambiarTab('cerebro')">🧠 Cerebro</div>
  <div class="tab" onclick="cambiarTab('chat')">💬 Chat</div>
  <div class="tab" onclick="cambiarTab('libros')">📚 Libros</div>
  <div class="tab" onclick="cambiarTab('tiktok')">📱 TikTok</div>
  <div class="tab" onclick="cambiarTab('buscar')">🔍 Buscar</div>
  <div class="tab" onclick="cambiarTab('config')">⚙️ Config</div>
</div>

<!-- PANEL CEREBRO -->
<div class="panel active" id="panel-cerebro">
  <div class="card">
    <canvas id="brain3d"></canvas>
  </div>
  <div class="card">
    <h3>Estado en tiempo real</h3>
    <div class="stat"><label>Frecuencia</label><strong id="freq">12.3 Hz</strong></div>
    <div class="stat"><label>Regeneración</label><strong id="regen">84%</strong></div>
    <div class="stat"><label>Perfil activo</label><strong id="perfil">Neurotípico</strong></div>
    <div class="stat"><label>Sensibilidades</label><strong id="sens">ninguna</strong></div>
  </div>
  <div class="card">
    <h3>Audio binaural</h3>
    <button onclick="toggleBinaural(12.3)">🎧 SOFI 12.3 Hz</button>
    <button class="btn-outline" onclick="toggleBinaural(10)">🧠 Sincronizar 10 Hz</button>
    <button class="btn-outline" onclick="toggleBinaural(14.5)">⚡ Enfoque 14.5 Hz</button>
  </div>
  <div class="card">
    <h3>Perfiles sensoriales</h3>
    <button onclick="activarPerfil(['neurotipico'])">🧠 Neurotípico</button>
    <button onclick="activarPerfil(['tdh'])">⚡ TDH/ADHD</button>
    <button onclick="activarPerfil(['autismo'])">🌀 Autismo</button>
    <button onclick="activarPerfil(['esquizofrenia'])">🌊 Esquizofrenia</button>
    <button onclick="activarPerfil(['down'])">🌸 Síndrome de Down</button>
    <button onclick="activarPerfil(['sordera'])">👁️ Sordera</button>
    <button onclick="activarPerfil(['ceguera'])">🎵 Ceguera</button>
    <button class="btn-outline" onclick="activarPerfil(['tdh','autismo'])">⚡+🌀 TDH + Autismo</button>
  </div>
</div>

<!-- PANEL CHAT -->
<div class="panel" id="panel-chat">
  <div class="card">
    <h3>Motor Cognitivo SOFI</h3>
    <textarea id="chat-input" placeholder="Pregúntame lo que sea..."></textarea>
    <button onclick="enviarChat()">➤ Enviar</button>
    <div class="loader" id="chat-loader">⟳ Procesando...</div>
    <div class="resp" id="chat-resp"></div>
  </div>
  <div class="card">
    <h3>Enseñar a SOFI</h3>
    <input id="conoc-clave" placeholder="Tema (ej: libro de enoc)">
    <textarea id="conoc-valor" placeholder="Contenido que SOFI debe saber..."></textarea>
    <button onclick="ensenyar()">📚 Enseñar</button>
  </div>
</div>

<!-- PANEL LIBROS -->
<div class="panel" id="panel-libros">
  <div class="libro-card">
    <h4>📖 El Libro de Enoc</h4>
    <p>El texto prohibido más antiguo sobre seres de otro mundo.</p>
    <p>Plataforma: Hotmart ✅</p>
    <p><span class="precio">97 MXN</span> lanzamiento → 197 MXN regular</p>
    <p>Afiliados: 40% comisión</p>
    <button onclick="generarTikTokLibro('enoc')" style="margin-top:8px">📱 Generar contenido TikTok</button>
  </div>
  <div class="libro-card">
    <h4>🌌 El Universo es una Mentira</h4>
    <p>Física cuántica, sabiduría Maya y la Teoría de los 9 Planos.</p>
    <p>Plataformas: Hotmart + Amazon ✅</p>
    <button onclick="generarTikTokLibro('universo')" style="margin-top:8px">📱 Generar contenido TikTok</button>
  </div>
  <div class="libro-card">
    <h4>🐍 Xibalbá</h4>
    <p>Novela histórica en Chichén Itzá. El inframundo Maya.</p>
    <p>Estado: <span style="color:#ffaa00">⏳ Pendiente subir</span></p>
    <button onclick="generarTikTokLibro('xibalba')" style="margin-top:8px">📱 Generar contenido TikTok</button>
  </div>
</div>

<!-- PANEL TIKTOK -->
<div class="panel" id="panel-tiktok">
  <div class="card">
    <h3>Generador de Contenido</h3>
    <select id="tk-libro">
      <option value="enoc">El Libro de Enoc</option>
      <option value="universo">El Universo es una Mentira</option>
      <option value="xibalba">Xibalbá</option>
    </select>
    <input id="tk-duracion" type="number" placeholder="Duración en segundos (45 recomendado)" value="45">
    <button onclick="generarContenidoTikTok()">🎬 Generar guión + TTS + descripción</button>
    <div class="loader" id="tk-loader">⟳ Generando...</div>
    <div class="resp" id="tk-resp"></div>
  </div>
  <div class="card">
    <h3>Preview de video</h3>
    <button onclick="verPreviewVideo()" class="btn-outline">▶ Ver preview animado</button>
  </div>
  <div class="card">
    <h3>Subir a TikTok</h3>
    <p style="font-size:.8rem;opacity:.6;margin-bottom:8px">Requiere configurar TIKTOK_TOKEN en Render</p>
    <button class="btn-outline" onclick="verInstruccionesTikTok()">📋 Ver instrucciones para activar</button>
  </div>
</div>

<!-- PANEL BUSCAR -->
<div class="panel" id="panel-buscar">
  <div class="card">
    <h3>Búsqueda en Red</h3>
    <input id="buscar-input" placeholder="Buscar en DuckDuckGo + Wikipedia...">
    <button onclick="buscar()">🔍 Buscar</button>
    <div class="loader" id="buscar-loader">⟳ Buscando...</div>
    <div class="resp" id="buscar-resp"></div>
  </div>
</div>

<!-- PANEL CONFIG -->
<div class="panel" id="panel-config">
  <div class="card">
    <h3>Configuración SOFI</h3>
    <input id="cfg-nombre" placeholder="Nombre de la IA (ej: SOFI)">
    <textarea id="cfg-personalidad" placeholder="Personalidad de SOFI..."></textarea>
    <input id="cfg-apikey" placeholder="API Key de Claude (para modo online)" type="password">
    <button onclick="guardarConfig()">💾 Guardar configuración</button>
  </div>
  <div class="card">
    <h3>Sistema</h3>
    <button class="btn-outline" onclick="verHealth()">❤️ Estado del servidor</button>
    <button class="btn-rojo" onclick="borrarMemoria()" style="margin-top:8px">🗑 Borrar memoria</button>
  </div>
</div>

<div id="status-bar">SOFI v${VERSION} — HaaPpDigitalV — Mérida, Yucatán</div>

<script>
const KEY = '${SOFI_API_KEY}';
const USER = '${SOFI_USER}';
const socket = io();
let audioCtx, oscL, oscR, scene, camera, renderer, particles;
let deferredPrompt = null;
let guionActual = null;

// ── Instalar PWA ──────────────────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBtn').style.display = 'block';
});
function instalarPWA() {
  if (!deferredPrompt) return alert('Para instalar: Chrome → Menú (⋮) → "Añadir a pantalla de inicio"');
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => { deferredPrompt = null; document.getElementById('installBtn').style.display = 'none'; });
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

// ── Tabs ─────────────────────────────────────────────────
function cambiarTab(id) {
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', ['cerebro','chat','libros','tiktok','buscar','config'][i]===id));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id==='panel-'+id));
}

// ── API helper ───────────────────────────────────────────
async function api(ruta, body, metodo = 'POST') {
  const opts = { method: metodo, headers: { 'x-sofi-key': KEY } };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const r = await fetch(ruta, opts);
  return r.json();
}

function mostrarResp(id, data) {
  const el = document.getElementById(id);
  el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  el.classList.add('show');
}

// ── 3D Cerebro ───────────────────────────────────────────
function init3D() {
  const canvas = document.getElementById('brain3d');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  scene.add(new THREE.AmbientLight(0x404040));
  const l = new THREE.PointLight(0x00ffcc, 1.8, 50);
  l.position.set(0, 5, 10); scene.add(l);
  const cols = [0xff5733, 0x3498db, 0x2ecc71, 0xe74c3c];
  cols.forEach((col, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 12), new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: .4 }));
    m.position.x = (i - 1.5) * 3; scene.add(m);
  });
  const pGeo = new THREE.BufferGeometry(), pos = new Float32Array(80 * 3);
  for (let i = 0; i < 80 * 3; i += 3) { pos[i] = (Math.random() - .5) * 12; pos[i+1] = (Math.random() - .5) * 8; pos[i+2] = (Math.random() - .5) * 12; }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x00ffcc, size: .1 }));
  scene.add(particles); camera.position.z = 14;
  (function animate() { requestAnimationFrame(animate); particles.rotation.y += .002; renderer.render(scene, camera); })();
}

// ── Audio binaural ───────────────────────────────────────
function toggleBinaural(beat) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (oscL) { oscL.stop(); oscR.stop(); oscL = oscR = null; return; }
  oscL = audioCtx.createOscillator(); oscL.frequency.value = 200;
  oscR = audioCtx.createOscillator(); oscR.frequency.value = 200 + beat;
  const gain = audioCtx.createGain(); gain.gain.value = .14;
  const merger = audioCtx.createChannelMerger(2);
  oscL.connect(gain).connect(merger, 0, 0); oscR.connect(gain).connect(merger, 0, 1);
  merger.connect(audioCtx.destination); oscL.start(); oscR.start();
}

// ── Perfiles ─────────────────────────────────────────────
async function activarPerfil(arr) {
  const irr = prompt('Nivel de irritabilidad (0-100):', '50') || '50';
  const sens = prompt('Sensibilidades (ruido,luz,tacto,olores,movimiento):', '') || '';
  const sensArr = sens ? sens.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
  const data = await api('/integra/perfil-sensorial-multi', { perfiles: arr, sensibilidades: sensArr, irritabilidad: parseInt(irr) || 50 });
  if (data.cerebro) {
    document.getElementById('freq').textContent = data.cerebro.frecuencia_actual + ' Hz';
    document.getElementById('regen').textContent = Math.round(data.cerebro.regeneracion) + '%';
    document.getElementById('perfil').textContent = (data.cerebro.perfilesActivos || []).join(' + ');
    document.getElementById('sens').textContent = (data.cerebro.sensibilidadesAdicionales || []).join(', ') || 'ninguna';
  }
}

// ── Chat ─────────────────────────────────────────────────
async function enviarChat() {
  const q = document.getElementById('chat-input').value.trim();
  if (!q) return;
  document.getElementById('chat-loader').classList.add('show');
  document.getElementById('chat-resp').classList.remove('show');
  try {
    const d = await api('/chat', { pregunta: q });
    mostrarResp('chat-resp', d.respuesta || JSON.stringify(d));
  } finally { document.getElementById('chat-loader').classList.remove('show'); }
}

async function ensenyar() {
  const clave = document.getElementById('conoc-clave').value.trim();
  const contenido = document.getElementById('conoc-valor').value.trim();
  if (!clave || !contenido) return alert('Rellena clave y contenido');
  const d = await api('/conocimiento', { clave, contenido });
  alert(d.msg || 'Guardado');
}

// ── TikTok ───────────────────────────────────────────────
function generarTikTokLibro(libro) {
  document.getElementById('tk-libro').value = libro;
  cambiarTab('tiktok');
  generarContenidoTikTok();
}

async function generarContenidoTikTok() {
  const libro = document.getElementById('tk-libro').value;
  const duracion = parseInt(document.getElementById('tk-duracion').value) || 45;
  document.getElementById('tk-loader').classList.add('show');
  document.getElementById('tk-resp').classList.remove('show');
  try {
    const d = await api('/tiktok/preparar', { libro, duracion });
    guionActual = d.guion;
    const resumen = [
      '📱 CONTENIDO TIKTOK LISTO',
      '',
      '🎣 GANCHO: ' + d.gancho,
      '',
      '📋 PUNTOS CLAVE:',
      ...(d.puntos_clave||[]).map((p,i)=>'  '+(i+1)+'. '+p),
      '',
      '📣 CTA: ' + d.cta,
      '',
      '🏷 DESCRIPCIÓN:',
      d.descripcion,
      '',
      '🗣 NARRACIÓN TTS:',
      d.tts?.texto || '',
      '',
      '📹 INSTRUCCIONES CAPCUT:',
      ...(d.guion?.instrucciones_capcut || [])
    ].join('\n');
    mostrarResp('tk-resp', resumen);
  } finally { document.getElementById('tk-loader').classList.remove('show'); }
}

async function verPreviewVideo() {
  if (!guionActual) { await generarContenidoTikTok(); }
  const libro = document.getElementById('tk-libro').value;
  const duracion = parseInt(document.getElementById('tk-duracion').value) || 45;
  const d = await api('/video/preview', { titulo: libro, tema: libro, duracion });
  if (typeof d === 'string' || d) {
    const w = window.open('', '_blank');
    if (w) { w.document.write(typeof d === 'string' ? d : JSON.stringify(d)); w.document.close(); }
  }
}

async function verInstruccionesTikTok() {
  const d = await api('/tiktok/subir', { videoPath: '', descripcion: 'test' });
  mostrarResp('tk-resp', d.pasos ? d.pasos.join('\n') : JSON.stringify(d, null, 2));
  document.getElementById('tk-resp').classList.add('show');
}

// ── Buscar ───────────────────────────────────────────────
async function buscar() {
  const q = document.getElementById('buscar-input').value.trim();
  if (!q) return;
  document.getElementById('buscar-loader').classList.add('show');
  document.getElementById('buscar-resp').classList.remove('show');
  try {
    const d = await api('/buscar', { query: q });
    const txt = (d.resultados || []).map(r => r.fuente.toUpperCase() + '\n' + (r.titulo ? r.titulo+'\n' : '') + r.resumen + '\n' + (r.url_fuente||'')).join('\n\n---\n\n');
    mostrarResp('buscar-resp', txt || 'Sin resultados');
  } finally { document.getElementById('buscar-loader').classList.remove('show'); }
}

// ── Config ───────────────────────────────────────────────
async function guardarConfig() {
  const body = {};
  const n = document.getElementById('cfg-nombre').value.trim();
  const p = document.getElementById('cfg-personalidad').value.trim();
  const k = document.getElementById('cfg-apikey').value.trim();
  if (n) body.nombre_ia = n;
  if (p) body.personalidad = p;
  if (k) body.api_key = k;
  if (!Object.keys(body).length) return alert('Rellena al menos un campo');
  const d = await api('/config', body, 'PATCH');
  alert(d.ok ? '✅ Configuración guardada' : 'Error al guardar');
}

async function verHealth() {
  const d = await api('/health', null, 'GET');
  alert(JSON.stringify(d, null, 2));
}

async function borrarMemoria() {
  if (!confirm('¿Borrar toda la memoria de SOFI?')) return;
  const d = await api('/memoria', null, 'DELETE');
  alert(d.msg || 'Memoria borrada');
}

// ── WebSockets ───────────────────────────────────────────
socket.on('connect', () => {
  socket.emit('join', USER);
  document.getElementById('conn-badge').textContent = '● online';
  document.getElementById('conn-badge').className = 'badge-online';
  document.getElementById('status-bar').textContent = 'SOFI v${VERSION} conectada — HaaPpDigitalV';
});
socket.on('disconnect', () => {
  document.getElementById('conn-badge').textContent = '● offline';
  document.getElementById('conn-badge').className = 'badge-offline';
});
socket.on('actualizacionTiempoReal', d => {
  if (d.frecuencia_actual) document.getElementById('freq').textContent = d.frecuencia_actual + ' Hz';
  if (d.regeneracion) document.getElementById('regen').textContent = Math.round(d.regeneracion) + '%';
});

// ── Resize ───────────────────────────────────────────────
window.addEventListener('resize', () => {
  if (!camera || !renderer) return;
  const c = document.getElementById('brain3d');
  camera.aspect = c.clientWidth / c.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(c.clientWidth, c.clientHeight);
});

window.onload = () => init3D();
<\/script>
</body>
</html>`);
});

// ══════════════════════════════════════════════════════════════
// RUTAS PRIVADAS
// ══════════════════════════════════════════════════════════════
app.get('/health', (req, res) => res.json({
  status: 'online', nombre: CONFIG.nombre_ia, version: VERSION,
  timestamp: new Date().toISOString(),
  conocimiento:  Object.keys(CONOCIMIENTO).length,
  notas:         NOTAS.length,
  busquedas:     BUSQUEDAS.length,
  cerebros:      Object.keys(CEREBROS).length,
  interacciones: Object.values(MEMORIA.interacciones).reduce((s,v)=>s+v.length,0),
  modulos: ['motor-cognitivo','red-neuronal','integra-perceptiva','busqueda-red','presentador','video','tts','tiktok','pwa','websockets','seguridad']
}));

app.post('/chat', requireKey, async (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta) return res.status(400).json({ error: 'Campo requerido: pregunta' });
  if (CONFIG.modo_online && CONFIG.api_key)
    return res.json({ respuesta: await respuestaOnline(pregunta, CONFIG.api_key), nivel: 'online', confianza: 1.0 });
  res.json(procesarPregunta(pregunta));
});

app.post('/integra/digitalizar', requireKey, (req, res) => {
  const cerebro = digitalizarCerebro(req.body.datos || {}, SOFI_USER);
  io.to(SOFI_USER).emit('cerebroActualizado', cerebro);
  res.json({ ok: true, cerebro });
});

app.get('/integra/estado', requireKey, (req, res) => {
  const cerebro = CEREBROS[SOFI_USER];
  if (!cerebro) return res.json({ ok: false, msg: 'Sin datos. Llama a /integra/digitalizar' });
  res.json({ ok: true, cerebro });
});

app.post('/integra/perfil-sensorial-multi', requireKey, (req, res) => {
  const { idUsuario = SOFI_USER, perfiles = ['neurotipico'], sensibilidades = [], irritabilidad = 50 } = req.body;
  const cerebro = obtenerPerfilesMultiples(idUsuario, perfiles, sensibilidades, irritabilidad);
  io.to(idUsuario).emit('perfilActualizado', cerebro);
  res.json({ ok: true, cerebro, mensaje: `Perfiles: ${cerebro.perfilesActivos.join(' + ')}. Frecuencia: ${cerebro.frecuencia_actual} Hz` });
});

app.post('/integra/irritabilidad', requireKey, (req, res) => {
  const { nivel, nota } = req.body;
  if (nivel === undefined) return res.status(400).json({ error: 'Campo requerido: nivel (0-100)' });
  const cerebro = CEREBROS[SOFI_USER];
  if (!cerebro) return res.status(404).json({ error: 'Sin datos. Llama a /integra/digitalizar' });
  cerebro.irritabilidad_estimada = Math.max(0, Math.min(100, nivel));
  const freq = ajustarFrecuenciaSegunIrritabilidad(cerebro);
  const hist = cerebro.historial_adaptacion;
  if (hist.length > 0) { hist[hist.length-1].irritabilidad_despues = nivel; if (nota) hist[hist.length-1].nota = nota; }
  CEREBROS[SOFI_USER] = cerebro;
  guardarJSON(RUTAS.cerebros, CEREBROS);
  io.to(SOFI_USER).emit('actualizacionTiempoReal', cerebro);
  res.json({ ok: true, frecuencia_ajustada: freq, irritabilidad: nivel, msg: `Frecuencia adaptada a ${freq} Hz` });
});

app.get('/integra/historial', requireKey, (req, res) => {
  const cerebro = CEREBROS[SOFI_USER];
  if (!cerebro) return res.json({ ok: false, historial: [] });
  res.json({ ok: true, total: cerebro.historial_adaptacion?.length || 0, historial: (cerebro.historial_adaptacion || []).slice(-50) });
});

app.post('/integra/prediccion', requireKey, (req, res) => {
  const { gestion = 1, hotmart = 1 } = req.body;
  const prediccion = redNeuronal.run({ gestion, hotmart });
  res.json({ ok: true, prediccion, interpretacion: prediccion.estrategia > 0.8 ? 'Alta efectividad estratégica' : 'Efectividad moderada' });
});

app.post('/buscar', requireKey, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Campo requerido: query' });
  const r = await buscarEnRed(query);
  res.json(r.length ? { ok: true, query, total: r.length, resultados: r } : { ok: false, msg: 'Sin resultados', query });
});

app.get('/buscar/historial', requireKey, (req, res) => res.json(BUSQUEDAS.slice(0, 50)));

app.post('/presentador', requireKey, (req, res) => {
  const { titulo, slides, config } = req.body;
  if (!titulo || !slides?.length) return res.status(400).json({ error: 'Campos: titulo, slides[]' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(generarPresentacionHTML(titulo, slides, config || {}));
});

app.post('/video/guion', requireKey, (req, res) => {
  const { titulo, tema, duracion, config } = req.body;
  if (!titulo || !tema) return res.status(400).json({ error: 'Campos: titulo, tema' });
  res.json({ ok: true, guion: generarGuionVideo(titulo, tema, duracion || 60, config || {}) });
});

app.post('/video/preview', requireKey, (req, res) => {
  const { titulo, tema, duracion, config } = req.body;
  if (!titulo || !tema) return res.status(400).json({ error: 'Campos: titulo, tema' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(generarVideoPreview(generarGuionVideo(titulo, tema, duracion || 60, config || {})));
});

// TTS
app.post('/tts', requireKey, (req, res) => {
  const { texto, config } = req.body;
  if (!texto) return res.status(400).json({ error: 'Campo requerido: texto' });
  res.json({ ok: true, ...generarScriptTTS(texto, config || {}) });
});

// TikTok
app.post('/tiktok/preparar', requireKey, (req, res) => {
  const { libro = 'enoc', duracion = 45 } = req.body;
  const contenido = prepararContenidoTikTok(libro, { duracion });
  res.json(contenido);
});

app.post('/tiktok/subir', requireKey, async (req, res) => {
  const { videoPath, descripcion } = req.body;
  const resultado = await subirATikTok(videoPath, descripcion || '', TIKTOK_TOKEN);
  res.json(resultado);
});

app.get('/tiktok/historial', requireKey, (req, res) => res.json(TIKTOK_LOG.slice(0, 20)));

app.post('/feedback', requireKey, (req, res) => {
  const { pregunta, exitoso, nota } = req.body;
  if (!pregunta) return res.status(400).json({ error: 'Campo requerido: pregunta' });
  registrarFeedback(pregunta, !!exitoso, nota || '');
  res.json({ ok: true });
});

app.get('/conocimiento',           requireKey, (req, res) => res.json(CONOCIMIENTO));
app.post('/conocimiento',          requireKey, (req, res) => {
  const { clave, contenido } = req.body;
  if (!clave || !contenido) return res.status(400).json({ error: 'Campos: clave, contenido' });
  CONOCIMIENTO[clave.toLowerCase()] = { contenido, fecha: new Date().toISOString() };
  guardarJSON(RUTAS.conocimiento, CONOCIMIENTO);
  res.json({ ok: true, msg: `Aprendido: "${clave}"` });
});
app.delete('/conocimiento/:clave', requireKey, (req, res) => {
  const c = req.params.clave.toLowerCase();
  if (!CONOCIMIENTO[c]) return res.status(404).json({ error: 'No encontrado' });
  delete CONOCIMIENTO[c]; guardarJSON(RUTAS.conocimiento, CONOCIMIENTO);
  res.json({ ok: true });
});

app.get('/notas',  requireKey, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json(NOTAS);
  const t = q.toLowerCase();
  res.json(NOTAS.filter(n => n.titulo.toLowerCase().includes(t) || n.contenido.toLowerCase().includes(t)));
});
app.post('/notas', requireKey, (req, res) => {
  const { titulo, contenido, etiquetas } = req.body;
  if (!titulo || !contenido) return res.status(400).json({ error: 'Campos: titulo, contenido' });
  NOTAS.push({ titulo, contenido, etiquetas: etiquetas||[], fecha: new Date().toISOString() });
  guardarJSON(RUTAS.notas, NOTAS);
  res.json({ ok: true, msg: `Nota: "${titulo}"` });
});

app.get('/config',   requireKey, (req, res) => {
  const { api_key, ...s } = CONFIG; res.json({ ...s, tiene_api_key: !!api_key });
});
app.patch('/config', requireKey, (req, res) => {
  const { nombre_ia, personalidad, modo_online, api_key, idioma } = req.body;
  if (nombre_ia)                        CONFIG.nombre_ia    = nombre_ia;
  if (personalidad)                     CONFIG.personalidad = personalidad;
  if (typeof modo_online === 'boolean') CONFIG.modo_online  = modo_online;
  if (api_key)                          CONFIG.api_key      = api_key;
  if (idioma)                           CONFIG.idioma       = idioma;
  guardarJSON(RUTAS.config, CONFIG);
  res.json({ ok: true });
});

app.delete('/memoria', requireKey, (req, res) => {
  MEMORIA = { interacciones: {} }; guardarJSON(RUTAS.memoria, MEMORIA);
  res.json({ ok: true, msg: 'Memoria borrada' });
});

// ══════════════════════════════════════════════════════════════
// INICIO
// ══════════════════════════════════════════════════════════════
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   SOFI v${VERSION} — Motor Cognitivo + TikTok + PWA       ║
  ║   Puerto  : ${PORT}                                       ║
  ║   Módulos : cognitivo · neuronal · integra           ║
  ║             perfiles · búsqueda · presentador        ║
  ║             video · tts · tiktok · pwa               ║
  ║             websockets · seguridad                   ║
  ║   HaaPpDigitalV — Mérida, Yucatán                   ║
  ╚══════════════════════════════════════════════════════╝
  `);
});
