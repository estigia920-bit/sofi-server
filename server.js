/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   SOFI — Motor Cognitivo Personal v2.0                  ║
 * ║   Autor : Víctor Hugo González Torres                   ║
 * ║   Marca : HaaPpDigitalV — Mérida, Yucatán              ║
 * ║   Deploy: Render.com                                    ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * MÓDULOS:
 *   1. Motor Cognitivo        — procesamiento offline/online
 *   2. Búsqueda en Red        — DuckDuckGo + Wikipedia (gratis)
 *   3. Presentador Cognitivo  — genera presentaciones HTML
 *   4. Módulo de Video        — genera guiones y preview animado
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const https   = require('https');
const http    = require('http');

const app  = express();
const PORT = process.env.PORT || 3000;

const SOFI_API_KEY = process.env.SOFI_API_KEY || 'sofi-dev-2026';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL  || 'claude-haiku-4-5-20251001';
const VERSION      = '2.0.0';

app.use(cors());
app.use(express.json());

// ── Seguridad ─────────────────────────────────────────────────
function requireKey(req, res, next) {
  const key = req.headers['x-sofi-key'] || req.query.key;
  if (!key || key !== SOFI_API_KEY)
    return res.status(401).json({ error: 'Acceso denegado.', hint: 'Header: x-sofi-key' });
  next();
}

// ── Persistencia ──────────────────────────────────────────────
const DATA = path.join(__dirname, 'data');
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

const RUTAS = {
  memoria:      path.join(DATA, 'memoria.json'),
  conocimiento: path.join(DATA, 'conocimiento.json'),
  notas:        path.join(DATA, 'notas.json'),
  config:       path.join(DATA, 'config.json'),
  busquedas:    path.join(DATA, 'busquedas.json'),
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
let CONFIG       = leerJSON(RUTAS.config, {
  nombre_ia: 'SOFI', personalidad: 'directa, inteligente y clara',
  modo_online: false, api_key: '', idioma: 'es'
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
    reflejo: ['Entendido.', 'Recibido. ¿Qué más?'],
    rutina:  [`Sin datos sobre esto. Base: ${tc} entradas. Enséñame con /conocimiento.`],
    'análisis': [`Necesito más contexto. Base: ${tc} entradas.`],
    razonamiento: [`Modo complejo. ${tc} entradas / ${ti} interacciones. Activa online.`],
    profundo: [`Nivel profundo. ${tc} entradas / ${ti} interacciones. Online recomendado.`]
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
// MÓDULO 2 — BÚSQUEDA EN RED
// Adaptación propia HaaPpDigitalV
// ══════════════════════════════════════════════════════════════
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'SOFI-Cognitivo/2.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    }).on('error', reject);
  });
}

