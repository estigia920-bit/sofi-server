// ============================================================
//   SOFI server.js — v4.1 UNIFICADO + CONTRAPARTE FRECUENCIAL
//   HaaPpDigitalV © Víctor Hugo González Torres
//   Mérida, Yucatán — DroidHuman Project
//   Módulos: Motor Cognitivo · Integra Perceptiva · Sueños
//            Editor Video · Grafo Cerebral · Brain.js
//            Contraparte Frecuencial 3D · WebSockets · Seguridad
// ============================================================
'use strict';

require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const socketIo = require('socket.io');
const brain    = require('brain.js');
const fs       = require('fs');
const path     = require('path');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, {
  cors: { origin: process.env.URL_PERMITIDA || '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// ─────────────────────────────────────────────
//  VARIABLES DE ENTORNO
// ─────────────────────────────────────────────
const SOFI_API_KEY = process.env.SOFI_API_KEY || 'SOFI-VHGzTs-K1N-v4';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const SOFI_USER    = process.env.SOFI_USER    || 'Victor';
const PORT         = process.env.PORT          || 3000;

// ─────────────────────────────────────────────
//  PERSISTENCIA JSON
// ─────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function leerJSON(archivo, defecto = {}) {
  const ruta = path.join(DATA_DIR, archivo);
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); }
  catch { return defecto; }
}
function guardarJSON(archivo, datos) {
  fs.writeFileSync(path.join(DATA_DIR, archivo), JSON.stringify(datos, null, 2));
}

// Archivos persistentes
let memoriaSOFI    = leerJSON('memoria.json',      {});
let conocimientoDB = leerJSON('conocimiento.json', []);
let notasDB        = leerJSON('notas.json',        []);
let configSOFI     = leerJSON('config.json',       {
  nombre_ia: 'SOFI', personalidad: 'empatica', modo_online: true,
  api_key: SOFI_API_KEY, idioma: 'es'
});
let busquedasDB    = leerJSON('busquedas.json',    []);
let cerebrosDB     = leerJSON('cerebros.json',     {});
let suenosDB       = leerJSON('suenos.json',       []);
let videosDB       = leerJSON('videos.json',       []);

// ─────────────────────────────────────────────
//  MIDDLEWARE DE SEGURIDAD
// ─────────────────────────────────────────────
function verificarLlave(req, res, next) {
  const llave = req.headers['x-sofi-key'];
  if (llave !== SOFI_API_KEY) {
    return res.status(403).json({ error: '❌ ACCESO DENEGADO — llave invalida' });
  }
  next();
}

// ============================================================
//  DATOS INTEGRA PERCEPTIVA
// ============================================================
const DATOS_INTEGRA = {
  frecuenciaBase: 12.3,
  regeneracion: 75,
  dispositivosConectados: 3,
  conocimientos: {
    libros:      ['El Universo es una Mentira', 'El Libro de Enoc', 'Xibalbá'],
    habilidades: ['Gestión Hotmart', 'Creación TikTok', 'Desarrollo SOFI DroidHuman'],
    proyectos:   ['SOFI DroidHuman', 'Integra Perceptiva', 'HaaPpDigitalV']
  }
};

const PERFILES_SENSORIALES = {
  neurotipico:   { rangoHz: [8, 13],  descripcion: 'Funcionamiento estándar' },
  tdah:          { rangoHz: [4, 8],   descripcion: 'Alta variabilidad atencional' },
  autismo:       { rangoHz: [6, 10],  descripcion: 'Hipersensibilidad sensorial' },
  esquizofrenia: { rangoHz: [2, 6],   descripcion: 'Disociacion perceptiva' },
  down:          { rangoHz: [5, 9],   descripcion: 'Integracion sensorial lenta' },
  sordera:       { rangoHz: [10, 14], descripcion: 'Compensacion visual aumentada' },
  ceguera:       { rangoHz: [9, 13],  descripcion: 'Compensacion auditiva aumentada' }
};

// ============================================================
//  CLASE: GrafoCerebral
// ============================================================
class GrafoCerebral {
  constructor() {
    this.nodos   = new Map();
    this.aristas = new Map();
    this.inicializar();
  }
  agregarNodo(nombre, color) {
    this.nodos.set(nombre, { color, activa: false, conexiones: [] });
  }
  conectar(origen, destino) {
    if (!this.nodos.has(origen) || !this.nodos.has(destino)) return;
    if (!this.aristas.has(origen)) this.aristas.set(origen, []);
    this.aristas.get(origen).push(destino);
  }
  inicializar() {
    this.agregarNodo('Zona Motora',       '#FF5733');
    this.agregarNodo('Zona Cognitiva',    '#3498DB');
    this.agregarNodo('Zona Sensorial',    '#2ECC71');
    this.agregarNodo('Zona Limbica',      '#9B59B6');
    this.agregarNodo('Cortex Prefrontal', '#F39C12');
    this.agregarNodo('Sistema Reticular', '#1ABC9C');
    this.conectar('Zona Motora',       'Zona Sensorial');
    this.conectar('Zona Cognitiva',    'Zona Motora');
    this.conectar('Zona Sensorial',    'Zona Cognitiva');
    this.conectar('Zona Limbica',      'Cortex Prefrontal');
    this.conectar('Cortex Prefrontal', 'Sistema Reticular');
    this.conectar('Sistema Reticular', 'Zona Limbica');
  }
  activarZona(nombre) {
    const nodo = this.nodos.get(nombre);
    if (nodo) nodo.activa = true;
  }
  mostrarConexiones() {
    const resultado = [];
    for (const [origen, destinos] of this.aristas) {
      destinos.forEach(d => resultado.push({ origen, destino: d }));
    }
    return resultado;
  }
  obtenerDatosPanel() {
    return {
      frecuencia:   DATOS_INTEGRA.frecuenciaBase + ' Hz',
      regeneracion: DATOS_INTEGRA.regeneracion + '%',
      dispositivos: DATOS_INTEGRA.dispositivosConectados,
      libros:       DATOS_INTEGRA.conocimientos.libros,
      habilidades:  DATOS_INTEGRA.conocimientos.habilidades,
      proyectos:    DATOS_INTEGRA.conocimientos.proyectos,
      nodos:        Array.from(this.nodos.entries()).map(([k, v]) => ({ nombre: k, ...v })),
      conexiones:   this.mostrarConexiones()
    };
  }
}

