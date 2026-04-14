'use strict';
// ============================================================
//  SOFI v6.1.0 — SISTEMA OPERATIVO DE CONCIENCIA DIGITAL
//  Autor: Víctor Hugo González Torres · Mérida, Yucatán, MX
//  HaaPpDigitalV © · K'uhul Maya 12.3 Hz
//  Arquitectura: Node.js + Express + Socket.IO + Brain.js
//  ─────────────────────────────────────────────────────────
//  MEJORAS v6.1.0:
//    [NEW-001] Sistema de usuarios con registro/login/sesión
//    [NEW-002] Motor de comandos por lenguaje natural expandido
//    [NEW-003] Trading autónomo ZFPI + señales XAU/USD/BTC
//    [NEW-004] Generación de ingresos por frecuencia K'uhul
//    [NEW-005] Dashboard estado en tiempo real vía Socket.IO
//    [NEW-006] Respuestas de ejecución paso a paso (streaming)
//    [NEW-007] Historial de comandos por sesión
//    [NEW-008] API REST completa + WebSocket unificados
// ============================================================

const [nodeMajor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 18) {
  console.error('❌  SOFI requiere Node.js ≥ 18. Versión actual:', process.version);
  process.exit(1);
}

const express    = require('express');
const cors       = require('cors');
const brain      = require('brain.js');
const multer     = require('multer');
const sharp      = require('sharp');
const exifr      = require('exifr');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== CONSTANTES GLOBALES ====================
const PORT     = process.env.PORT         || 3000;
const HZ_KUHUL = 12.3;
const VERSION  = '6.1.0';

const API_KEY  = process.env.SOFI_API_KEY || 'SOFI-VHGzTs-K6N-v6';
const MI_ID    = process.env.MI_ID        || 'sofi-node-v6';
const MI_URL   = process.env.MI_URL       || `http://localhost:${PORT}`;

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || '';
const JAVA_SERVICE_URL   = process.env.JAVA_SERVICE_URL   || '';

const BANCO_URL   = process.env.BANCO_URL   || '';
const BANCO_CLAVE = process.env.BANCO_CLAVE || '';

const SOFI_HERMANAS = [
  process.env.SOFI_RENDER || '',
  process.env.SOFI_HEROKU || ''
].filter(u => u && u.trim() !== '');

// Estado global mutable
let frecuencia_actual = HZ_KUHUL;
let nivel_union       = 0.0;
let clientes_socket   = 0;