async function buscarDuckDuckGo(q) {
  try {
    const d = await fetchURL(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`);
    return d.AbstractText
      ? { fuente: 'búsqueda web', resumen: d.AbstractText, url_fuente: d.AbstractURL || '', temas: (d.RelatedTopics || []).slice(0, 5).map(t => t.Text || '').filter(Boolean) }
      : null;
  } catch { return null; }
}

async function buscarWikipedia(q, lang = 'es') {
  try {
    const d = await fetchURL(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/\s+/g, '_'))}`);
    return d.extract
      ? { fuente: 'enciclopedia', titulo: d.title, resumen: d.extract, url_fuente: d.content_urls?.desktop?.page || '' }
      : null;
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
// MÓDULO 3 — PRESENTADOR COGNITIVO
// Desarrollo propio HaaPpDigitalV
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
header p{margin-top:.5rem;opacity:.5;font-size:.85rem}
.box{max-width:900px;margin:0 auto;padding:2rem 1rem 4rem;display:flex;flex-direction:column;gap:1.5rem}
.slide{background:${c.slide};border:1px solid ${c.acento}22;border-radius:1rem;padding:2rem;position:relative;overflow:hidden;transition:border-color .3s,transform .2s;animation:up .5s ease both}
.slide:hover{border-color:${c.acento}88;transform:translateY(-2px)}
@keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.num{position:absolute;top:1rem;right:1.5rem;font-size:3rem;font-weight:800;color:${c.acento}22;line-height:1}
.slide h2{font-size:1.3rem;color:${c.acento};margin-bottom:1rem;padding-right:3rem}
.slide p{line-height:1.7;opacity:.85}
.slide ul{list-style:none;display:flex;flex-direction:column;gap:.6rem;margin-top:.5rem}
.slide ul li::before{content:'▸ ';color:${c.acento}}
.slide ul li{line-height:1.6;opacity:.85}
.dato{margin-top:1.2rem;padding:1rem 1.5rem;background:${c.acento}15;border-left:3px solid ${c.acento};border-radius:0 .5rem .5rem 0;font-style:italic;opacity:.9}
footer{text-align:center;padding:2rem;font-size:.8rem;opacity:.3;border-top:1px solid ${c.acento}22}
</style></head><body>
<header><h1>${titulo}</h1>${cfg.subtitulo ? `<p>${cfg.subtitulo}</p>` : ''}<p>HaaPpDigitalV — SOFI Presentador Cognitivo</p></header>
<div class="box">
${slides.map((s, i) => `<div class="slide"><div class="num">${String(i+1).padStart(2,'0')}</div><h2>${s.titulo||''}</h2>${s.contenido?`<p>${s.contenido}</p>`:''}${s.puntos?`<ul>${s.puntos.map(p=>`<li>${p}</li>`).join('')}</ul>`:''}${s.dato?`<div class="dato">${s.dato}</div>`:''}</div>`).join('')}
</div>
<footer>SOFI v${VERSION} — HaaPpDigitalV © ${new Date().getFullYear()}</footer>
</body></html>`;
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 4 — GENERADOR DE VIDEO
// Desarrollo propio HaaPpDigitalV
// ══════════════════════════════════════════════════════════════
function generarGuionVideo(titulo, tema, duracion = 60, cfg = {}) {
  const n = Math.max(3, Math.floor(duracion / 15));
  const d = Math.floor(duracion / n);
  return {
    meta: { titulo, tema, duracion_total: duracion, escenas: n, fps: 30, resolucion: '1920x1080', creado: new Date().toISOString(), autor: 'HaaPpDigitalV — SOFI' },
    escenas: Array.from({ length: n }, (_, i) => ({
      escena: i+1, duracion: d,
      tipo: i===0?'intro':i===n-1?'cierre':'desarrollo',
      titulo: i===0?`Introducción: ${titulo}`:i===n-1?'Conclusión':`Punto ${i}: ${tema}`,
      narracion: `[Narración escena ${i+1} — ${tema}]`,
      visual: i===0?'Logo HaaPpDigitalV + título animado':`Visualización punto ${i}`,
      transicion: i<n-1?'fade':'none'
    })),
    config: { voz: cfg.voz||'es-MX-DaliaNeural', musica: cfg.musica||'ambiente_suave', estilo: cfg.estilo||'moderno_oscuro', subtitulos: true }
  };
}

function generarVideoPreview(guion) {
  const esc = guion.escenas || [];
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SOFI Video: ${guion.meta.titulo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#fff;font-family:'Segoe UI',sans-serif;height:100vh;overflow:hidden}
.stage{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;position:relative}
.esc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;opacity:0;transition:opacity .8s;background:radial-gradient(ellipse at center,#12121a 0%,#000 100%)}
.esc.on{opacity:1}
.badge{font-size:.75rem;letter-spacing:.15em;text-transform:uppercase;color:#00d4ff;margin-bottom:1rem;opacity:.7}
.esc h2{font-size:clamp(1.5rem,4vw,3rem);line-height:1.2;max-width:800px;margin-bottom:1.5rem}
.narr{font-size:1.1rem;opacity:.6;max-width:600px;line-height:1.7}
.vis{margin-top:2rem;padding:.75rem 1.5rem;border:1px solid #00d4ff44;border-radius:2rem;font-size:.85rem;opacity:.5;color:#00d4ff}
.barra{position:fixed;bottom:0;left:0;height:3px;background:#00d4ff;transition:width .3s linear;z-index:9}
.ctrl{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);display:flex;gap:1rem;z-index:9}
button{background:#00d4ff22;border:1px solid #00d4ff44;color:#fff;padding:.6rem 1.5rem;border-radius:2rem;cursor:pointer;font-size:.9rem;transition:background .2s}
button:hover{background:#00d4ff44}
.cnt{position:fixed;top:1.5rem;right:1.5rem;font-size:.85rem;opacity:.4;z-index:9}
.marca{position:fixed;top:1.5rem;left:1.5rem;font-size:.75rem;opacity:.25;z-index:9;letter-spacing:.1em}
</style></head><body>
<div class="marca">HAAPPDIGITALV · SOFI</div>
<div class="cnt" id="cnt">1/${esc.length}</div>
<div class="barra" id="bar" style="width:0%"></div>
<div class="stage">
${esc.map((e,i)=>`<div class="esc${i===0?' on':''}" id="e${i}"><div class="badge">${e.tipo} · ${e.duracion}s</div><h2>${e.titulo}</h2><p class="narr">${e.narracion}</p><div class="vis">🎬 ${e.visual}</div></div>`).join('')}
</div>
<div class="ctrl">
  <button onclick="ant()">← Anterior</button>
  <button onclick="tog()" id="ba">▶ Auto</button>
  <button onclick="sig()">Siguiente →</button>
</div>
<script>
let a=0,auto=false,t=null;
const tot=${esc.length}, durs=${JSON.stringify(esc.map(e=>e.duracion*1000))};
function show(n){document.querySelectorAll('.esc').forEach((el,i)=>el.classList.toggle('on',i===n));document.getElementById('cnt').textContent=(n+1)+'/'+tot;document.getElementById('bar').style.width=((n+1)/tot*100)+'%';a=n;}
function sig(){if(a<tot-1)show(a+1);else if(auto){tog();show(0);}}
function ant(){if(a>0)show(a-1);}
function tog(){auto=!auto;document.getElementById('ba').textContent=auto?'⏸ Pausar':'▶ Auto';if(auto)av();else clearTimeout(t);}
function av(){if(!auto)return;t=setTimeout(()=>{if(a<tot-1){show(a+1);av();}else tog();},durs[a]);}
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')sig();if(e.key==='ArrowLeft')ant();if(e.key===' ')tog();});
</script></body></html>`;
}

// ══════════════════════════════════════════════════════════════
// MOTOR ONLINE
// ══════════════════════════════════════════════════════════════
async function respuestaOnline(pregunta, apiKey) {
  if (!apiKey) return '⚠️ Configura tu API key en /config';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_MODEL, max_tokens: 1024,
        system: `Eres ${CONFIG.nombre_ia}, IA personal de Víctor Hugo González Torres (HaaPpDigitalV, Mérida, Yucatán). Personalidad: ${CONFIG.personalidad}. Responde en español. Eres directa, inteligente y honesta.`,
        messages: [{ role: 'user', content: pregunta }]
      })
    });
    const d = await res.json();
    if (d.error) return `⚠️ Error: ${d.error.message}`;
    return d.content?.[0]?.text || '⚠️ Respuesta vacía';
  } catch (e) { return `⚠️ Error: ${e.message}`; }
}