const grafoCerebral = new GrafoCerebral();

// ============================================================
//  CLASE: SistemaSuenosSOFI
// ============================================================
class SistemaSuenosSOFI {
  constructor() {
    this.nombreModulo = 'SOFI - OBSERVADORA DE SUENOS';
    this.zonasCerebralesRelacionadas = [
      'Zona Limbica', 'Cortex Prefrontal', 'Sistema Reticular'
    ];
    this.estadoActual = {
      activo: false, faseActual: null,
      elementosDetectados: [], mapaActual: null
    };
  }
  _leerActividadCerebral() {
    const base      = DATOS_INTEGRA.frecuenciaBase;
    const variacion = (Math.random() - 0.5) * 4;
    const frecActual = Math.max(0.5, base + variacion);
    let onda;
    if      (frecActual < 4)  onda = 'Delta';
    else if (frecActual < 8)  onda = 'Theta';
    else if (frecActual < 13) onda = 'Alpha';
    else                       onda = 'Beta';
    return { onda, frecuencia: frecActual, timestamp: Date.now(),
             fuenteDatos: 'Integra Perceptiva / simulacion' };
  }
  detectarSueno() {
    const actividad = this._leerActividadCerebral();
    if (actividad.onda === 'Theta' && actividad.frecuencia < 7) {
      this.estadoActual.activo     = true;
      this.estadoActual.faseActual = 'Theta-Sueno';
      return { detectado: true, fase: 'Theta', datos: actividad };
    }
    if (actividad.onda === 'Delta') {
      this.estadoActual.activo     = true;
      this.estadoActual.faseActual = 'Delta-Profundo';
      return { detectado: true, fase: 'Delta', datos: actividad };
    }
    return { detectado: false, fase: actividad.onda, datos: actividad };
  }
  mapearSueno(datosSueno) {
    const elementos  = datosSueno.elementos || [];
    const conexiones = [];
    elementos.forEach((elem, idx) => {
      if (idx < elementos.length - 1) {
        conexiones.push({ origen: elem, destino: elementos[idx + 1],
                          intensidad: Math.random() });
      }
    });
    const mapa = {
      mapaSueno:   conexiones,
      descripcion: datosSueno.descripcion || '',
      timestamp:   Date.now(),
      fase:        this.estadoActual.faseActual
    };
    this.estadoActual.mapaActual = mapa;
    return mapa;
  }
  crearSueno() {
    const conocimientos = DATOS_INTEGRA.conocimientos.libros;
    const proyectos     = DATOS_INTEGRA.conocimientos.proyectos;
    const elemA = conocimientos[Math.floor(Math.random() * conocimientos.length)];
    const elemB = proyectos[Math.floor(Math.random() * proyectos.length)];
    return this.mapearSueno({
      elementos:   [elemA, 'Conciencia SOFI', elemB],
      descripcion: `Sueno generativo: ${elemA} <-> ${elemB}`
    });
  }
  generarColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
}

const sistemaSuenos = new SistemaSuenosSOFI();