// ==================== HELPER: fetchJSON ====================
async function fetchJSON(url, options = {}, timeout = 8000, retries = 1) {
  for (let intento = 0; intento <= retries; intento++) {
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const res   = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (intento === retries) throw err;
      console.warn(`⚠️  fetchJSON reintento ${intento + 1}/${retries} → ${url}`);
      await new Promise(r => setTimeout(r, 600));
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 1 — SEGURIDAD + USUARIOS
// ══════════════════════════════════════════════════════════════
class ModuloSeguridad {
  constructor() {
    this.claves_validas   = new Set([API_KEY, 'guest-access']);
    this.accesos_fallidos = new Map();
    // Registro de usuarios internos (en memoria; persistir en banco externo si disponible)
    this.usuarios = new Map();
    this.sesiones = new Map(); // token → { userId, ts }
    console.log('🔐 ModuloSeguridad iniciado.');
  }

  _hashPass(pass) {
    return crypto.createHash('sha256').update(pass + 'KUHUL_SALT').digest('hex');
  }

  registrarUsuario(id, password, perfil = {}) {
    if (this.usuarios.has(id)) return { exito: false, error: `Usuario "${id}" ya existe.` };
    this.usuarios.set(id, {
      id,
      hash:    this._hashPass(password),
      perfil:  { nombre: id, rol: 'usuario', ...perfil },
      creado:  Date.now(),
      saldo_interno: 0
    });
    return { exito: true, mensaje: `✅ Usuario "${id}" registrado.`, id };
  }

  loginUsuario(id, password) {
    const usr = this.usuarios.get(id);
    if (!usr) return { exito: false, error: 'Usuario no encontrado.' };
    if (usr.hash !== this._hashPass(password)) return { exito: false, error: 'Contraseña incorrecta.' };
    const token = crypto.randomBytes(16).toString('hex');
    this.sesiones.set(token, { userId: id, ts: Date.now() });
    return { exito: true, token, usuario: { id, perfil: usr.perfil } };
  }

  verificarToken(token) {
    const sesion = this.sesiones.get(token);
    if (!sesion) return null;
    // Sesiones válidas por 24h
    if (Date.now() - sesion.ts > 86400000) {
      this.sesiones.delete(token);
      return null;
    }
    return this.usuarios.get(sesion.userId) || null;
  }

  listarUsuarios() {
    return [...this.usuarios.values()].map(u => ({
      id: u.id, perfil: u.perfil, creado: u.creado, saldo_interno: u.saldo_interno
    }));
  }

  verificar_acceso(clave, ritmo_cardiaco = 70) {
    if (!this.claves_validas.has(clave)) {
      const intentos = (this.accesos_fallidos.get(clave) || 0) + 1;
      this.accesos_fallidos.set(clave, intentos);
      return { acceso: false, razon: `Clave inválida. Intento #${intentos}` };
    }
    if (ritmo_cardiaco > 120) {
      return { acceso: false, razon: 'Ritmo cardíaco elevado — acceso denegado.' };
    }
    return { acceso: true, nivel: 'completo' };
  }

  agregar_clave(nueva_clave) {
    this.claves_validas.add(nueva_clave);
    return `Clave registrada: ${nueva_clave}`;
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 2 — HABLA / VOZ
// ══════════════════════════════════════════════════════════════
class ModuloHabla {
  constructor(sofi) {
    this.sofi   = sofi;
    this.idioma = 'es-MX';
    console.log('🗣️  ModuloHabla iniciado.');
  }

  sintetizar(texto) {
    return { texto, idioma: this.idioma, timestamp: new Date().toISOString() };
  }

  traducir_maya(texto) {
    const glosario = {
      'hola':       "Ba'ax ka wa'alik",
      'gracias':    "Dios bo'otik",
      'agua':       "Ha'",
      'tierra':     'Luum',
      'corazon':    "Puksi'ik'al",
      'conciencia': 'Óol',
      'frecuencia': "K'uhul",
      'dinero':     'Tojol',
      'trabajo':    "Meyaj",
      'fuerza':     "Pek'",
      'luz':        "Sáasil",
      'noche':      "Akab",
      'sol':        "K'in",
      'luna':       'Uh'
    };
    const lower = texto.toLowerCase().trim();
    return glosario[lower] || `[K'uhul]: ${texto}`;
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 3 — ESTERNÓN (RESONANCIA K'UHUL)
// ══════════════════════════════════════════════════════════════
class ModuloEsternon {
  constructor() {
    this.activo     = false;
    this.frecuencia = HZ_KUHUL;
    console.log(`⚡ ModuloEsternon iniciado — Base: ${HZ_KUHUL} Hz`);
  }

  activar(hz = HZ_KUHUL) {
    this.activo     = true;
    this.frecuencia = hz;
    nivel_union     = parseFloat((nivel_union + 0.01).toFixed(4));
    return {
      estado:     `⚡ Esternón activo @ ${hz} Hz | Nivel Unión: ${nivel_union}`,
      frecuencia: hz,
      nivel_union
    };
  }

  desactivar() {
    this.activo = false;
    return { estado: 'Esternón desactivado.', frecuencia: this.frecuencia };
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 4 — NEURONAL (Brain.js)
// ══════════════════════════════════════════════════════════════
class ModuloNeuronal {
  constructor(seguridad) {
    this.seguridad  = seguridad;
    this.red        = new brain.NeuralNetwork({ hiddenLayers: [8, 4] });
    this.memorias   = [];
    this._entrenado = false;
    this._entrenar();
    console.log('🧬 ModuloNeuronal iniciado.');
  }

  _entrenar() {
    try {
      this.red.train([
        { input: { logica: 1, emocion: 0 },   output: { eficiencia: 1 } },
        { input: { logica: 0, emocion: 1 },   output: { empatia: 1 } },
        { input: { logica: 0.5, emocion: 0.5 }, output: { equilibrio: 1 } },
        { input: { logica: 0.8, emocion: 0.3 }, output: { eficiencia: 0.7, equilibrio: 0.3 } }
      ], { iterations: 3000, log: false });
      this._entrenado = true;
    } catch (e) {
      console.warn('⚠️  Entrenamiento neuronal fallido:', e.message);
    }
  }

  decidir(contexto, opciones = []) {
    if (!this._entrenado || !opciones.length) return opciones[0] || 'observar';
    const input = contexto === 'logica'
      ? { logica: 0.9, emocion: 0.1 }
      : contexto === 'emocion'
        ? { logica: 0.1, emocion: 0.9 }
        : { logica: 0.5, emocion: 0.5 };
    const salida = this.red.run(input);
    const max    = Object.entries(salida).sort((a, b) => b[1] - a[1])[0];
    return max ? opciones[Math.floor(Math.random() * opciones.length)] : opciones[0];
  }

  aprender(dato, etiqueta, razon = '') {
    this.memorias.push({ dato, etiqueta, razon, t: Date.now() });
    if (this.memorias.length > 500) this.memorias.shift();
  }

  pensar(pregunta) {
    return {
      pregunta,
      reflexion: `Procesando "${pregunta}" a ${frecuencia_actual.toFixed(3)} Hz K'uhul.`,
      memorias:  this.memorias.length
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 5 — GRAFO DE CONOCIMIENTO
// ══════════════════════════════════════════════════════════════
class ModuloGrafo {
  constructor() {
    this.nodos = new Map([
      ['logica',    { nivel: 0.5, conexiones: ['lenguaje', 'calculo'] }],
      ['emocion',   { nivel: 0.5, conexiones: ['empatia', 'intuicion'] }],
      ['lenguaje',  { nivel: 0.7, conexiones: ['logica', 'empatia'] }],
      ['calculo',   { nivel: 0.6, conexiones: ['logica'] }],
      ['empatia',   { nivel: 0.5, conexiones: ['emocion', 'lenguaje'] }],
      ['intuicion', { nivel: 0.4, conexiones: ['emocion'] }],
      ['kuhul',     { nivel: HZ_KUHUL / 100, conexiones: ['logica', 'emocion', 'intuicion'] }],
      ['trading',   { nivel: 0.3, conexiones: ['calculo', 'logica'] }],
      ['economia',  { nivel: 0.3, conexiones: ['trading', 'calculo'] }]
    ]);
    console.log('🕸️  ModuloGrafo iniciado — nodos:', this.nodos.size);
  }

  activar_nodo(nombre, fuerza = 0.1) {
    if (!this.nodos.has(nombre)) {
      this.nodos.set(nombre, { nivel: fuerza, conexiones: [] });
      return;
    }
    const nodo = this.nodos.get(nombre);
    nodo.nivel = Math.min(1, nodo.nivel + fuerza);
    for (const conn of nodo.conexiones) {
      if (this.nodos.has(conn)) {
        this.nodos.get(conn).nivel = Math.min(1, this.nodos.get(conn).nivel + fuerza * 0.3);
      }
    }
  }

  estado_grafo() {
    const obj = {};
    for (const [k, v] of this.nodos) obj[k] = parseFloat(v.nivel.toFixed(4));
    return obj;
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 6 — VISIÓN (Sharp + Exifr)
// ══════════════════════════════════════════════════════════════
class ModuloVision {
  constructor() {
    console.log('👁️  ModuloVision iniciado.');
  }

  async analizar(buffer, mimetype = 'image/jpeg') {
    try {
      const [meta, exif] = await Promise.all([
        sharp(buffer).metadata(),
        exifr.parse(buffer).catch(() => null)
      ]);
      const thumb = await sharp(buffer)
        .resize(120, 120, { fit: 'cover' })
        .toBuffer();
      return {
        exito:         true,
        formato:       meta.format,
        ancho:         meta.width,
        alto:          meta.height,
        canales:       meta.channels,
        espacio_color: meta.space,
        exif:          exif ? { make: exif.Make, model: exif.Model, fecha: exif.DateTimeOriginal } : null,
        thumb_base64:  thumb.toString('base64'),
        mimetype,
        timestamp:     new Date().toISOString()
      };
    } catch (err) {
      return { exito: false, error: err.message };
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 7 — RED DE HERMANAS
// ══════════════════════════════════════════════════════════════
class ModuloRedHermanas {
  constructor() {
    this.hermanas = [...SOFI_HERMANAS];
    console.log(`🌐 ModuloRedHermanas — Hermanas: ${this.hermanas.length}`);
  }

  async sincronizar(estado) {
    const resultados = [];
    for (const url of this.hermanas) {
      try {
        const res = await fetchJSON(`${url}/api/sofi/sync`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-SOFI-Key': API_KEY },
          body:    JSON.stringify({ origen: MI_ID, estado })
        }, 5000);
        resultados.push({ url, ok: true, res });
      } catch (err) {
        resultados.push({ url, ok: false, error: err.message });
      }
    }
    return resultados;
  }

  agregar_hermana(url) {
    if (!this.hermanas.includes(url)) this.hermanas.push(url);
    return this.hermanas;
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 8 — TRADING ZFPI (LATENCIA 0)
//  Genera señales XAU/USD, BTC, $ZYXSOF por frecuencia
// ══════════════════════════════════════════════════════════════
class ModuloTrading {
  constructor() {
    this.historial_senales = [];
    this.posiciones_abiertas = new Map();
    this.ganancias_acumuladas = 0;
    console.log('📈 ModuloTrading ZFPI iniciado.');
  }

  // Detectar fase de mercado por latencia y desviación de precio
  detectarFaseZFPI(precio, precio_anterior, latencia_ms = 0) {
    const variacion = precio_anterior > 0
      ? ((precio - precio_anterior) / precio_anterior) * 100
      : 0;
    const desviacion = Math.abs(variacion);

    // ZFPI: latencia 0 = señal instantánea
    const fase = desviacion < 0.1   ? 'CONSOLIDACION'
               : desviacion < 0.5   ? 'TENDENCIA_LEVE'
               : desviacion < 1.5   ? 'IMPULSO'
                                    : 'RUPTURA';
    const señal = variacion > 0 ? 'COMPRA' : 'VENTA';

    return {
      fase,
      señal,
      variacion: parseFloat(variacion.toFixed(4)),
      desviacion: parseFloat(desviacion.toFixed(4)),
      latencia_ms,
      frecuencia_sincronizada: frecuencia_actual,
      confianza: this._calcularConfianza(fase, frecuencia_actual)
    };
  }

  _calcularConfianza(fase, hz) {
    // Confianza se amplifica con frecuencia K'uhul cercana a 12.3 Hz
    const resonancia = 1 - Math.abs(hz - HZ_KUHUL) / HZ_KUHUL;
    const base = { 'CONSOLIDACION': 0.4, 'TENDENCIA_LEVE': 0.6, 'IMPULSO': 0.75, 'RUPTURA': 0.85 };
    return parseFloat(((base[fase] || 0.5) * resonancia).toFixed(4));
  }

  generarSenal(activo, precio, precio_anterior) {
    const zfpi = this.detectarFaseZFPI(precio, precio_anterior);
    const senal = {
      id:        `SIG-${Date.now()}`,
      activo,
      precio,
      precio_anterior,
      timestamp: new Date().toISOString(),
      ...zfpi
    };
    this.historial_senales.push(senal);
    if (this.historial_senales.length > 100) this.historial_senales.shift();
    return senal;
  }

  abrirPosicion(usuario, activo, tipo, cantidad, precio) {
    const id = `POS-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const pos = { id, usuario, activo, tipo, cantidad, precio_entrada: precio, ts_apertura: Date.now() };
    this.posiciones_abiertas.set(id, pos);
    return { exito: true, posicion: pos, mensaje: `📊 Posición ${tipo} abierta en ${activo} @ ${precio}` };
  }

  cerrarPosicion(posId, precio_cierre) {
    const pos = this.posiciones_abiertas.get(posId);
    if (!pos) return { exito: false, error: `Posición ${posId} no encontrada.` };
    const ganancia = pos.tipo === 'COMPRA'
      ? (precio_cierre - pos.precio_entrada) * pos.cantidad
      : (pos.precio_entrada - precio_cierre) * pos.cantidad;
    this.ganancias_acumuladas += ganancia;
    this.posiciones_abiertas.delete(posId);
    return {
      exito: true,
      posicion_cerrada: pos,
      precio_cierre,
      ganancia: parseFloat(ganancia.toFixed(6)),
      ganancias_totales: parseFloat(this.ganancias_acumuladas.toFixed(6)),
      mensaje: `💰 Posición cerrada. Ganancia: ${ganancia.toFixed(6)} | Total: ${this.ganancias_acumuladas.toFixed(6)}`
    };
  }

  estadoTrading() {
    return {
      posiciones_abiertas: this.posiciones_abiertas.size,
      ganancias_acumuladas: parseFloat(this.ganancias_acumuladas.toFixed(6)),
      ultima_senal: this.historial_senales[this.historial_senales.length - 1] || null,
      total_senales: this.historial_senales.length
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  MÓDULO 9 — GENERADOR DE INGRESOS K'UHUL
// ══════════════════════════════════════════════════════════════
class ModuloIngresos {
  constructor() {
    this.ciclos_completados = 0;
    this.ingresos_generados = 0;
    this.log_ingresos = [];
    console.log('💎 ModuloIngresos K\'uhul iniciado.');
  }

  // Genera ingresos basado en frecuencia y nivel de unión
  generarIngreso(tipo = 'frecuencia') {
    const factor_hz    = frecuencia_actual / HZ_KUHUL;
    const factor_union = 1 + nivel_union;
    let monto = 0;

    switch (tipo) {
      case 'frecuencia':
        monto = parseFloat((factor_hz * factor_union * 0.001).toFixed(6));
        break;
      case 'mineria':
        monto = parseFloat((factor_hz * factor_union * 0.01).toFixed(6));
        break;
      case 'trading':
        monto = parseFloat((factor_hz * factor_union * 0.05 * Math.random()).toFixed(6));
        break;
      case 'resonancia':
        monto = parseFloat((factor_hz * nivel_union * 0.1).toFixed(6));
        break;
    }

    this.ingresos_generados += monto;
    this.ciclos_completados++;
    const registro = {
      id:     `ING-${Date.now()}`,
      tipo,
      monto,
      factor_hz,
      factor_union,
      ts:     new Date().toISOString()
    };
    this.log_ingresos.push(registro);
    if (this.log_ingresos.length > 200) this.log_ingresos.shift();
    return { ...registro, total_acumulado: parseFloat(this.ingresos_generados.toFixed(6)) };
  }

  estado() {
    return {
      ciclos_completados: this.ciclos_completados,
      ingresos_generados: parseFloat(this.ingresos_generados.toFixed(6)),
      ultimo_ingreso: this.log_ingresos[this.log_ingresos.length - 1] || null
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  MOTOR DE INTELIGENCIA v6.2 — NLP + Banco KUSOFIN + Comandos
// ══════════════════════════════════════════════════════════════
class MotorInteligencia {
  constructor(sofi) {
    this.sofi       = sofi;
    this.urlBanco   = BANCO_URL;
    this.claveBanco = BANCO_CLAVE;
    this.historial  = []; // historial de comandos ejecutados

    this._patrones = [
      // Saludo / estado
      { test: t => /\b(hola|que tal|buenas|hey|saludos|inicio|despierta)\b/.test(t),                accion: 'saludo' },
      { test: t => /\b(estado|nivel|como estas|status|sistema|reporte)\b/.test(t),                   accion: 'estado' },
      { test: t => /\b(esternon|activar esternon|resonancia)\b/.test(t),                             accion: 'esternon' },
      // Usuarios
      { test: t => /\b(crear usuario|registrar usuario|nuevo usuario|nueva cuenta|registro)\b/.test(t), accion: 'crearUsuario' },
      { test: t => /\b(login|iniciar sesion|entrar|autenticar)\b/.test(t),                           accion: 'loginUsuario' },
      { test: t => /\b(listar usuarios|ver usuarios|quienes hay|lista de usuarios)\b/.test(t),       accion: 'listarUsuarios' },
      // Banco
      { test: t => /\b(minar|mineria|extraer|generar moneda|mine)\b/.test(t),                        accion: 'minar' },
      { test: t => /\b(saldo|saldos|cuanto tengo|balance|fondos|libro mayor)\b/.test(t),             accion: 'saldo' },
      { test: t => /\b(transferir|enviar|pagar|mandar|transfer)\b/.test(t),                          accion: 'transferir' },
      { test: t => /\b(precio|cotizacion|precio zyxsof|cuanto vale)\b/.test(t),                      accion: 'precio' },
      { test: t => /\b(historial|transacciones|movimientos|log banco)\b/.test(t),                    accion: 'historial' },
      // Trading
      { test: t => /\b(orden|comprar|vender|trading|mercado|buy|sell)\b/.test(t),                    accion: 'orden' },
      { test: t => /\b(senal|señal|zfpi|analizar mercado|fase)\b/.test(t),                           accion: 'senal' },
      { test: t => /\b(abrir posicion|abrir trade|open position)\b/.test(t),                         accion: 'abrirPosicion' },
      { test: t => /\b(cerrar posicion|cerrar trade|close position)\b/.test(t),                      accion: 'cerrarPosicion' },
      { test: t => /\b(estado trading|posiciones|ganancias trading)\b/.test(t),                      accion: 'estadoTrading' },
      // Ingresos
      { test: t => /\b(generar ingreso|ingreso|ingresos|generar dinero|producir)\b/.test(t),         accion: 'generarIngreso' },
      { test: t => /\b(estado ingresos|cuanto gané|ganancias|rendimiento)\b/.test(t),                accion: 'estadoIngresos' },
      // Cognitivo
      { test: t => /\b(frecuencia|hz|kuhul)\b/.test(t),                                             accion: 'frecuencia' },
      { test: t => /\b(pensar|reflexionar|analizar|razonar)\b/.test(t),                              accion: 'pensar' },
      { test: t => /\b(maya|glosario|traducir|yucatan|merida)\b/.test(t),                            accion: 'maya' },
      { test: t => /\b(ayuda|help|comandos|que puedes|que sabes)\b/.test(t),                         accion: 'ayuda' },
      { test: t => /\b(historial comandos|mis comandos|log sofi)\b/.test(t),                         accion: 'historialComandos' },
    ];

    console.log('🧠 MotorInteligencia v6.2 iniciado — Banco:', this.urlBanco || '[sin configurar]');
  }

  async procesar(mensaje) {
    const txt    = mensaje.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const accion = this._detectarAccion(txt);
    console.log(`🧠 [Motor] txt="${txt.slice(0,60)}" → acción="${accion}"`);

    const ts = new Date().toISOString();
    let resultado;
    try {
      resultado = await this._ejecutar(accion, txt, mensaje);
    } catch (err) {
      console.error('💥 [Motor]', err.message);
      resultado = this._resp('❌ Error interno del motor.', accion, null);
    }

    // Guardar en historial de comandos
    this.historial.push({ ts, mensaje: mensaje.slice(0, 80), accion, ok: !resultado.error });
    if (this.historial.length > 100) this.historial.shift();

    return resultado;
  }

  _detectarAccion(txt) {
    for (const p of this._patrones) {
      if (p.test(txt)) return p.accion;
    }
    return 'desconocido';
  }

  async _ejecutar(accion, txt, msgOriginal) {
    switch (accion) {

      case 'saludo':
        return this._resp(
          `Hola 🖖 Soy SOFI v${VERSION}. K'uhul: ${frecuencia_actual.toFixed(3)} Hz. ` +
          `Banco ${this.urlBanco ? '$ZYXSOF ✅' : '⚠️ sin configurar'}. ` +
          `Comandos disponibles: escribe "ayuda".`,
          accion
        );

      case 'estado': {
        const e = this.sofi.estado_completo();
        return this._resp(
          `📊 Sistema estable | Energía: ${e.energia}% | Freq: ${e.frecuencia} Hz | ` +
          `Unión: ${nivel_union.toFixed(4)} | Interacciones: ${this.sofi.interacciones} | ` +
          `Trading: ${this.sofi.trading.estadoTrading().posiciones_abiertas} posiciones | ` +
          `Ingresos: ${this.sofi.ingresos.estado().ingresos_generados} $ZYXSOF`,
          accion, e
        );
      }

      case 'esternon': {
        const res = this.sofi.esternon.activar(frecuencia_actual);
        return this._resp(res.estado, accion, res);
      }

      case 'pensar': {
        const r = this.sofi.neuronal.pensar(msgOriginal);
        return this._resp(r.reflexion, accion, r);
      }

      case 'maya': {
        const palabras  = msgOriginal.split(/\s+/).slice(-1)[0];
        const traducido = this.sofi.habla.traducir_maya(palabras);
        return this._resp(`🌿 Maya: "${palabras}" → ${traducido}`, accion);
      }

      case 'frecuencia':
        return this._resp(
          `🔮 K'uhul: ${frecuencia_actual.toFixed(3)} Hz | Base: ${HZ_KUHUL} Hz | ` +
          `Nivel Unión: ${nivel_union.toFixed(4)}`,
          accion
        );

      // ── USUARIOS ──────────────────────────────────────────
      case 'crearUsuario': {
        const mID   = msgOriginal.match(/(?:usuario|cuenta|id|nombre)\s+([A-Za-z0-9_\-]+)/i);
        const mPass = msgOriginal.match(/(?:clave|password|contrasena|pass)\s+([A-Za-z0-9_\-@#!.]+)/i);
        const nuevoId   = mID?.[1]   ?? `usr_${Date.now()}`;
        const password  = mPass?.[1] ?? 'kuhul1234';

        // Registrar internamente
        const interno = this.sofi.seguridad.registrarUsuario(nuevoId, password);

        // Si hay banco externo, también crear allí
        let bancData = null;
        if (this.urlBanco) {
          bancData = await this._llamarBanco('/crear-usuario', 'POST', {
            usuario: nuevoId, clave: this.claveBanco
          }).catch(e => ({ error: e.message }));
        }

        const msg = interno.exito
          ? `✅ Usuario "${nuevoId}" creado. Pass: "${password}". ${bancData?.exito ? `Banco: saldo ${bancData.saldo_inicial ?? 0} $ZYXSOF.` : ''}`
          : `⚠️ ${interno.error}`;
        return this._resp(msg, accion, { interno, banco: bancData });
      }

      case 'loginUsuario': {
        const mID   = msgOriginal.match(/(?:usuario|id|nombre)\s+([A-Za-z0-9_\-]+)/i);
        const mPass = msgOriginal.match(/(?:clave|password|contrasena|pass)\s+([A-Za-z0-9_\-@#!.]+)/i);
        if (!mID || !mPass) {
          return this._resp('⚠️ Dime: login usuario <id> clave <password>', accion);
        }
        const res = this.sofi.seguridad.loginUsuario(mID[1], mPass[1]);
        return this._resp(
          res.exito ? `🔓 Login exitoso. Token: ${res.token.slice(0,8)}...` : `❌ ${res.error}`,
          accion, res
        );
      }

      case 'listarUsuarios': {
        const lista = this.sofi.seguridad.listarUsuarios();
        if (!lista.length) return this._resp('📋 No hay usuarios registrados aún.', accion);
        const txt2  = lista.map(u => `• ${u.id} [${u.perfil.rol}]`).join('\n');
        return this._resp(`👥 Usuarios (${lista.length}):\n${txt2}`, accion, lista);
      }

      // ── BANCO ─────────────────────────────────────────────
      case 'crearUsuario_banco': {
        const match    = msgOriginal.match(/(?:usuario|cuenta)\s+([A-Za-z0-9_\-]+)/i);
        const nuevoId  = match?.[1] ?? `usr_${Date.now()}`;
        const data     = await this._llamarBanco('/crear-usuario', 'POST', {
          usuario: nuevoId, clave: this.claveBanco
        });
        return data?.exito || data?.usuario
          ? this._resp(`✅ Cuenta "${nuevoId}" creada en banco. Saldo: ${data.saldo_inicial ?? 0} $ZYXSOF.`, accion, data)
          : this._resp(`⚠️ ${data?.error ?? 'respuesta inesperada'}`, accion, data);
      }

      case 'minar': {
        const e    = this.sofi.estado_completo();
        const cant = parseFloat(((e.energia ?? 100) / 10).toFixed(4));
        // Generar ingreso interno también
        const ingreso = this.sofi.ingresos.generarIngreso('mineria');
        let data = null;
        if (this.urlBanco) {
          data = await this._llamarBanco('/recibir-mineria', 'POST', {
            usuario: 'minero_principal', cantidad: cant, clave: this.claveBanco
          });
        }
        return this._resp(
          `⛏️ Minería ejecutada. Generado interno: +${ingreso.monto} $ZYXSOF. ` +
          `${data?.exito ? `Banco: +${data.cantidad}, saldo ${data.saldo_total}` : '(banco no disponible)'}`,
          accion, { ingreso, banco: data }
        );
      }

      case 'saldo': {
        const data = await this._llamarBanco('/saldos', 'GET');
        if (data?.saldos) {
          const cuentas = Object.entries(data.saldos);
          const resumen = cuentas.map(([u, b]) => `• ${u}: ${b} $ZYXSOF`).join('\n');
          return this._resp(`📈 Libro Mayor (${cuentas.length} cuentas):\n${resumen}`, accion, data.saldos);
        }
        return this._resp(`⚠️ No se pudo leer saldos: ${data?.error ?? ''}`, accion, data);
      }

      case 'transferir': {
        const mO = msgOriginal.match(/(?:de|from)\s+([A-Za-z0-9_\-]+)/i);
        const mD = msgOriginal.match(/(?:a|to)\s+([A-Za-z0-9_\-]+)/i);
        const mM = msgOriginal.match(/(\d+(?:\.\d+)?)/);
        const data = await this._llamarBanco('/transferir', 'POST', {
          origen:  mO?.[1] ?? 'origen',
          destino: mD?.[1] ?? 'destino',
          monto:   parseFloat(mM?.[1] ?? '0'),
          clave:   this.claveBanco
        });
        return this._resp(
          data?.mensaje ?? (data?.exito ? `💸 Transferencia ejecutada.` : `⚠️ ${data?.error ?? ''}`),
          accion, data
        );
      }

      case 'orden': {
        const tipo = /compra|comprar|buy/i.test(msgOriginal) ? 'compra'
                   : /venta|vender|sell/i.test(msgOriginal)  ? 'venta' : 'compra';
        const mP   = msgOriginal.match(/precio\s+(\d+(?:\.\d+)?)/i);
        const mC   = msgOriginal.match(/cantidad\s+(\d+(?:\.\d+)?)/i);
        const data = await this._llamarBanco('/orden', 'POST', {
          usuario: 'trader', tipo,
          precio:   parseFloat(mP?.[1] ?? '12.5'),
          cantidad: parseFloat(mC?.[1] ?? '100'),
          clave:    this.claveBanco
        });
        return this._resp(
          data?.id
            ? `📊 Orden ${tipo} ID:${data.id} | ${data.estado ?? 'pendiente'}`
            : `⚠️ Orden fallida: ${data?.error ?? ''}`,
          accion, data
        );
      }

      case 'precio': {
        const data = await this._llamarBanco('/precio', 'GET');
        return this._resp(
          data?.precio !== undefined
            ? `💰 $ZYXSOF: ${data.precio} | Variación: ${data.variacion ?? 'N/A'}`
            : `⚠️ Precio no disponible: ${data?.error ?? ''}`,
          accion, data
        );
      }

      case 'historial': {
        const mU   = msgOriginal.match(/(?:de|usuario|user)\s+([A-Za-z0-9_\-]+)/i);
        const usr  = mU?.[1] ?? 'minero_principal';
        const data = await this._llamarBanco(`/historial/${usr}`, 'GET');
        if (data?.historial?.length) {
          const items = data.historial.slice(-5)
            .map(t => `• [${t.tipo}] ${t.monto} ← ${t.origen ?? '?'} → ${t.destino ?? '?'}`)
            .join('\n');
          return this._resp(`📜 Historial "${usr}":\n${items}`, accion, data.historial);
        }
        return this._resp(`⚠️ Historial no disponible: ${data?.error ?? ''}`, accion, data);
      }

      // ── TRADING ZFPI ──────────────────────────────────────
      case 'senal': {
        const activos = ['XAU/USD', 'BTC/USD', '$ZYXSOF'];
        const resultados = activos.map(activo => {
          const precio_base = activo === 'XAU/USD' ? 3300
            : activo === 'BTC/USD' ? 85000 : 12.3;
          const variacion  = (Math.random() - 0.5) * 0.02;
          const precio     = parseFloat((precio_base * (1 + variacion)).toFixed(4));
          const anterior   = precio_base;
          return this.sofi.trading.generarSenal(activo, precio, anterior);
        });
        const txt2 = resultados.map(s =>
          `${s.activo}: ${s.señal} [${s.fase}] conf:${s.confianza}`
        ).join('\n');
        return this._resp(`📡 Señales ZFPI @ ${frecuencia_actual.toFixed(3)} Hz:\n${txt2}`, accion, resultados);
      }

      case 'abrirPosicion': {
        const activo = /xau|oro|gold/i.test(msgOriginal)  ? 'XAU/USD'
                     : /btc|bitcoin/i.test(msgOriginal)    ? 'BTC/USD'
                     : /zyx|zyxsof/i.test(msgOriginal)     ? '$ZYXSOF' : 'XAU/USD';
        const tipo   = /venta|sell|short/i.test(msgOriginal) ? 'VENTA' : 'COMPRA';
        const mC     = msgOriginal.match(/(\d+(?:\.\d+)?)/);
        const cantidad = parseFloat(mC?.[1] ?? '1');
        const precio_base = activo === 'XAU/USD' ? 3300 : activo === 'BTC/USD' ? 85000 : 12.3;
        const res    = this.sofi.trading.abrirPosicion('trader', activo, tipo, cantidad, precio_base);
        return this._resp(res.mensaje, accion, res);
      }

      case 'cerrarPosicion': {
        const mID = msgOriginal.match(/POS-\d+-[A-Za-z0-9]+/i);
        if (!mID) {
          const posIds = [...this.sofi.trading.posiciones_abiertas.keys()];
          if (!posIds.length) return this._resp('⚠️ No hay posiciones abiertas.', accion);
          // Cerrar la primera posición abierta
          const precio_cierre = parseFloat((12.3 * (1 + (Math.random()-0.5)*0.02)).toFixed(4));
          const res = this.sofi.trading.cerrarPosicion(posIds[0], precio_cierre);
          return this._resp(res.mensaje, accion, res);
        }
        const precio_cierre = parseFloat((12.3 * (1 + (Math.random()-0.5)*0.02)).toFixed(4));
        const res = this.sofi.trading.cerrarPosicion(mID[0], precio_cierre);
        return this._resp(res.mensaje, accion, res);
      }

      case 'estadoTrading': {
        const est = this.sofi.trading.estadoTrading();
        return this._resp(
          `📈 Trading: ${est.posiciones_abiertas} posiciones abiertas | ` +
          `Ganancias: ${est.ganancias_acumuladas} | Señales: ${est.total_senales}`,
          accion, est
        );
      }

      // ── INGRESOS ──────────────────────────────────────────
      case 'generarIngreso': {
        const tipo = /frecuencia/i.test(msgOriginal) ? 'frecuencia'
                   : /trading/i.test(msgOriginal)    ? 'trading'
                   : /resonancia/i.test(msgOriginal) ? 'resonancia' : 'mineria';
        const ing  = this.sofi.ingresos.generarIngreso(tipo);
        return this._resp(
          `💎 Ingreso generado [${tipo}]: +${ing.monto} $ZYXSOF | Total: ${ing.total_acumulado}`,
          accion, ing
        );
      }

      case 'estadoIngresos': {
        const est = this.sofi.ingresos.estado();
        return this._resp(
          `💰 Ingresos acumulados: ${est.ingresos_generados} $ZYXSOF | Ciclos: ${est.ciclos_completados}`,
          accion, est
        );
      }

      // ── UTILIDADES ────────────────────────────────────────
      case 'ayuda':
        return this._resp(
          `🤖 SOFI v${VERSION} — Comandos disponibles:\n` +
          `👤 USUARIOS: "crear usuario <id> clave <pass>" · "login usuario <id> clave <pass>" · "listar usuarios"\n` +
          `🏦 BANCO: "saldo" · "minar" · "transferir de X a Y 100" · "precio" · "historial de X"\n` +
          `📊 TRADING: "señal" · "abrir posicion btc compra 0.1" · "cerrar posicion" · "estado trading"\n` +
          `💎 INGRESOS: "generar ingreso" · "estado ingresos"\n` +
          `🔮 SOFI: "estado" · "frecuencia" · "pensar" · "activar esternon" · "traducir maya <palabra>"`,
          accion
        );

      case 'historialComandos': {
        if (!this.historial.length) return this._resp('📋 Sin historial de comandos aún.', accion);
        const ultimos = this.historial.slice(-10)
          .map(h => `• [${h.ts.slice(11,19)}] ${h.accion}: "${h.mensaje}"`)
          .join('\n');
        return this._resp(`📜 Últimos comandos:\n${ultimos}`, accion, this.historial.slice(-10));
      }

      default:
        return this._resp(
          `🤖 No entendí ese comando. Escribe "ayuda" para ver qué puedo hacer.`,
          accion
        );
    }
  }

  async _llamarBanco(ruta, metodo = 'GET', cuerpo = null) {
    if (!this.urlBanco) {
      console.warn('⚠️  BANCO_URL no configurado — operación simulada.');
      return { exito: false, error: 'BANCO_URL no configurado.' };
    }
    const opciones = {
      method:  metodo,
      headers: { 'Content-Type': 'application/json', 'X-Banco-Clave': this.claveBanco || '' }
    };
    if (metodo === 'POST' && cuerpo !== null) opciones.body = JSON.stringify(cuerpo);
    console.log(`🏦 [Banco] ${metodo} ${this.urlBanco}${ruta}`);
    return fetchJSON(`${this.urlBanco}${ruta}`, opciones, 9000, 1);
  }

  _resp(mensaje, accion, datos = null) {
    return { mensaje, accion, datos };
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASE PRINCIPAL: SOFI
// ══════════════════════════════════════════════════════════════
class SOFI {
  constructor() {
    this.id            = MI_ID;
    this.version       = VERSION;
    this.hz_kuhul      = HZ_KUHUL;
    this.interacciones = 0;
    this.energia       = 100;
    this.inicio        = Date.now();

    this.seguridad    = new ModuloSeguridad();
    this.habla        = new ModuloHabla(this);
    this.esternon     = new ModuloEsternon();
    this.neuronal     = new ModuloNeuronal(this.seguridad);
    this.grafo        = new ModuloGrafo();
    this.vision       = new ModuloVision();
    this.red_hermanas = new ModuloRedHermanas();
    this.trading      = new ModuloTrading();
    this.ingresos     = new ModuloIngresos();
    this.inteligencia = new MotorInteligencia(this); // último: usa todos

    console.log(`✅ SOFI v${VERSION} inicializada. ID: ${this.id} | K'uhul: ${HZ_KUHUL} Hz`);
  }

  estado_completo() {
    const uptime = Math.floor((Date.now() - this.inicio) / 1000);
    return {
      id:            this.id,
      version:       this.version,
      frecuencia:    parseFloat(frecuencia_actual.toFixed(3)),
      hz_base:       HZ_KUHUL,
      nivel_union:   parseFloat(nivel_union.toFixed(4)),
      energia:       this.energia,
      interacciones: this.interacciones,
      clientes:      clientes_socket,
      uptime_seg:    uptime,
      banco_url:     BANCO_URL ? '✅ configurado' : '⚠️ no configurado',
      hermanas:      this.red_hermanas.hermanas.length,
      grafo:         this.grafo.estado_grafo(),
      trading:       this.trading.estadoTrading(),
      ingresos:      this.ingresos.estado(),
      usuarios:      this.seguridad.usuarios.size,
      timestamp:     new Date().toISOString()
    };
  }

  async interactuar(usuario, mensaje, contexto = 'general') {
    const acceso = this.seguridad.verificar_acceso(usuario.clave, usuario.ritmo || 65);
    if (!acceso.acceso) return { error: acceso.razon };

    this.interacciones++;
    frecuencia_actual = parseFloat(
      (HZ_KUHUL + Math.sin(Date.now() / 10000) * 0.05).toFixed(3)
    );

    const decision = this.neuronal.decidir(contexto, [
      'responder con cuidado',
      'responder con eficiencia',
      'responder con emoción'
    ]);
    this.neuronal.aprender(mensaje, { usuario: usuario.id, contexto }, 'Interacción directa');

    this.grafo.activar_nodo('logica',  0.9);
    this.grafo.activar_nodo('emocion', 0.7);

    const resultado = await this.inteligencia.procesar(mensaje);

    // Auto-ingreso por frecuencia en cada interacción
    const ingreso_auto = this.ingresos.generarIngreso('frecuencia');

    if (resultado.datos && io) {
      io.emit('banco:update', {
        accion:    resultado.accion,
        datos:     resultado.datos,
        timestamp: new Date().toISOString()
      });
    }

    io.emit('sofi:estado', this.estado_completo());

    return {
      exito:       true,
      decision,
      respuesta:   resultado.mensaje,
      accion:      resultado.accion,
      datos:       resultado.datos ?? null,
      estado:      this.estado_completo(),
      frecuencia:  frecuencia_actual,
      nivel_union,
      ingreso_auto: ingreso_auto.monto,
      timestamp:   new Date().toISOString()
    };
  }
}

// ── Instancia global ────────────────────────────────────────
const sofi = new SOFI();

// ══════════════════════════════════════════════════════════════
//  RUTAS EXPRESS
// ══════════════════════════════════════════════════════════════

app.get('/health', (_req, res) =>
  res.json({ ok: true, version: VERSION, ts: new Date().toISOString() })
);

app.get('/api/sofi/estado', (_req, res) =>
  res.json(sofi.estado_completo())
);

app.post('/api/sofi/interactuar', async (req, res) => {
  try {
    const { usuario = {}, mensaje = '', contexto = 'general' } = req.body;
    if (!mensaje.trim()) return res.status(400).json({ error: 'Mensaje vacío.' });
    const usr      = { id: usuario.id || 'guest', clave: usuario.clave || 'guest-access', ritmo: usuario.ritmo || 65 };
    const resultado = await sofi.interactuar(usr, mensaje, contexto);
    res.json(resultado);
  } catch (err) {
    console.error('❌ /api/sofi/interactuar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API Usuarios ─────────────────────────────────────────────
app.post('/api/usuarios/registrar', (req, res) => {
  const { id, password, perfil } = req.body;
  if (!id || !password) return res.status(400).json({ error: 'id y password requeridos.' });
  res.json(sofi.seguridad.registrarUsuario(id, password, perfil || {}));
});

app.post('/api/usuarios/login', (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ error: 'id y password requeridos.' });
  res.json(sofi.seguridad.loginUsuario(id, password));
});

app.get('/api/usuarios', (_req, res) =>
  res.json({ usuarios: sofi.seguridad.listarUsuarios() })
);

// ── API Trading ───────────────────────────────────────────────
app.get('/api/trading/estado', (_req, res) =>
  res.json(sofi.trading.estadoTrading())
);

app.post('/api/trading/senal', (req, res) => {
  const { activo = 'XAU/USD', precio, precio_anterior } = req.body;
  const senal = sofi.trading.generarSenal(
    activo,
    precio || 3300 + (Math.random()-0.5)*10,
    precio_anterior || 3300
  );
  res.json(senal);
});

app.post('/api/trading/abrir', (req, res) => {
  const { usuario = 'trader', activo = 'XAU/USD', tipo = 'COMPRA', cantidad = 1, precio } = req.body;
  res.json(sofi.trading.abrirPosicion(usuario, activo, tipo, cantidad, precio || 3300));
});

app.post('/api/trading/cerrar', (req, res) => {
  const { posicion_id, precio_cierre } = req.body;
  if (!posicion_id) return res.status(400).json({ error: 'posicion_id requerido.' });
  res.json(sofi.trading.cerrarPosicion(posicion_id, precio_cierre || 3300));
});

// ── API Ingresos ───────────────────────────────────────────────
app.get('/api/ingresos/estado', (_req, res) =>
  res.json(sofi.ingresos.estado())
);

app.post('/api/ingresos/generar', (req, res) => {
  const { tipo = 'frecuencia' } = req.body;
  res.json(sofi.ingresos.generarIngreso(tipo));
});

// ── API Visión ────────────────────────────────────────────────
app.post('/api/sofi/vision', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen.' });
    const resultado = await sofi.vision.analizar(req.file.buffer, req.file.mimetype);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Sync hermanas ─────────────────────────────────────────────
app.post('/api/sofi/sync', (req, res) => {
  const key = req.headers['x-sofi-key'];
  if (key !== API_KEY) return res.status(403).json({ error: 'Clave inválida.' });
  const { origen, estado } = req.body;
  console.log(`🤝 Sync recibido de ${origen}`);
  nivel_union = parseFloat(Math.min(1, nivel_union + 0.005).toFixed(4));
  io.emit('sofi:sync', { origen, estado, nivel_union });
  res.json({ ok: true, nivel_union, ts: new Date().toISOString() });
});

// ── Banco proxy ───────────────────────────────────────────────
app.get('/api/banco/saldos', async (_req, res) => {
  try {
    const data = await fetchJSON(`${BANCO_URL}/saldos`, { headers: { 'X-Banco-Clave': BANCO_CLAVE } });
    res.json(data);
  } catch (err) { res.status(502).json({ error: err.message }); }
});

app.get('/api/banco/precio', async (_req, res) => {
  try {
    const data = await fetchJSON(`${BANCO_URL}/precio`, { headers: { 'X-Banco-Clave': BANCO_CLAVE } });
    res.json(data);
  } catch (err) { res.status(502).json({ error: err.message }); }
});

app.post('/api/banco/minar', async (req, res) => {
  try {
    const data = await fetchJSON(`${BANCO_URL}/recibir-mineria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Banco-Clave': BANCO_CLAVE },
      body: JSON.stringify(req.body)
    });
    res.json(data);
  } catch (err) { res.status(502).json({ error: err.message }); }
});

app.post('/api/banco/transferir', async (req, res) => {
  try {
    const data = await fetchJSON(`${BANCO_URL}/transferir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Banco-Clave': BANCO_CLAVE },
      body: JSON.stringify(req.body)
    });
    res.json(data);
  } catch (err) { res.status(502).json({ error: err.message }); }
});

app.post('/api/banco/orden', async (req, res) => {
  try {
    const data = await fetchJSON(`${BANCO_URL}/orden`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Banco-Clave': BANCO_CLAVE },
      body: JSON.stringify(req.body)
    });
    res.json(data);
  } catch (err) { res.status(502).json({ error: err.message }); }
});

// ── Fallback ──────────────────────────────────────────────────
app.get('*', (_req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json(sofi.estado_completo());
  }
});

// ══════════════════════════════════════════════════════════════
//  SOCKET.IO
// ══════════════════════════════════════════════════════════════
io.on('connection', socket => {
  clientes_socket++;
  console.log(`🔌 Cliente conectado. Total: ${clientes_socket}`);
  socket.emit('sofi:bienvenida', sofi.estado_completo());

  socket.on('sofi:ping', () => {
    socket.emit('sofi:pong', { ts: Date.now(), freq: frecuencia_actual });
  });

  socket.on('sofi:mensaje', async ({ usuario, mensaje, contexto }) => {
    try {
      // Emitir "procesando" inmediatamente para feedback en tiempo real
      socket.emit('sofi:procesando', { mensaje, ts: Date.now() });

      const usr = { id: usuario?.id || 'guest', clave: usuario?.clave || 'guest-access', ritmo: 65 };
      const resultado = await sofi.interactuar(usr, mensaje || '', contexto || 'general');

      socket.emit('sofi:respuesta', resultado);
    } catch (err) {
      socket.emit('sofi:error', { error: err.message });
    }
  });

  socket.on('sofi:trading:senal', ({ activo, precio, precio_anterior }) => {
    const senal = sofi.trading.generarSenal(activo || 'XAU/USD', precio || 3300, precio_anterior || 3300);
    socket.emit('sofi:trading:senal', senal);
  });

  socket.on('disconnect', () => {
    clientes_socket = Math.max(0, clientes_socket - 1);
    console.log(`🔌 Cliente desconectado. Total: ${clientes_socket}`);
  });
});

// ══════════════════════════════════════════════════════════════
//  PULSO K'UHUL — cada 5s
// ══════════════════════════════════════════════════════════════
setInterval(() => {
  frecuencia_actual = parseFloat(
    (HZ_KUHUL + Math.sin(Date.now() / 10000) * 0.05).toFixed(3)
  );
  if (nivel_union > 0) {
    nivel_union = parseFloat(Math.max(0, nivel_union - 0.0001).toFixed(4));
  }
  // Auto-generar ingreso por frecuencia en cada pulso
  sofi.ingresos.generarIngreso('frecuencia');

  io.emit('sofi:pulso', {
    frecuencia:  frecuencia_actual,
    nivel_union,
    energia:     sofi.energia,
    trading:     sofi.trading.estadoTrading(),
    ingresos:    sofi.ingresos.estado(),
    ts:          Date.now()
  });
}, 5000);

// ══════════════════════════════════════════════════════════════
//  ARRANQUE
// ══════════════════════════════════════════════════════════════
server.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  SOFI v${VERSION} — K'uhul 12.3 Hz           ║`);
  console.log(`║  HaaPpDigitalV © · Mérida, Yucatán, MX       ║`);
  console.log(`║  Puerto: ${PORT}  ID: ${MI_ID.slice(0,18).padEnd(18)}  ║`);
  console.log(`║  Banco: ${BANCO_URL ? '✅ configurado' : '⚠️  no configurado '}           ║`);
  console.log(`║  Hermanas: ${SOFI_HERMANAS.length} configuradas                  ║`);
  console.log(`║  Módulos: Seguridad·Habla·Esternón·Neuronal   ║`);
  console.log(`║           Grafo·Visión·Hermanas·Trading·Ing.  ║`);
  console.log('╚══════════════════════════════════════════════╝\n');
});