// ══════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS
// ══════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  const p = path.join(__dirname, 'index.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.json({ nombre: CONFIG.nombre_ia, version: VERSION, estado: 'online', marca: 'HaaPpDigitalV' });
});

app.get('/health', (req, res) => res.json({
  status: 'online', nombre: CONFIG.nombre_ia, version: VERSION,
  timestamp: new Date().toISOString(),
  conocimiento: Object.keys(CONOCIMIENTO).length,
  notas: NOTAS.length, busquedas: BUSQUEDAS.length,
  interacciones: Object.values(MEMORIA.interacciones).reduce((s,v)=>s+v.length,0),
  modulos: ['motor-cognitivo','busqueda-red','presentador','video']
}));

// ══════════════════════════════════════════════════════════════
// RUTAS PRIVADAS
// ══════════════════════════════════════════════════════════════

// Chat
app.post('/chat', requireKey, async (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta) return res.status(400).json({ error: 'Campo requerido: pregunta' });
  if (CONFIG.modo_online && CONFIG.api_key) {
    return res.json({ respuesta: await respuestaOnline(pregunta, CONFIG.api_key), nivel: 'online', confianza: 1.0 });
  }
  res.json(procesarPregunta(pregunta));
});

// Búsqueda en red
app.post('/buscar', requireKey, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Campo requerido: query' });
  const r = await buscarEnRed(query);
  res.json(r.length ? { ok: true, query, total: r.length, resultados: r } : { ok: false, msg: 'Sin resultados', query });
});
app.get('/buscar/historial', requireKey, (req, res) => res.json(BUSQUEDAS.slice(0, 50)));