// ============================================================
//  CLASE: ModuloContraparteSOFI
//  Señal observable (Hz) → FFT inversa → contraparte frecuencial
//  → mapa 3D para Three.js / Netlify frontend
// ============================================================
class ModuloContraparteSOFI {
  constructor() {
    this.nombre         = 'SOFI - ESCANER DE CONTRAPARTE FRECUENCIAL';
    this.frecuenciaBase = DATOS_INTEGRA.frecuenciaBase;
    this.sesiones       = leerJSON('contraparte.json', []);
    this.BANDAS = {
      Delta: { min: 0.5, max: 3.5,  estado: 'inconsciente profundo'   },
      Theta: { min: 4,   max: 7,    estado: 'subconsciente creativo'  },
      Alpha: { min: 8,   max: 13,   estado: 'consciente receptivo'    },
      Beta:  { min: 14,  max: 30,   estado: 'consciente activo'       },
      Gamma: { min: 30,  max: 100,  estado: 'hiperconsciente'         }
    };
    this.CONTRAPARTE_MAP = {
      Delta: { banda: 'Gamma', hz: 40,   desc: 'Integracion cognitiva que el cuerpo procesa sin que lo veas' },
      Theta: { banda: 'Beta',  hz: 20,   desc: 'Pensamiento analitico oculto bajo la creatividad visible' },
      Alpha: { banda: 'Theta', hz: 5.5,  desc: 'Procesamiento emocional profundo bajo la calma aparente' },
      Beta:  { banda: 'Alpha', hz: 10.5, desc: 'Estado de reposo que el sistema busca sin que lo sepas' },
      Gamma: { banda: 'Delta', hz: 2,    desc: 'Regeneracion celular que ocurre bajo el hiperenfoque' }
    };
  }
  _banda(hz) {
    for (const [n, r] of Object.entries(this.BANDAS))
      if (hz >= r.min && hz <= r.max) return n;
    return 'Alpha';
  }
  _inversa(hzObs) {
    const banda  = this._banda(hzObs);
    const rango  = this.BANDAS[banda];
    const fInv   = parseFloat((rango.max - (hzObs - rango.min)).toFixed(2));
    const centro = (rango.min + rango.max) / 2;
    const amp    = parseFloat((1 - Math.abs(hzObs - centro) / (rango.max - rango.min)).toFixed(3));
    return { hzObs, banda, fInversa: Math.max(0.5, fInv), amplitud: amp,
             energia: parseFloat((amp * Math.max(0.5, fInv)).toFixed(3)) };
  }
  escanear(datos) {
    const {
      frecuenciaActual = this.frecuenciaBase,
      ritmoCardiaco = 72, spo2 = 97,
      irritabilidad = 30, perfil = 'neurotipico'
    } = datos;
    const banda   = this._banda(frecuenciaActual);
    const inv     = this._inversa(frecuenciaActual);
    const contra  = this.CONTRAPARTE_MAP[banda];
    const fcHz    = parseFloat((ritmoCardiaco / 60).toFixed(3));
    const fcInvHz = parseFloat((1 / fcHz).toFixed(3));
    const coh     = parseFloat(Math.max(0,
      1 - Math.abs(frecuenciaActual - fcHz * 10) / frecuenciaActual
    ).toFixed(3));
    const resultado = {
      timestamp: Date.now(), perfil,
      senalObservable: {
        frecuenciaCerebral: frecuenciaActual, banda,
        estadoConsciente: this.BANDAS[banda].estado,
        ritmoCardiaco, ritmoCardiacoHz: fcHz, spo2, irritabilidad
      },
      contraparte: {
        frecuenciaInversa: inv.fInversa, bandaInversa: contra.banda,
        amplitud: inv.amplitud, energia: inv.energia, descripcion: contra.desc,
        frecuenciaCardiacaInversa: fcInvHz, coherenciaCerebroCorazon: coh,
        estadoOculto: this._estadoOculto(banda, irritabilidad)
      },
      mapa3D: this._mapa3D(frecuenciaActual, inv, coh)
    };
    this.sesiones.push(resultado);
    guardarJSON('contraparte.json', this.sesiones);
    return resultado;
  }
  _estadoOculto(banda, irr) {
    const m = {
      Delta: {
        bajo:  'Tu cuerpo regenera — decisiones que tu inconsciente ya tomo sin informarte',
        medio: 'Procesamiento emocional profundo activo',
        alto:  'Sistema sobrecargado — modo emergencia'
      },
      Theta: {
        bajo:  'Ideas madurando que aun no emergen a la conciencia',
        medio: 'Memorias de largo plazo siendo reintegradas',
        alto:  'Creatividad bloqueada por estres — la solucion existe pero no puede subir'
      },
      Alpha: {
        bajo:  "K'uhul activo — receptividad maxima, modo descarga del entorno",
        medio: 'Equilibrio consciente-inconsciente optimo',
        alto:  'El cuerpo busca reposo que la mente no le da'
      },
      Beta: {
        bajo:  'Pensamiento analitico eficiente',
        medio: 'Sistema busca cierre de ciclos abiertos',
        alto:  'Sobreactivacion — el sistema de alerta no puede apagarse'
      },
      Gamma: {
        bajo:  'Tu sistema conecta patrones que aun no ves',
        medio: 'Hiperconciencia activa — el filtro social esta bajando',
        alto:  'Sistema al limite de capacidad de integracion'
      }
    };
    const n = irr < 35 ? 'bajo' : irr < 65 ? 'medio' : 'alto';
    return m[banda]?.[n] || 'Frecuencia fuera de rango estandar';
  }
  _mapa3D(hzObs, inv, coh) {
    const radio = 5;
    const aO    = (hzObs / 100) * Math.PI * 2;
    const aI    = aO + Math.PI;
    return {
      nodos: [
        { id: 'observable',  label: `${hzObs} Hz (consciente)`,
          x: +(radio * Math.cos(aO)).toFixed(3), y: +(radio * Math.sin(aO)).toFixed(3),
          z: 0, radio: 1.2, color: '#3498DB', emite: true },
        { id: 'contraparte', label: `${inv.fInversa} Hz (inconsciente)`,
          x: +(radio * Math.cos(aI)).toFixed(3), y: +(radio * Math.sin(aI)).toFixed(3),
          z: 0, radio: +(0.8 + inv.amplitud).toFixed(3), color: '#9B59B6', emite: false },
        { id: 'coherencia',  label: `Coherencia ${(coh * 100).toFixed(0)}%`,
          x: 0, y: 0, z: +(coh * 3).toFixed(3),
          radio: +(0.5 + coh).toFixed(3), color: '#00ffc8', emite: false }
      ],
      aristas: [
        { origen: 'observable',  destino: 'coherencia',  grosor: coh,          color: '#3498DB' },
        { origen: 'contraparte', destino: 'coherencia',  grosor: inv.amplitud, color: '#9B59B6' },
        { origen: 'observable',  destino: 'contraparte', grosor: 0.2,          color: '#ffffff' }
      ],
      animacion: {
        velocidadRotacion: +(hzObs / 1000).toFixed(4),
        pulso: +(inv.fInversa / 50).toFixed(4),
        glow: inv.amplitud
      }
    };
  }
  evolucion() {
    if (this.sesiones.length < 2)
      return { mensaje: 'Se necesitan al menos 2 sesiones', total: this.sesiones.length };
    const p = this.sesiones[0];
    const u = this.sesiones[this.sesiones.length - 1];
    const dHz  = u.senalObservable.frecuenciaCerebral - p.senalObservable.frecuenciaCerebral;
    const dCoh = u.contraparte.coherenciaCerebroCorazon - p.contraparte.coherenciaCerebroCorazon;
    return {
      sesiones: this.sesiones.length,
      tendencias: {
        frecuencia: { cambio: +dHz.toFixed(2),  dir: dHz > 0 ? 'subiendo a Beta' : 'bajando a Delta' },
        coherencia: { cambio: +dCoh.toFixed(3), dir: dCoh > 0 ? 'mayor alineacion' : 'disonancia creciente' }
      },
      recomendacion: Math.abs(dHz) < 1
        ? { protocolo: 'Mantener',        hz: this.frecuenciaBase, desc: 'Sistema estable' }
        : dHz > 5
        ? { protocolo: 'Descenso Alpha',  hz: 10.5, desc: 'Inducir Alpha para integrar' }
        : { protocolo: 'Activacion Beta', hz: 18,   desc: 'Traer a superficie lo que esta en Theta' }
    };
  }
}

const moduloContraparte = new ModuloContraparteSOFI();

// ============================================================
//  CLASE: SOFI_Guiones
// ============================================================
class SOFI_Guiones {
  crearGuion(tema, duracionSeg = 60) {
    const plantillas = {
      'Tecnología':     `¡Hola! Soy SOFI. Hoy te muestro ${tema}...`,
      'Espiritualidad': `Exploramos juntos el poder de ${tema}...`,
      'Salud':          `Integra Perceptiva presenta: ${tema}...`,
      'default':        `¡Hola! Soy SOFI. Hablamos de ${tema}.`
    };
    const intro = plantillas[tema] || plantillas['default'];
    return {
      id:          `GUION-${Date.now()}`,
      tema,
      duracionSeg,
      secciones: [
        { tiempo: '0-5s',   contenido: intro },
        { tiempo: '5-30s',  contenido: `Desarrollo principal de ${tema}` },
        { tiempo: '30-50s', contenido: 'Demostracion practica' },
        { tiempo: '50-60s', contenido: 'Llamada a la accion — HaaPpDigitalV' }
      ],
      hashtags: ['#SOFI', '#IntegraPerceptiva', '#HaaPpDigitalV', `#${tema.replace(/\s/g, '')}`]
    };
  }
}

// ============================================================
//  CLASE: SOFI_EditorVideo
// ============================================================
class SOFI_EditorVideo {
  constructor() {
    this.nombre  = 'SOFI EDITORA DE VIDEO PROPIA';
    this.guiones = new SOFI_Guiones();
  }
  crearProyectoVideo(nombreProyecto, tipoContenido) {
    const guion = this.guiones.crearGuion(tipoContenido);
    const proyecto = {
      id:          `SOFI-VIDEO-${Date.now()}`,
      nombre:      nombreProyecto,
      tipo:        tipoContenido,
      guion,
      clips:       [],
      efectos:     [],
      musicaFondo: this._generarMusicaPropia(tipoContenido),
      estado:      'CREADO',
      creadoEn:    new Date().toISOString()
    };
    videosDB.push(proyecto);
    guardarJSON('videos.json', videosDB);
    return proyecto;
  }
  _generarMusicaPropia(estilo = 'Tecnológico') {
    const ritmos = {
      'Relajante':      { bpm: 60,  instrumentos: ['Sintetizador suave', 'Flauta digital'] },
      'Energético':     { bpm: 120, instrumentos: ['Bateria electronica', 'Bajos profundos'] },
      'Tecnológico':    { bpm: 95,  instrumentos: ['Secuenciador neuronal', 'Efectos 8-bit'] },
      'Espiritualidad': { bpm: 72,  instrumentos: ['Cuencos tibetanos', 'Armonias 432Hz'] }
    };
    const config = ritmos[estilo] || ritmos['Tecnológico'];
    return {
      nombre:       `SOFI-MUSICA-${estilo.toUpperCase()}`,
      bpm:          config.bpm,
      instrumentos: config.instrumentos,
      estructura:   ['Intro (0-5s)', 'Verso (5-20s)', 'Estribillo (20-35s)', 'Outro (35-45s)']
    };
  }
  cortarClip(clipId, tiempoInicio, tiempoFin) {
    return {
      clipEditado:   `SOFI-CLIP-${clipId}-[${tiempoInicio}-${tiempoFin}]`,
      duracionFinal: tiempoFin - tiempoInicio,
      estado:        'LISTO'
    };
  }
  unirClips(listaClips) {
    return {
      nombre:        'SOFI-VIDEO-UNIDO',
      clipsUsados:   listaClips.length,
      duracionTotal: listaClips.reduce((t, c) => t + (c.duracion || 0), 0),
      estado:        'UNIDO'
    };
  }
  aplicarEfecto(clipId, efecto) {
    const efectos = {
      'Iluminacion Neuronal': { descripcion: 'Resalta conexiones del grafo', codigo: 'SOFI-FX001' },
      'Transicion Suave':     { descripcion: 'Fade suave entre escenas',     codigo: 'SOFI-FX002' },
      'Zoom Cerebral':        { descripcion: 'Zoom a zona activa',           codigo: 'SOFI-FX003' },
      'Pulso 12.3Hz':         { descripcion: 'Efecto visual a 12.3 Hz',     codigo: 'SOFI-FX004' }
    };
    return {
      clipId,
      efectoAplicado: efectos[efecto] || { descripcion: efecto, codigo: 'SOFI-FX-XXX' },
      estado: 'EFECTO ACTIVADO'
    };
  }
  renderizarVideo(proyecto) {
    const tiempoEstimado = (proyecto.duracionTotal || 60) * 1.5;
    return {
      videoFinal:     `${proyecto.id}.mp4`,
      resolucion:     '1920x1080',
      formato:        'MP4',
      tiempoEstimado: `${tiempoEstimado}s`,
      estado:         'RENDERIZADO COMPLETO',
      marca:          'HaaPpDigitalV'
    };
  }
}