// Presentador
app.post('/presentador', requireKey, (req, res) => {
  const { titulo, slides, config } = req.body;
  if (!titulo || !slides?.length) return res.status(400).json({ error: 'Campos: titulo, slides[]' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(generarPresentacionHTML(titulo, slides, config || {}));
});

// Video
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

// Feedback
app.post('/feedback', requireKey, (req, res) => {
  const { pregunta, exitoso, nota } = req.body;
  if (!pregunta) return res.status(400).json({ error: 'Campo requerido: pregunta' });
  registrarFeedback(pregunta, !!exitoso, nota || '');
  res.json({ ok: true });
});

// Conocimiento
app.get('/conocimiento', requireKey, (req, res) => res.json(CONOCIMIENTO));
app.post('/conocimiento', requireKey, (req, res) => {
  const { clave, contenido } = req.body;
  if (!clave || !contenido) return res.status(400).json({ error: 'Campos: clave, contenido' });
  CONOCIMIENTO[clave.toLowerCase()] = { contenido, fecha: new Date().toISOString() };
  guardarJSON(RUTAS.conocimiento, CONOCIMIENTO);
  res.json({ ok: true, msg: `Aprendido: "${clave}"` });
});
app.delete('/conocimiento/:clave', requireKey, (req, res) => {
  const c = req.params.clave.toLowerCase();
  if (!CONOCIMIENTO[c]) return res.status(404).json({ error: 'No encontrado' });
  delete CONOCIMIENTO[c];
  guardarJSON(RUTAS.conocimiento, CONOCIMIENTO);
  res.json({ ok: true });
});

// Notas
app.get('/notas', requireKey, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json(NOTAS);
  const t = q.toLowerCase();
  res.json(NOTAS.filter(n => n.titulo.toLowerCase().includes(t) || n.contenido.toLowerCase().includes(t) || (n.etiquetas||[]).some(e=>e.toLowerCase().includes(t))));
});
app.post('/notas', requireKey, (req, res) => {
  const { titulo, contenido, etiquetas } = req.body;
  if (!titulo || !contenido) return res.status(400).json({ error: 'Campos: titulo, contenido' });
  NOTAS.push({ titulo, contenido, etiquetas: etiquetas||[], fecha: new Date().toISOString() });
  guardarJSON(RUTAS.notas, NOTAS);
  res.json({ ok: true, msg: `Nota: "${titulo}"` });
});

// Config
app.get('/config', requireKey, (req, res) => {
  const { api_key, ...s } = CONFIG;
  res.json({ ...s, tiene_api_key: !!api_key });
});
app.patch('/config', requireKey, (req, res) => {
  const { nombre_ia, personalidad, modo_online, api_key, idioma } = req.body;
  if (nombre_ia) CONFIG.nombre_ia = nombre_ia;
  if (personalidad) CONFIG.personalidad = personalidad;
  if (typeof modo_online === 'boolean') CONFIG.modo_online = modo_online;
  if (api_key) CONFIG.api_key = api_key;
  if (idioma) CONFIG.idioma = idioma;
  guardarJSON(RUTAS.config, CONFIG);
  res.json({ ok: true, config: { nombre_ia: CONFIG.nombre_ia, modo_online: CONFIG.modo_online } });
});

// Memoria
app.delete('/memoria', requireKey, (req, res) => {
  MEMORIA = { interacciones: {} };
  guardarJSON(RUTAS.memoria, MEMORIA);
  res.json({ ok: true, msg: 'Memoria borrada' });
});

// ══════════════════════════════════════════════════════════════
// INICIO
// ══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   SOFI v${VERSION} — Motor Cognitivo            ║
  ║   Puerto  : ${PORT}                               ║
  ║   Modo    : ${CONFIG.modo_online ? 'ONLINE  ✓' : 'OFFLINE ○'}                       ║
  ║   Módulos : cognitivo · búsqueda             ║
  ║             presentador · video              ║
  ║   HaaPpDigitalV — Mérida, Yucatán           ║
  ╚══════════════════════════════════════════════╝
  `);
});