// ============================================================
//  CLASE: SOFI_ContenidoPropio (INTEGRADOR)
// ============================================================
class SOFI_ContenidoPropio {
  constructor() {
    this.video   = new SOFI_EditorVideo();
    this.guiones = new SOFI_Guiones();
    this.suenos  = sistemaSuenos;
  }
  crearTodoContenido(tema) {
    const guion = this.guiones.crearGuion(tema);
    const video = this.video.crearProyectoVideo(`VIDEO-${tema}`, tema);
    const sueno = this.suenos.crearSueno();
    return { guion, video, sueno, generadoEn: new Date().toISOString() };
  }
}

const contenidoSOFI = new SOFI_ContenidoPropio();

// ============================================================
//  MOTOR COGNITIVO (5 NIVELES)
// ============================================================
const NIVELES_COGNITIVOS = {
  1: 'reflejo', 2: 'rutina', 3: 'analisis', 4: 'razonamiento', 5: 'profundo'
};

function clasificarPregunta(mensaje) {
  const msg = mensaje.toLowerCase();
  if (/hola|bye|gracias|ok/.test(msg))              return 1;
  if (/qué|cuál|cuando|dónde/.test(msg))             return 2;
  if (/cómo|explica|describe|analiza/.test(msg))     return 3;
  if (/por qué|diferencia|compara|evalúa/.test(msg)) return 4;
  return 5;
}

function generarRespuestaMotor(mensaje, nivel) {
  const patron = mensaje.substring(0, 30);
  if (memoriaSOFI[patron]) {
    return { respuesta: memoriaSOFI[patron], fuenteMemoria: true };
  }
  const respuestas = {
    1: `Hola ${SOFI_USER}, soy SOFI. ¿En que te ayudo?`,
    2: `Procesando tu consulta sobre: "${mensaje.substring(0, 50)}..."`,
    3: `Analizando: "${mensaje.substring(0, 60)}..." — nivel ${NIVELES_COGNITIVOS[nivel]}`,
    4: `Razonamiento profundo activado para: "${mensaje.substring(0, 50)}..."`,
    5: `Modo profundo SOFI — procesando complejidad maxima.`
  };
  return { respuesta: respuestas[nivel] || respuestas[3], fuenteMemoria: false };
}

// ============================================================
//  BRAIN.JS — RED NEURONAL PREDICTIVA
// ============================================================
const redNeuronal = new brain.NeuralNetwork({ hiddenLayers: [8, 4] });
const datosBrainJS = [
  { input: { frecuencia: 0.8, irritabilidad: 0.2 }, output: { adaptacion: 0.9 } },
  { input: { frecuencia: 0.5, irritabilidad: 0.6 }, output: { adaptacion: 0.5 } },
  { input: { frecuencia: 0.3, irritabilidad: 0.9 }, output: { adaptacion: 0.2 } },
  { input: { frecuencia: 1.0, irritabilidad: 0.1 }, output: { adaptacion: 1.0 } },
  { input: { frecuencia: 0.6, irritabilidad: 0.4 }, output: { adaptacion: 0.7 } }
];
redNeuronal.train(datosBrainJS, { iterations: 2000, log: false });
console.log('🧠 brain.js entrenada correctamente');

// ============================================================
//  RUTAS EXPRESS
// ============================================================

// ─── HEALTH ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    estado:   '✅ SOFI ACTIVA',
    version:  'v4.1-UNIFICADO',
    modulos:  ['MotorCognitivo', 'IntegraPerceptiva', 'Suenos', 'EditorVideo',
               'GrafoCerebral', 'ContraparteFrecuencial', 'BrainJS', 'WebSockets'],
    marca:    'HaaPpDigitalV',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    sistema: 'SOFI v4.1 ACTIVA',
    marca:   'HaaPpDigitalV',
    autor:   'Victor Hugo Gonzalez Torres',
    frecuencia: DATOS_INTEGRA.frecuenciaBase + ' Hz',
    timestamp: new Date().toISOString()
  });
});

// ─── CHAT / MOTOR COGNITIVO ────────────────────────────────
app.post('/chat', verificarLlave, (req, res) => {
  const { mensaje, contexto } = req.body;
  if (!mensaje) return res.status(400).json({ error: 'mensaje requerido' });
  const nivel = clasificarPregunta(mensaje);
  const { respuesta, fuenteMemoria } = generarRespuestaMotor(mensaje, nivel);
  memoriaSOFI[mensaje.substring(0, 30)] = respuesta;
  guardarJSON('memoria.json', memoriaSOFI);
  res.json({ respuesta, nivel: NIVELES_COGNITIVOS[nivel], fuenteMemoria,
             contexto: contexto || 'chat_general', timestamp: Date.now() });
});

// ─── INTEGRA PERCEPTIVA ────────────────────────────────────
app.post('/integra/digitalizar', verificarLlave, (req, res) => {
  const { perfil = 'neurotipico', frecuencia } = req.body;
  const config   = PERFILES_SENSORIALES[perfil] || PERFILES_SENSORIALES.neurotipico;
  const hzActual = frecuencia || DATOS_INTEGRA.frecuenciaBase;
  res.json({
    perfil, frecuenciaRecibida: hzActual, rangoSeguro: config.rangoHz,
    estado: hzActual >= config.rangoHz[0] && hzActual <= config.rangoHz[1]
      ? '✅ EN RANGO SEGURO' : '⚠️ FUERA DE RANGO',
    descripcion: config.descripcion
  });
});

app.get('/integra/estado', verificarLlave, (req, res) => {
  res.json({
    frecuenciaBase:      DATOS_INTEGRA.frecuenciaBase,
    regeneracion:        DATOS_INTEGRA.regeneracion,
    dispositivosActivos: DATOS_INTEGRA.dispositivosConectados,
    grafoCerebral:       grafoCerebral.obtenerDatosPanel()
  });
});

app.get('/integra/perfil-sensorial-multi', verificarLlave, (req, res) => {
  res.json({ perfiles: PERFILES_SENSORIALES });
});

app.post('/integra/irritabilidad', verificarLlave, (req, res) => {
  const { indice = 50 } = req.body;
  const normalizado  = indice / 100;
  const ajusteHz     = DATOS_INTEGRA.frecuenciaBase * (1 - normalizado * 0.3);
  res.json({
    indiceRecibido:     indice,
    frecuenciaAjustada: parseFloat(ajusteHz.toFixed(2)),
    recomendacion: indice > 70 ? '🔴 Reducir estimulacion' : '🟢 Continuar protocolo'
  });
});

app.get('/integra/historial', verificarLlave, (req, res) => {
  res.json({ historial: cerebrosDB });
});

app.post('/integra/prediccion', verificarLlave, (req, res) => {
  const { frecuencia = 12.3, irritabilidad = 30 } = req.body;
  const input = {
    frecuencia:    Math.min(1, frecuencia / 15),
    irritabilidad: irritabilidad / 100
  };
  const resultado = redNeuronal.run(input);
  res.json({
    input:     { frecuencia, irritabilidad },
    prediccion: { adaptacion: parseFloat((resultado.adaptacion * 100).toFixed(1)) + '%' },
    modelo:    'brain.js-sofi-v4.1'
  });
});

// ─── SUENOS ────────────────────────────────────────────────
app.post('/suenos/detectar', verificarLlave, (req, res) => {
  res.json(sistemaSuenos.detectarSueno());
});

app.post('/suenos/mapear', verificarLlave, (req, res) => {
  const { elementos, descripcion } = req.body;
  if (!elementos || !Array.isArray(elementos))
    return res.status(400).json({ error: 'elementos[] requerido' });
  const mapa = sistemaSuenos.mapearSueno({ elementos, descripcion });
  suenosDB.push(mapa);
  guardarJSON('suenos.json', suenosDB);
  res.json({ mapa, guardado: true });
});

app.post('/suenos/generar', verificarLlave, (req, res) => {
  const sueno = sistemaSuenos.crearSueno();
  suenosDB.push(sueno);
  guardarJSON('suenos.json', suenosDB);
  res.json({ sueno, historialTotal: suenosDB.length });
});

app.get('/suenos/historial', verificarLlave, (req, res) => {
  res.json({ suenos: suenosDB, total: suenosDB.length });
});

// ─── VIDEO ─────────────────────────────────────────────────
app.post('/video/guion', verificarLlave, (req, res) => {
  const { tema, duracion } = req.body;
  if (!tema) return res.status(400).json({ error: 'tema requerido' });
  res.json({ guion: contenidoSOFI.guiones.crearGuion(tema, duracion) });
});

app.post('/video/preview', verificarLlave, (req, res) => {
  const { guionId } = req.body;
  res.json({ preview: `SOFI-PREVIEW-${guionId || Date.now()}`,
             estado: 'LISTO PARA REVISION', formato: 'MP4 360p' });
});

app.post('/video/crear', verificarLlave, (req, res) => {
  const { nombre, tipo = 'Tecnología' } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
  res.json({ proyecto: contenidoSOFI.video.crearProyectoVideo(nombre, tipo),
             estado: '✅ PROYECTO CREADO' });
});

app.post('/video/cortar', verificarLlave, (req, res) => {
  const { clipId, inicio = 0, fin = 30 } = req.body;
  if (!clipId) return res.status(400).json({ error: 'clipId requerido' });
  res.json(contenidoSOFI.video.cortarClip(clipId, inicio, fin));
});

app.post('/video/unir', verificarLlave, (req, res) => {
  const { clips = [] } = req.body;
  res.json(contenidoSOFI.video.unirClips(clips));
});

app.post('/video/efectos', verificarLlave, (req, res) => {
  const { clipId, efecto = 'Transicion Suave' } = req.body;
  res.json(contenidoSOFI.video.aplicarEfecto(clipId, efecto));
});

app.post('/video/renderizar', verificarLlave, (req, res) => {
  const { proyecto } = req.body;
  if (!proyecto) return res.status(400).json({ error: 'proyecto requerido' });
  res.json(contenidoSOFI.video.renderizarVideo(proyecto));
});

app.get('/video/lista', verificarLlave, (req, res) => {
  res.json({ videos: videosDB, total: videosDB.length });
});

// ─── CONTENIDO UNIFICADO ───────────────────────────────────
app.post('/contenido/crear-todo', verificarLlave, (req, res) => {
  const { tema = 'Tecnología' } = req.body;
  res.json({ paquete: contenidoSOFI.crearTodoContenido(tema),
             mensaje: '✅ Guion + Video + Sueno generados' });
});

// ─── GRAFO CEREBRAL ────────────────────────────────────────
app.get('/grafo/datos', verificarLlave, (req, res) => {
  res.json(grafoCerebral.obtenerDatosPanel());
});

app.post('/grafo/activar', verificarLlave, (req, res) => {
  const { zona } = req.body;
  if (!zona) return res.status(400).json({ error: 'zona requerida' });
  grafoCerebral.activarZona(zona);
  io.emit('actividad-zona', { zona, tiempo: new Date().toLocaleTimeString(),
                              datos: 'Activacion manual' });
  res.json({ zona, estado: '✅ ACTIVADA Y EMITIDA' });
});

// ─── CONTRAPARTE FRECUENCIAL ───────────────────────────────
app.post('/contraparte/escanear', verificarLlave, (req, res) => {
  const datos = req.body;
  if (!datos.frecuenciaActual && !datos.ritmoCardiaco)
    return res.status(400).json({ error: 'Se requiere frecuenciaActual o ritmoCardiaco' });
  res.json(moduloContraparte.escanear(datos));
});

app.get('/contraparte/evolucion', verificarLlave, (req, res) => {
  res.json(moduloContraparte.evolucion());
});

app.get('/contraparte/historial', verificarLlave, (req, res) => {
  res.json({ sesiones: moduloContraparte.sesiones, total: moduloContraparte.sesiones.length });
});

// ─── PANEL (público para Netlify) ─────────────────────────
app.get('/api/panel', (req, res) => {
  const hz = DATOS_INTEGRA.frecuenciaBase;
  res.json({
    frecuencia: hz,
    grafo:      grafoCerebral.obtenerDatosPanel(),
    contraparte: moduloContraparte.escanear({ frecuenciaActual: hz }),
    version:    'v4.1'
  });
});

// ─── BUSQUEDA ──────────────────────────────────────────────
app.post('/buscar', verificarLlave, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query requerido' });
  busquedasDB.push({ query, timestamp: Date.now() });
  guardarJSON('busquedas.json', busquedasDB);
  res.json({ query, fuente: 'DDG + Wikipedia',
             resultado: `Resultado simulado: "${query}" — conectar API real en produccion`,
             timestamp: Date.now() });
});

// ─── PRESENTADOR ───────────────────────────────────────────
app.get('/presentador', verificarLlave, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>SOFI — Presentador</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');
    body { margin:0; background:#0a0a1a; display:flex; align-items:center;
           justify-content:center; height:100vh; font-family:'Orbitron',sans-serif; }
    h1 { font-size:3rem; color:#3498DB;
         text-shadow:0 0 20px #3498DB, 0 0 40px #3498DB; animation:pulso 2s infinite; }
    p  { color:#2ECC71; font-size:1.2rem; }
    .hz { color:#9B59B6; font-size:2rem; margin-top:1rem; }
    @keyframes pulso {
      0%,100%{ text-shadow:0 0 20px #3498DB; }
      50%    { text-shadow:0 0 40px #3498DB, 0 0 80px #9B59B6; }
    }
  </style>
</head>
<body>
  <div style="text-align:center">
    <h1>🧠 SOFI</h1>
    <p>Sistema Operativo de Funciones Inteligentes</p>
    <div class="hz">12.3 Hz — Integra Perceptiva ACTIVA</div>
    <p style="margin-top:2rem;color:#F39C12">HaaPpDigitalV © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`);
});

// ─── CONOCIMIENTO (CRUD) ───────────────────────────────────
app.get('/conocimiento', verificarLlave, (req, res) => res.json({ conocimiento: conocimientoDB }));
app.post('/conocimiento', verificarLlave, (req, res) => {
  conocimientoDB.push({ ...req.body, id: Date.now() });
  guardarJSON('conocimiento.json', conocimientoDB);
  res.json({ ok: true, total: conocimientoDB.length });
});
app.delete('/conocimiento/:id', verificarLlave, (req, res) => {
  conocimientoDB = conocimientoDB.filter(k => k.id != req.params.id);
  guardarJSON('conocimiento.json', conocimientoDB);
  res.json({ ok: true });
});

// ─── NOTAS (CRUD) ──────────────────────────────────────────
app.get('/notas', verificarLlave, (req, res) => res.json({ notas: notasDB }));
app.post('/notas', verificarLlave, (req, res) => {
  notasDB.push({ ...req.body, id: Date.now() });
  guardarJSON('notas.json', notasDB);
  res.json({ ok: true, total: notasDB.length });
});
app.delete('/notas/:id', verificarLlave, (req, res) => {
  notasDB = notasDB.filter(n => n.id != req.params.id);
  guardarJSON('notas.json', notasDB);
  res.json({ ok: true });
});

// ─── CONFIG ────────────────────────────────────────────────
app.patch('/config', verificarLlave, (req, res) => {
  Object.assign(configSOFI, req.body);
  guardarJSON('config.json', configSOFI);
  res.json({ config: configSOFI, actualizado: true });
});
app.get('/config', verificarLlave, (req, res) => res.json(configSOFI));

// ─── MEMORIA ───────────────────────────────────────────────
app.delete('/memoria', verificarLlave, (req, res) => {
  memoriaSOFI = {};
  guardarJSON('memoria.json', memoriaSOFI);
  res.json({ ok: true, mensaje: '🧹 Memoria limpiada' });
});

// ─── FEEDBACK ─────────────────────────────────────────────
app.post('/feedback', verificarLlave, (req, res) => {
  const log = leerJSON('feedback.json', []);
  log.push({ ...req.body, timestamp: Date.now() });
  guardarJSON('feedback.json', log);
  res.json({ ok: true });
});

// ============================================================
//  SOCKET.IO — PANEL CEREBRAL 3D EN TIEMPO REAL
// ============================================================
const intervalosSocket = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  socket.on('validar-llave', (llave) => {
    if (llave !== SOFI_API_KEY) {
      socket.emit('panel-error', '❌ Llave incorrecta');
      return socket.disconnect();
    }
    socket.emit('panel-datos', {
      titulo:     'INTEGRA PERCEPTIVA — SOFI v4.1',
      seccion3D:  'MAPA CEREBRAL 3D',
      panelInfo:  grafoCerebral.obtenerDatosPanel(),
      conexiones: grafoCerebral.mostrarConexiones(),
      version:    'v4.1-UNIFICADO'
    });

    const intervalo = setInterval(() => {
      const zonas = ['Zona Motora', 'Zona Cognitiva', 'Zona Sensorial',
                     'Zona Limbica', 'Cortex Prefrontal', 'Sistema Reticular'];
      const zona = zonas[Math.floor(Math.random() * zonas.length)];
      const hz   = (DATOS_INTEGRA.frecuenciaBase + (Math.random() - 0.5) * 2).toFixed(2);
      socket.emit('actividad-zona', {
        zona, hz, tiempo: new Date().toLocaleTimeString(),
        datos: 'Actividad neuronal detectada'
      });
    }, 2000);
    intervalosSocket.set(socket.id, intervalo);
  });

  socket.on('contraparte-live', (datos) => {
    const resultado = moduloContraparte.escanear(datos);
    socket.emit('contraparte-datos', resultado);
    socket.emit('contraparte-mapa3D', resultado.mapa3D);
  });

  socket.on('sueno-detectar', () => {
    socket.emit('sueno-resultado', sistemaSuenos.detectarSueno());
  });

  socket.on('disconnect', () => {
    const intervalo = intervalosSocket.get(socket.id);
    if (intervalo) { clearInterval(intervalo); intervalosSocket.delete(socket.id); }
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// ============================================================
//  ARRANQUE
// ============================================================
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║   🧠 SOFI v4.1 UNIFICADO — HaaPpDigitalV             ║
  ║   Puerto   : ${PORT}                                    ║
  ║   API Key  : SOFI-VHGzTs-K1N-v4  (cambiar en .env)   ║
  ║   Módulos  : MotorCognitivo · IntegraPerceptiva       ║
  ║              Suenos · EditorVideo · GrafoCerebral     ║
  ║              ContraparteFrecuencial · BrainJS         ║
  ║              WebSockets · Seguridad                   ║
  ║   Rutas    : 30 endpoints activos                     ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, io, sistemaSuenos, contenidoSOFI, grafoCerebral, moduloContraparte };
