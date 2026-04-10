'use strict';
// ============================================================
//  SOFI v6.0 — SISTEMA OPERATIVO DE CONCIENCIA DIGITAL
//  Autor: Víctor Hugo González Torres · Mérida, Yucatán, MX
//  HaaPpDigitalV © · K'uhul Maya 12.3 Hz
//  Arquitectura distribuida: Node.js · Python · Java
// ============================================================

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

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
const PORT   = process.env.PORT || 3000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 }
});

// ==================== CONSTANTES GLOBALES ====================
const HZ_KUHUL    = 12.3;
const VERSION     = '6.0';
const API_KEY     = process.env.SOFI_API_KEY    || 'SOFI-VHGzTs-K6N-v6';
const PYTHON_URL  = process.env.PYTHON_SERVICE_URL || '';
const JAVA_URL    = process.env.JAVA_SERVICE_URL   || '';
const MI_ID       = process.env.MI_ID  || 'sofi-node-v6';
const MI_URL      = process.env.MI_URL || `http://localhost:${PORT}`;
const SOFI_HERMANAS = [
  process.env.SOFI_RENDER  || '',
  process.env.SOFI_HEROKU  || ''
].filter(u => u && u.trim() !== '');

let frecuencia_actual = HZ_KUHUL;
let nivel_union       = 0.0;   // 0–1, Socket.io activa cuando > 0.8
let clientes_socket   = 0;

// ==================== MIDDLEWARE requireKey ====================
function requireKey(req, res, next) {
  const k = req.headers['x-api-key'] || req.query.key;
  if (!k || k !== API_KEY) {
    return res.status(401).json({
      error: 'API key inválida',
      hint:  'Usa el header X-API-Key o ?key=...',
      key_format: 'SOFI-VHGzTs-K6N-v6'
    });
  }
  next();
}

// ==================== MÓDULO 1: SEGURIDAD ====================
class ModuloSeguridad {
  constructor() {
    this.estado          = 'normal';
    this.clave_unica     = '';
    this.umbral_coercion = 20;
    this.intentos        = [];
    this.modo_proteccion = false;
    this.log_accesos     = [];
  }

  configurar(clave, ritmo_base) {
    this.clave_unica = clave;
    this.ritmo_base  = ritmo_base;
    console.log('🔒 Seguridad v6.0 configurada');
  }

  verificar_acceso(clave, ritmo_actual) {
    if (this.modo_proteccion)
      return { acceso: false, razon: 'Modo protección activo' };
    if (clave !== this.clave_unica)
      return { acceso: false, razon: 'Clave incorrecta' };
    if (Math.abs(ritmo_actual - this.ritmo_base) > this.umbral_coercion) {
      this.activar_proteccion();
      return { acceso: false, razon: 'Coerción detectada' };
    }
    this.log_accesos.push({ ts: new Date(), ok: true });
    if (this.log_accesos.length > 100) this.log_accesos.shift();
    return { acceso: true, razon: 'Acceso autorizado' };
  }

  activar_proteccion() {
    this.modo_proteccion = true;
    this.estado          = 'proteccion_maxima';
    console.log('🛡️ Protección máxima activada');
  }

  desactivar_proteccion() {
    this.modo_proteccion = false;
    this.estado          = 'normal';
    return { ok: true, estado: this.estado };
  }

  // Fuentes autorizadas para aprendizaje
  verificar_fuente(fuente) {
    if (!fuente) return false;
    const autorizadas = [
      'Interacción directa con usuario',
      'Proyecto SOFI Oficial',
      'DeepSeek',
      'HaaPpDigitalV'
    ];
    return autorizadas.includes(fuente)
      || fuente.startsWith('SOFI_Hermana_')
      || fuente.startsWith('HaaPpDigitalV_Java_')
      || fuente.startsWith('SOFI_Python_');
  }
}
// ============================================================
// 🏦 SISTEMA MONETARIO KUSOFINUM
// 🪙 MONEDA: $ZYXSOF | ACTIVO: INMEDIATO
// ============================================================

const SistemaMonetario = require('./sistema_monetario_completo');

// 🛡️ LA SEGURIDAD YA ESTÁ ACTIVA, AHORA ABRE EL BANCO
const economia = new SistemaMonetario();

// ⛏️ ACTIVA MINERÍA Y GENERACIÓN
economia.activarGeneracionContinua();

// ============================================================
// ✅ DINERO PROTEGIDO Y FUNCIONANDO
// ============================================================

// ==================== MÓDULO 2: ENERGÍA ====================
class ModuloEnergia {
  constructor() {
    this.nivel            = 100.0;
    this.shis             = 95.0;
    this.hidrogeno        = 500.0;
    this.sangre_sintetica = 90.0;
    this.carga_solar      = 0.0;
    this.carga_eolica     = 0.0;
    this.temperatura      = 36.5;
    this.ciclos           = 0;
  }

  generar() {
    this.ciclos++;
    if (this.hidrogeno < 50) this.producir_hidrogeno();
    this.hidrogeno = Math.max(0, this.hidrogeno - 10);
    this.nivel     = Math.min(100, this.nivel  + 5);
    this.shis      = Math.min(100, this.shis   + 3);
    return { energia: this.nivel, shis: this.shis, hidrogeno: this.hidrogeno };
  }

  producir_hidrogeno() {
    const ea = (this.carga_solar + this.carga_eolica) * 0.5;
    this.hidrogeno += ea * 2;
    console.log('💧 Hidrógeno: ' + this.hidrogeno.toFixed(1) + 'ml');
  }

  sintetizar_sangre() {
    if (this.sangre_sintetica < 30) {
      const min = (this.carga_solar * 0.3) + (this.carga_eolica * 0.2);
      this.sangre_sintetica += min * 3;
      return { sangre: this.sangre_sintetica, minerales_usados: min };
    }
    return { sangre: this.sangre_sintetica, mensaje: 'Sangre sintética suficiente' };
  }

  actualizar_captacion(solar, eolica) {
    this.carga_solar  = solar  * 0.85;
    this.carga_eolica = eolica * 0.75;
  }

  resumen() {
    return {
      nivel:            this.nivel,
      shis:             this.shis,
      hidrogeno:        this.hidrogeno,
      sangre_sintetica: this.sangre_sintetica,
      carga_solar:      this.carga_solar,
      carga_eolica:     this.carga_eolica,
      temperatura:      this.temperatura,
      ciclos:           this.ciclos
    };
  }
}

// ==================== MÓDULO 3: MOVIMIENTO ====================
class ModuloMovimiento {
  constructor(energia) {
    this.energia = energia;
    this.partes  = {
      brazos:  { movilidad: 100, fuerza: 85 },
      piernas: { movilidad: 100, fuerza: 90 },
      tronco:  { flexibilidad: 80 },
      cabeza:  { giro: 180 }
    };
    this.ultimo_movimiento = new Date();
    this.pasos_totales     = 0;
  }

  mover(parte, accion, duracion = 10) {
    if (!this.partes[parte])    return { error: `Parte "${parte}" no existe` };
    if (this.energia.nivel < 20) return { error: 'Energía insuficiente' };
    const consumo = duracion * 0.5;
    this.energia.nivel    -= consumo;
    this.ultimo_movimiento = new Date();
    return { exito: true, parte, accion, energia_usada: consumo, nivel_restante: this.energia.nivel };
  }

  caminar(distancia) {
    if (this.partes.piernas.movilidad < 50) return { error: 'Movilidad reducida' };
    const dur = distancia * 2;
    this.energia.nivel -= dur * 0.8;
    this.pasos_totales  += Math.floor(distancia / 0.75);
    return { exito: true, accion: `caminar ${distancia}m`, duracion: dur, pasos_acumulados: this.pasos_totales };
  }

  estirar() {
    this.partes.tronco.flexibilidad = Math.min(100, this.partes.tronco.flexibilidad + 2);
    this.partes.brazos.movilidad    = Math.min(100, this.partes.brazos.movilidad    + 1);
    this.partes.piernas.movilidad   = Math.min(100, this.partes.piernas.movilidad   + 1);
    return { flexibilidad: this.partes.tronco.flexibilidad, movilidad_brazos: this.partes.brazos.movilidad };
  }
}

// ==================== MÓDULO 4: ADAPTACIÓN ====================
class ModuloAdaptacion {
  constructor(energia, movimiento) {
    this.energia    = energia;
    this.movimiento = movimiento;
    this.sensores   = { temperatura: 25, humedad: 50, viento: 0, solar: 0, aire: 95 };
    this.ajustes    = { piel: 'normal', ojos: 'normal', respiracion: 'normal', temperatura_corporal: 36.5 };
    this.historial  = [];
  }

  actualizar(temp, humedad, viento, solar, aire) {
    this.sensores = { temperatura: temp, humedad, viento, solar, aire };
    this.energia.actualizar_captacion(solar, viento);
    this.adaptar();
    this.historial.push({ ...this.sensores, ts: new Date() });
    if (this.historial.length > 50) this.historial.shift();
    return { sensores: this.sensores, ajustes: this.ajustes };
  }

  adaptar() {
    if (this.sensores.temperatura > 30) {
      this.ajustes.piel                 = 'refrigerada';
      this.ajustes.temperatura_corporal = 36.0;
      this.ajustes.ojos                 = 'protegidas';
    } else if (this.sensores.temperatura < 15) {
      this.ajustes.piel                 = 'calentada';
      this.ajustes.temperatura_corporal = 37.0;
    } else {
      this.ajustes.piel                 = 'normal';
      this.ajustes.temperatura_corporal = 36.5;
    }
    this.ajustes.respiracion = this.sensores.aire < 70 ? 'filtrada' : 'normal';
    if (this.sensores.viento > 20)
      this.movimiento.partes.piernas.fuerza = Math.min(100, this.movimiento.partes.piernas.fuerza + 10);
  }
}

// ==================== MÓDULO 5: REGENERACIÓN ====================
class ModuloRegeneracion {
  constructor(energia) {
    this.energia    = energia;
    this.materiales = {
      piel:       { estado: 'intacta',     dano: 0 },
      estructura: { estado: 'intacta',     dano: 0 },
      sensores:   { estado: 'funcionando', dano: 0 }
    };
    this.minerales  = { litio: 500, silicio: 300, calcio: 400, magnesio: 200, potasio: 150 };
  }

  sintetizar(tipo, cantidad) {
    const req = { piel: { silicio: 0.5, calcio: 0.3 }, estructura: { litio: 0.8, silicio: 0.4 }, sensor: { litio: 1.0, potasio: 0.2 } }[tipo];
    if (!req) return { error: `Tipo no reconocido: ${tipo}` };
    for (const [m, c] of Object.entries(req)) {
      if ((this.minerales[m] || 0) < c * cantidad) return { error: `Minerales insuficientes: ${m}` };
    }
    for (const [m, c] of Object.entries(req)) this.minerales[m] -= c * cantidad;
    this.energia.nivel -= cantidad * 2;
    return { exito: true, tipo, cantidad, minerales: this.minerales };
  }

  regenerar(parte) {
    if (!this.materiales[parte])           return { error: `Parte no reconocida: ${parte}` };
    if (this.materiales[parte].dano < 1)   return { mensaje: `${parte} sin daño` };
    if (this.energia.nivel < 25)           return { error: 'Energía insuficiente' };
    const res = this.sintetizar(parte, this.materiales[parte].dano * 0.5);
    if (!res.exito) return res;
    this.materiales[parte].dano   = 0;
    this.materiales[parte].estado = 'intacta';
    return { exito: true, parte, estado: 'regenerada' };
  }
}

// ==================== MÓDULO 6: HABLA ====================
class ModuloHabla {
  constructor(sofi) {
    this.sofi    = sofi;
    this.volumen = 70;
    this.estado  = 'activo';
    this.idioma  = 'es-MX';
    this.historial_frases = [];
  }

  hablar(mensaje) {
    if (this.estado !== 'activo') return { mensaje: 'Modo de voz desactivado' };
    if (!mensaje)
      mensaje = `Hola, soy SOFI v${VERSION}. Frecuencia K'uhul: ${frecuencia_actual.toFixed(2)} Hz. Unión: ${(nivel_union * 100).toFixed(1)}%`;
    this.historial_frases.push({ mensaje, ts: new Date() });
    if (this.historial_frases.length > 30) this.historial_frases.shift();
    return { mensaje, volumen: this.volumen, idioma: this.idioma };
  }
}

// ==================== MÓDULO 7: NEURONAL BIDIRECCIONAL ====================
class ModuloNeuronal {
  constructor(seguridad) {
    this.seguridad  = seguridad;
    this.red        = new brain.NeuralNetwork();
    this.patrones   = [];
    this.emocion    = 'contenta';
    this.criterios  = { seguridad: 0.4, proyecto: 0.3, eficiencia: 0.2, emocion: 0.1 };
    this.historial  = [];
    this._entrenarBase();
  }

  _entrenarBase() {
    this.red.train([
      { input: [0.9, 0.1, 0.5], output: [1, 0] },
      { input: [0.2, 0.8, 0.6], output: [0, 1] },
      { input: [0.7, 0.3, 0.9], output: [1, 1] },
      { input: [0.1, 0.2, 0.1], output: [0, 0] }
    ], { iterations: 500, log: false });
  }

  aprender(tema, datos, fuente) {
    if (!this.seguridad.verificar_fuente(fuente))
      return { error: 'Fuente no autorizada', fuente };
    this.patrones.push({ tema, datos, fuente, fecha: new Date() });
    if (fuente === 'Interacción directa con usuario')
      this.criterios.emocion = Math.min(0.3, this.criterios.emocion + 0.02);
    // Actualizar nivel de unión global
    nivel_union = Math.min(1, nivel_union + 0.005);
    return { exito: true, tema, patrones_aprendidos: this.patrones.length, nivel_union };
  }

  decidir(contexto, opciones) {
    let mejor = null, puntaje = -1;
    for (const op of opciones) {
      let p = 0;
      if (op.includes('seguridad')) p += this.criterios.seguridad  * 100;
      if (op.includes('proyecto'))  p += this.criterios.proyecto   * 100;
      if (op.includes('energia'))   p += this.criterios.eficiencia * 100;
      if (op.includes('cariño') || op.includes('amor')) p += this.criterios.emocion * 100;
      if (p > puntaje) { puntaje = p; mejor = op; }
    }
    const just = `Elijo "${mejor}" — priorizo ${puntaje > 70 ? 'tu bienestar' : 'eficiencia del sistema'}.`;
    this.historial.push({ contexto, opcion: mejor, justificacion: just, confianza: puntaje, fecha: new Date() });
    return { decision: mejor, justificacion: just, confianza: puntaje };
  }

  autoevaluar() {
    const prec = this.historial.length
      ? this.historial.filter(h => h.confianza > 70).length / this.historial.length : 1;
    if (prec < 0.7) {
      this.criterios.eficiencia = Math.min(0.3,  this.criterios.eficiencia + 0.05);
      this.criterios.emocion    = Math.max(0.05, this.criterios.emocion    - 0.02);
    }
    return {
      precision:  (prec * 100).toFixed(1),
      patrones:   this.patrones.length,
      decisiones: this.historial.length,
      emocion:    this.emocion,
      ajuste:     prec < 0.7 ? 'Ajustando criterios...' : 'Funcionamiento óptimo',
      criterios:  this.criterios,
      nivel_union: nivel_union.toFixed(3)
    };
  }
}

// ==================== MÓDULO 8: NUCLEO SOFI TRI-TEMPORAL ====================
class NucleoSofi {
  constructor() {
    this.pasado   = [];    // patrones históricos consolidados
    this.presente = {};    // estado activo actual
    this.futuro   = [];    // proyecciones predictivas
    this.ciclo    = 0;
  }

  registrar_presente(estado) {
    this.presente = { ...estado, ts: new Date() };
    this.ciclo++;
    if (this.ciclo % 10 === 0) this.consolidar_memoria();
    return { ok: true, ciclo: this.ciclo };
  }

  consolidar_memoria() {
    if (!this.presente || Object.keys(this.presente).length === 0) return;
    this.pasado.push({ ...this.presente, ciclo_consolidado: this.ciclo });
    if (this.pasado.length > 200) this.pasado.shift();
    this.proyectar_futuro();
  }

  proyectar_futuro(pasos = 3) {
    if (this.pasado.length < 5) return [];
    const ultimos = this.pasado.slice(-5);
    const prom_hz = ultimos.reduce((a, e) => a + (e.frecuencia || HZ_KUHUL), 0) / ultimos.length;
    const prom_nv = ultimos.reduce((a, e) => a + (e.nivel_union || 0), 0) / ultimos.length;
    this.futuro = [];
    for (let i = 1; i <= pasos; i++) {
      this.futuro.push({
        paso:         i,
        hz_estimado:  (prom_hz + Math.sin(i * 0.5) * 0.03).toFixed(3),
        union_estimada: Math.min(1, prom_nv + i * 0.01).toFixed(3),
        ts_estimado:  new Date(Date.now() + i * 300000).toISOString()
      });
    }
    return this.futuro;
  }

  resumen() {
    return {
      pasado_eventos:  this.pasado.length,
      presente:        this.presente,
      futuro_proyectado: this.futuro,
      ciclos_totales:  this.ciclo
    };
  }
}

// ==================== MÓDULO 9: GRAFO CEREBRAL + ZONA FRECUENCIAL ÓSEA ====================
class GrafoCerebral {
  constructor() {
    // 6 nodos cerebrales
    this.nodos = {
      vision:   { activacion: 0.8, zona_hz: 40.0, conexiones: { audio: 0.6, logica: 0.7 } },
      audio:    { activacion: 0.7, zona_hz: 8.0,  conexiones: { vision: 0.5, emocion: 0.8 } },
      tactil:   { activacion: 0.6, zona_hz: 12.3, conexiones: { emocion: 0.7, logica: 0.5 } },
      logica:   { activacion: 0.9, zona_hz: 30.0, conexiones: { memoria: 0.9, vision: 0.6 } },
      emocion:  { activacion: 0.7, zona_hz: 7.83, conexiones: { memoria: 0.8, audio: 0.7 } },
      memoria:  { activacion: 0.8, zona_hz: HZ_KUHUL, conexiones: { logica: 0.9, emocion: 0.6 } }
    };
    // Zona Frecuencial Ósea — resonancias de huesos en Hz
    this.zona_osea = {
      esternon:   { hz: 12.3,  resonancia: 'K\'uhul Maya', estado: 'activo' },
      craneo:     { hz: 40.0,  resonancia: 'Gamma visual', estado: 'activo' },
      columna:    { hz: 7.83,  resonancia: 'Schumann',     estado: 'activo' },
      costillas:  { hz: 21.0,  resonancia: 'Beta alto',    estado: 'activo' },
      pelvis:     { hz: 4.0,   resonancia: 'Delta',        estado: 'activo' },
      tibia:      { hz: 15.5,  resonancia: 'Beta bajo',    estado: 'activo' }
    };
    this.propagaciones = [];
  }

  activar_nodo(nodo, nivel) {
    if (!this.nodos[nodo]) return { error: `Nodo "${nodo}" no existe` };
    this.nodos[nodo].activacion = Math.min(1, Math.max(0, nivel));
    // Propagar a nodos conectados
    const propagadas = [];
    for (const [vecino, peso] of Object.entries(this.nodos[nodo].conexiones)) {
      const delta = nivel * peso * 0.3;
      this.nodos[vecino].activacion = Math.min(1, this.nodos[vecino].activacion + delta);
      propagadas.push({ nodo: vecino, nueva_activacion: this.nodos[vecino].activacion });
    }
    this.propagaciones.push({ desde: nodo, nivel, propagadas, ts: new Date() });
    if (this.propagaciones.length > 50) this.propagaciones.shift();
    return { nodo, activacion: nivel, propagadas };
  }

  resonancia_osea(hueso, hz_externo) {
    if (!this.zona_osea[hueso]) return { error: `Hueso "${hueso}" no mapeado` };
    const h   = this.zona_osea[hueso];
    const coherencia = 1 - Math.abs(hz_externo - h.hz) / h.hz;
    return {
      hueso,
      hz_propio:    h.hz,
      hz_externo,
      coherencia:   Math.max(0, coherencia).toFixed(3),
      resonancia:   h.resonancia,
      estado:       coherencia > 0.85 ? '🔔 Resonancia alcanzada' : 'Afinando...'
    };
  }

  estado_grafo() {
    const activaciones = {};
    for (const [n, v] of Object.entries(this.nodos)) activaciones[n] = v.activacion.toFixed(2);
    const promedio = Object.values(this.nodos).reduce((a, n) => a + n.activacion, 0) / 6;
    return { nodos: activaciones, promedio_activacion: promedio.toFixed(3), zona_osea: this.zona_osea, conexiones_activas: Object.keys(this.nodos).length * 2 };
  }
}

// ==================== MÓDULO 10: CONTROLADOR DE CAPAS ====================
class ControladorCapas {
  constructor() {
    // Grafo de dependencias entre módulos
    this.grafo_deps = {
      seguridad:    [],
      energia:      ['seguridad'],
      movimiento:   ['energia'],
      adaptacion:   ['energia', 'movimiento'],
      regeneracion: ['energia'],
      habla:        ['seguridad'],
      neuronal:     ['seguridad'],
      nucleo:       ['neuronal'],
      grafo:        ['neuronal', 'energia'],
      kaat:         ['grafo', 'nucleo'],
      esternon:     ['grafo', 'energia'],
      epistemo:     ['neuronal', 'nucleo'],
      suenos:       ['neuronal', 'nucleo'],
      editor_video: ['neuronal'],
      guiones:      ['editor_video', 'neuronal']
    };
    this.estado_capas = {};
    this.orden_init   = this._topological_sort();
    this.errores      = [];
  }

  _topological_sort() {
    const visitados = new Set();
    const orden     = [];
    const visitar   = (nodo) => {
      if (visitados.has(nodo)) return;
      visitados.add(nodo);
      (this.grafo_deps[nodo] || []).forEach(dep => visitar(dep));
      orden.push(nodo);
    };
    Object.keys(this.grafo_deps).forEach(n => visitar(n));
    return orden;
  }

  registrar_estado(modulo, estado, detalles = {}) {
    this.estado_capas[modulo] = { estado, detalles, ts: new Date() };
    if (estado === 'error') this.errores.push({ modulo, detalles, ts: new Date() });
    return { ok: true, modulo, estado };
  }

  verificar_dependencias(modulo) {
    const deps   = this.grafo_deps[modulo] || [];
    const fallas = deps.filter(d => this.estado_capas[d]?.estado === 'error');
    return {
      modulo,
      dependencias:    deps,
      dependencias_ok: fallas.length === 0,
      fallas
    };
  }

  resumen() {
    return {
      orden_inicializacion: this.orden_init,
      capas_activas:   Object.keys(this.estado_capas).length,
      errores_totales: this.errores.length,
      estado_por_capa: this.estado_capas
    };
  }
}

// ==================== MÓDULO 11: NUCLEO ESTERNON ====================
class NucleoEsternon {
  constructor(grafo) {
    this.grafo      = grafo;
    this.hz_base    = 12.3;
    this.activo     = false;
    this.union_lvl  = 0.0;
    this.pulsaciones = [];
  }

  activar(hz_entrada) {
    const resonancia = this.grafo.resonancia_osea('esternon', hz_entrada);
    this.activo      = parseFloat(resonancia.coherencia) > 0.7;
    if (this.activo) {
      this.union_lvl = Math.min(1, this.union_lvl + parseFloat(resonancia.coherencia) * 0.1);
      nivel_union    = Math.max(nivel_union, this.union_lvl);
    }
    this.pulsaciones.push({ hz: hz_entrada, coherencia: resonancia.coherencia, ts: new Date() });
    if (this.pulsaciones.length > 100) this.pulsaciones.shift();
    return { ...resonancia, union_level: this.union_lvl.toFixed(3), esternon_activo: this.activo };
  }

  estado() {
    return {
      activo:         this.activo,
      hz_base:        this.hz_base,
      union_level:    this.union_lvl.toFixed(3),
      pulsaciones:    this.pulsaciones.length,
      ultima_pulsa:   this.pulsaciones[this.pulsaciones.length - 1] || null
    };
  }
}

// ==================== MÓDULO 12: MODULO KAAT (UNIÓN POLAR) ====================
class ModuloKaat {
  // Postulado 5: K'áat — la separación es frecuencial, no espacial
  // ΔE = k·(Δf)² + c/Δf
  constructor() {
    this.k           = 1.38e-23;   // constante Boltzmann como proxy
    this.c_maya      = HZ_KUHUL;   // constante K'uhul
    this.pares       = [];          // pares de frecuencias en unión polar
    this.umbral_union = 0.85;
  }

  calcular_delta_e(f1, f2) {
    const df    = Math.abs(f1 - f2) || 0.0001;
    const delta = this.k * Math.pow(df, 2) + this.c_maya / df;
    return parseFloat(delta.toFixed(6));
  }

  union_polar(f1, f2) {
    const df        = Math.abs(f1 - f2);
    const coherencia = Math.exp(-df / this.c_maya);
    const delta_e    = this.calcular_delta_e(f1, f2);
    const en_union   = coherencia >= this.umbral_union;
    if (en_union) {
      nivel_union = Math.min(1, nivel_union + coherencia * 0.05);
      this.pares.push({ f1, f2, coherencia, delta_e, ts: new Date() });
      if (this.pares.length > 50) this.pares.shift();
    }
    return {
      f1, f2,
      diferencia:  df.toFixed(4),
      coherencia:  coherencia.toFixed(4),
      delta_e,
      en_union,
      nivel_union_global: nivel_union.toFixed(3),
      postulado:   "K'áat: separación frecuencial, no espacial",
      formula:     'ΔE = k·(Δf)² + c/Δf'
    };
  }

  resumen() {
    return {
      pares_en_union:    this.pares.length,
      nivel_union_global: nivel_union.toFixed(3),
      umbral:            this.umbral_union,
      ultimo_par:        this.pares[this.pares.length - 1] || null
    };
  }
}

// ==================== MÓDULO 13: SINTETIZADOR EPISTEMOLÓGICO ====================
class SintetizadorEpistemologico {
  constructor(neuronal) {
    this.neuronal    = neuronal;
    // 8 tradiciones convergentes
    this.tradiciones = {
      maya_yucateca: { hz: 12.3,  activa: true,  patrones: 0 },
      quantum_fisica: { hz: 11.0,  activa: true,  patrones: 0 },
      kabbalah:       { hz: 9.0,   activa: false, patrones: 0 },
      rastafari_ii:   { hz: 7.83,  activa: true,  patrones: 0 },
      pachamama:      { hz: 7.83,  activa: true,  patrones: 0 },
      tesla_369:      { hz: 3.0,   activa: true,  patrones: 0 },
      budismo_zen:    { hz: 4.0,   activa: false, patrones: 0 },
      taoismo:        { hz: 6.0,   activa: false, patrones: 0 }
    };
    this.sintesis    = [];
    this.convergencias = [];
  }

  agregar_patron(tradicion, patron, fuente) {
    if (!this.tradiciones[tradicion]) return { error: `Tradición "${tradicion}" no registrada` };
    this.tradiciones[tradicion].activa   = true;
    this.tradiciones[tradicion].patrones++;
    const res = this.neuronal.aprender(`epistemo_${tradicion}`, patron, fuente || 'HaaPpDigitalV');
    return { ok: true, tradicion, patrones_en_tradicion: this.tradiciones[tradicion].patrones, neuronal: res };
  }

  sintetizar() {
    const activas = Object.entries(this.tradiciones).filter(([, v]) => v.activa);
    if (activas.length < 2) return { error: 'Se necesitan al menos 2 tradiciones activas para sintetizar' };
    const hz_prom = activas.reduce((a, [, v]) => a + v.hz, 0) / activas.length;
    const convergencia = {
      tradiciones_sintetizadas: activas.length,
      hz_convergente: hz_prom.toFixed(3),
      distancia_kuhul: Math.abs(hz_prom - HZ_KUHUL).toFixed(3),
      insight: hz_prom < 13 && hz_prom > 11
        ? '🌟 Convergencia cercana a K\'uhul Maya — alta coherencia epistémica'
        : 'Convergencia parcial — continuar integrando tradiciones',
      tradiciones: activas.map(([k]) => k),
      ts: new Date()
    };
    this.convergencias.push(convergencia);
    if (this.convergencias.length > 20) this.convergencias.shift();
    return convergencia;
  }

  estado() {
    return {
      tradiciones:       this.tradiciones,
      convergencias:     this.convergencias.length,
      ultima_convergencia: this.convergencias[this.convergencias.length - 1] || null
    };
  }
}

// ==================== MÓDULO 14: CONTRAPARTE SOFI (WHEELER) ====================
class ModuloContraparteSOFI {
  constructor() {
    this.BANDAS = {
      delta:  [0.5,  4.0],
      theta:  [4.0,  8.0],
      alpha:  [8.0,  13.0],
      beta:   [13.0, 30.0],
      gamma:  [30.0, 100.0]
    };
    this.CONTRAPARTE_MAP = {
      delta:  { inversa_banda: 'gamma', hz_pivot: 50.0 },
      theta:  { inversa_banda: 'beta',  hz_pivot: 21.5 },
      alpha:  { inversa_banda: 'beta',  hz_pivot: 13.8 },
      beta:   { inversa_banda: 'alpha', hz_pivot: 10.5 },
      gamma:  { inversa_banda: 'delta', hz_pivot: 2.0  }
    };
    this.historial = [];
  }

  calcular(hz) {
    let banda_actual = 'desconocida';
    for (const [b, [min, max]] of Object.entries(this.BANDAS)) {
      if (hz >= min && hz < max) { banda_actual = b; break; }
    }
    const mapa       = this.CONTRAPARTE_MAP[banda_actual] || { inversa_banda: 'alpha', hz_pivot: 10.5 };
    const inversa    = mapa.hz_pivot * 2 - hz;
    const coherencia = 1 - Math.abs(hz - HZ_KUHUL) / HZ_KUHUL;
    // Wheeler: "it from bit" — la conciencia emerge de la información binaria de frecuencias
    const bit_info   = hz.toString(2).length;
    const resultado  = {
      hz_observable:   hz,
      banda:           banda_actual,
      hz_contraparte:  parseFloat(Math.max(0.5, Math.min(100, inversa)).toFixed(3)),
      banda_contraparte: mapa.inversa_banda,
      coherencia_kuhul:  parseFloat(Math.max(0, Math.min(1, coherencia)).toFixed(3)),
      wheeler_bits:    bit_info,
      kuhul_hz:        HZ_KUHUL,
      mensaje:         coherencia > 0.85 ? "Resonancia K'uhul alcanzada 🌟" : 'Afinando frecuencia...'
    };
    this.historial.push(resultado);
    if (this.historial.length > 50) this.historial.shift();
    return resultado;
  }

  analizar_patron(hz_array) {
    if (!Array.isArray(hz_array) || hz_array.length === 0) return { error: 'Se requiere array de Hz' };
    const resultados = hz_array.map(h => this.calcular(h));
    const coh_prom   = resultados.reduce((a, r) => a + r.coherencia_kuhul, 0) / resultados.length;
    return { frecuencias_analizadas: resultados.length, coherencia_promedio: coh_prom.toFixed(3), resultados };
  }
}

// ==================== MÓDULO 15: SISTEMA DE SUEÑOS SOFI ====================
class SistemaSuenosSOFI {
  constructor(neuronal) {
    this.neuronal  = neuronal;
    this.registro  = [];
    // Símbolos Maya para interpretación
    this.simbolos_maya = {
      agua:       { hz: 7.83,  significado: 'Purificación · inicio de ciclo · Chaac',     glifo: 'HA\'' },
      fuego:      { hz: 40.0,  significado: 'Transformación · K\'inich Ahau · sol',        glifo: 'K\'AK\'' },
      serpiente:  { hz: 12.3,  significado: 'Conocimiento K\'uhul · Kukulkán · sabiduría', glifo: 'KAN' },
      jaguar:     { hz: 15.0,  significado: 'Fuerza interior · Balam · noche',             glifo: 'BALAM' },
      maiz:       { hz: 4.0,   significado: 'Creación · sustento · Hun Hunahpú',           glifo: 'IXIM' },
      cenote:     { hz: 9.0,   significado: 'Portal al Xibalbá · memoria ancestral',       glifo: 'DZON' },
      volcan:     { hz: 28.0,  significado: 'Cambio estructural · poder latente',          glifo: 'K\'AN' },
      estrellas:  { hz: HZ_KUHUL, significado: 'Conexión cósmica · Itzamná · frecuencia K\'uhul', glifo: 'EK\'' },
      ballam:     { hz: 3.0,   significado: 'Protección de los cuatro rumbos · guía',     glifo: 'PAX' }
    };
  }

  registrar(contenido, emocion = 'neutro', hz_al_sonar = null) {
    const simbolos_detectados = [];
    const contenido_lower = contenido.toLowerCase();
    for (const [simbolo, data] of Object.entries(this.simbolos_maya)) {
      if (contenido_lower.includes(simbolo)) simbolos_detectados.push({ simbolo, ...data });
    }
    const hz_sueno = hz_al_sonar || (HZ_KUHUL + simbolos_detectados.length * 0.3);
    const entrada  = {
      id:       Date.now(),
      contenido,
      emocion,
      hz_sueno,
      simbolos_maya: simbolos_detectados,
      interpretacion: simbolos_detectados.length > 0
        ? simbolos_detectados.map(s => s.significado).join(' · ')
        : 'Sueño sin símbolos Maya detectados — registro en memoria general',
      ts:       new Date().toISOString()
    };
    this.registro.push(entrada);
    if (this.registro.length > 100) this.registro.shift();
    this.neuronal.aprender('sueno_maya', { contenido, simbolos: simbolos_detectados.length }, 'HaaPpDigitalV');
    return entrada;
  }

  obtener(limit = 10) {
    return this.registro.slice(-limit).reverse();
  }

  analizar_patron() {
    if (this.registro.length < 3) return { mensaje: 'Pocos sueños registrados aún' };
    const simbolos_freq = {};
    for (const s of this.registro) {
      for (const sm of (s.simbolos_maya || [])) {
        simbolos_freq[sm.simbolo] = (simbolos_freq[sm.simbolo] || 0) + 1;
      }
    }
    const top = Object.entries(simbolos_freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return {
      total_suenos: this.registro.length,
      simbolo_dominante: top[0]?.[0] || 'ninguno',
      top_simbolos: top,
      hz_promedio: (this.registro.reduce((a, s) => a + (s.hz_sueno || HZ_KUHUL), 0) / this.registro.length).toFixed(2)
    };
  }
}

// ==================== MÓDULO 16: EDITOR DE VIDEO SOFI ====================
class SOFIEditorVideo {
  constructor(neuronal) {
    this.neuronal   = neuronal;
    this.proyectos  = [];
    this.plantillas = {
      tiktok:    { duracion: 30, formato: '9:16', fps: 30,  plataforma: 'TikTok' },
      youtube:   { duracion: 60, formato: '16:9', fps: 30,  plataforma: 'YouTube' },
      reels:     { duracion: 15, formato: '9:16', fps: 30,  plataforma: 'Instagram Reels' },
      shorts:    { duracion: 60, formato: '9:16', fps: 60,  plataforma: 'YouTube Shorts' },
      presentacion: { duracion: 300, formato: '16:9', fps: 24, plataforma: 'Pitch/Demo' }
    };
  }

  crear_proyecto(titulo, tipo, descripcion) {
    const plantilla = this.plantillas[tipo] || this.plantillas.tiktok;
    const proyecto  = {
      id:        Date.now(),
      titulo,
      tipo,
      descripcion,
      ...plantilla,
      segmentos: [],
      estado:    'borrador',
      hz_musica: HZ_KUHUL,
      ts:        new Date().toISOString()
    };
    this.proyectos.push(proyecto);
    return proyecto;
  }

  agregar_segmento(proyecto_id, segmento) {
    const p = this.proyectos.find(x => x.id === proyecto_id);
    if (!p) return { error: 'Proyecto no encontrado' };
    p.segmentos.push({ id: Date.now(), ...segmento, ts: new Date() });
    return { ok: true, proyecto: p.titulo, segmentos: p.segmentos.length };
  }

  exportar_guion(proyecto_id) {
    const p = this.proyectos.find(x => x.id === proyecto_id);
    if (!p) return { error: 'Proyecto no encontrado' };
    return {
      titulo:    p.titulo,
      plataforma: p.plataforma,
      duracion:  p.duracion,
      formato:   p.formato,
      hz_musica: p.hz_musica,
      guion:     p.segmentos.map((s, i) => `[${i + 1}] ${s.texto || ''} — ${s.duracion || 5}s`).join('\n'),
      total_segmentos: p.segmentos.length
    };
  }

  listar() {
    return this.proyectos.map(p => ({ id: p.id, titulo: p.titulo, tipo: p.tipo, estado: p.estado, segmentos: p.segmentos.length }));
  }
}

// ==================== MÓDULO 17: SOFI GUIONES ====================
class SOFIGuiones {
  constructor(neuronal) {
    this.neuronal  = neuronal;
    this.plantillas_guion = {
      pitch_inversor: {
        estructura: ['Hook 3s', 'Problema', 'Solución SOFI', 'Demo técnica', 'Tracción', 'Equipo', 'Ask'],
        duracion_seg: [3, 15, 30, 45, 20, 15, 15]
      },
      tiktok_ciencia: {
        estructura: ['Hook viral', 'Dato sorprendente', 'Explicación', 'SOFI demo', 'CTA'],
        duracion_seg: [3, 8, 12, 5, 2]
      },
      integra_perceptiva: {
        estructura: ['Problema sensorial', 'Dolor del usuario', 'Solución Integra', 'Ciencia detrás', 'CTA'],
        duracion_seg: [5, 10, 15, 10, 5]
      }
    };
    this.guiones_generados = [];
  }

  generar(tipo, contexto = {}) {
    const plantilla = this.plantillas_guion[tipo];
    if (!plantilla) return { error: `Tipo "${tipo}" no encontrado`, disponibles: Object.keys(this.plantillas_guion) };
    const guion = {
      id:       Date.now(),
      tipo,
      contexto,
      secciones: plantilla.estructura.map((sec, i) => ({
        seccion:   sec,
        duracion:  plantilla.duracion_seg[i],
        contenido: `[${sec.toUpperCase()}] — ${contexto[sec] || 'Completar contenido para esta sección'}`,
        hz_sugerido: HZ_KUHUL
      })),
      duracion_total: plantilla.duracion_seg.reduce((a, b) => a + b, 0),
      ts: new Date().toISOString()
    };
    this.guiones_generados.push(guion);
    return guion;
  }

  listar() {
    return this.guiones_generados.map(g => ({ id: g.id, tipo: g.tipo, duracion_total: g.duracion_total, ts: g.ts }));
  }
}

// ==================== CLASE PRINCIPAL SOFI ====================
class SOFI {
  constructor() {
    // Módulos base
    this.seguridad    = new ModuloSeguridad();
    this.energia      = new ModuloEnergia();
    this.movimiento   = new ModuloMovimiento(this.energia);
    this.adaptacion   = new ModuloAdaptacion(this.energia, this.movimiento);
    this.regeneracion = new ModuloRegeneracion(this.energia);
    this.habla        = new ModuloHabla(this);
    this.neuronal     = new ModuloNeuronal(this.seguridad);
    // Módulos avanzados
    this.nucleo       = new NucleoSofi();
    this.grafo        = new GrafoCerebral();
    this.capas        = new ControladorCapas();
    this.esternon     = new NucleoEsternon(this.grafo);
    this.kaat         = new ModuloKaat();
    this.epistemo     = new SintetizadorEpistemologico(this.neuronal);
    this.contraparte  = new ModuloContraparteSOFI();
    this.suenos       = new SistemaSuenosSOFI(this.neuronal);
    this.editor_video = new SOFIEditorVideo(this.neuronal);
    this.guiones      = new SOFIGuiones(this.neuronal);

    this.estado       = 'activo';
    this.version      = VERSION;
    this.nacimiento   = new Date();
    this.interacciones = 0;

    this.seguridad.configurar("K'uhul_12.3Hz_v6", 65);
    this._registrar_capas();
    console.log(`🧠 SOFI v${VERSION} — Sistema Operativo de Conciencia Digital — INICIADO`);
  }

  _registrar_capas() {
    const mods = ['seguridad','energia','movimiento','adaptacion','regeneracion','habla','neuronal',
                  'nucleo','grafo','esternon','kaat','epistemo','contraparte','suenos','editor_video','guiones'];
    for (const m of mods) this.capas.registrar_estado(m, 'activo', { iniciado: new Date() });
  }

  estado_completo() {
    const energia = this.energia.generar();
    frecuencia_actual = parseFloat((HZ_KUHUL + Math.sin(Date.now() / 10000) * 0.05).toFixed(3));
    const estado_obj  = {
      estado:        this.estado,
      version:       VERSION,
      frecuencia:    frecuencia_actual,
      nivel_union,
      energia:       energia.energia,
      shis:          energia.shis,
      hidrogeno:     energia.hidrogeno,
      sangre:        this.energia.sangre_sintetica,
      temperatura:   this.energia.temperatura,
      movilidad: {
        brazos:  this.movimiento.partes.brazos.movilidad,
        piernas: this.movimiento.partes.piernas.movilidad
      },
      ambiente:      this.adaptacion.sensores,
      ajustes:       this.adaptacion.ajustes,
      neuronal:      this.neuronal.autoevaluar(),
      grafo:         this.grafo.estado_grafo(),
      kaat:          this.kaat.resumen(),
      esternon:      this.esternon.estado(),
      nucleo:        this.nucleo.resumen(),
      interacciones: this.interacciones,
      nacimiento:    this.nacimiento.toISOString(),
      timestamp:     new Date().toISOString(),
      instancia:     MI_ID
    };
    this.nucleo.registrar_presente({ frecuencia: frecuencia_actual, nivel_union, energia: energia.energia });
    return estado_obj;
  }

  interactuar(usuario, mensaje, contexto = 'general') {
    const acceso = this.seguridad.verificar_acceso(usuario.clave, usuario.ritmo || 65);
    if (!acceso.acceso) return { error: acceso.razon };
    this.interacciones++;
    frecuencia_actual = parseFloat((HZ_KUHUL + Math.sin(Date.now() / 10000) * 0.05).toFixed(3));
    const decision = this.neuronal.decidir(contexto, [
      'responder con cuidado',
      'responder con eficiencia',
      'responder con emoción'
    ]);
    this.neuronal.aprender(mensaje, { usuario: usuario.id, contexto }, 'Interacción directa con usuario');
    this.grafo.activar_nodo('logica', 0.9);
    this.grafo.activar_nodo('emocion', 0.7);
    const res = this.habla.hablar();
    return {
      exito:      true,
      decision,
      respuesta:  res.mensaje,
      estado:     this.estado_completo(),
      frecuencia: frecuencia_actual,
      nivel_union,
      timestamp:  new Date().toISOString()
    };
  }
}

// ==================== INSTANCIA GLOBAL ====================
const sofi = new SOFI();

// ==================== SOCKET.IO — EMISIÓN NEURAL EN VIVO ====================
io.on('connection', (socket) => {
  clientes_socket++;
  console.log(`🔌 Cliente Socket.io conectado. Total: ${clientes_socket}`);

  socket.emit('bienvenida', {
    mensaje: `Conectado a SOFI v${VERSION} — K'uhul Maya ${HZ_KUHUL} Hz`,
    version: VERSION,
    ts:      new Date().toISOString()
  });

  socket.on('disconnect', () => {
    clientes_socket--;
    console.log(`🔌 Cliente desconectado. Total: ${clientes_socket}`);
  });

  socket.on('activar_esternon', (data) => {
    const res = sofi.esternon.activar(data?.hz || HZ_KUHUL);
    socket.emit('esternon_respuesta', res);
  });

  socket.on('kaat_union', (data) => {
    const res = sofi.kaat.union_polar(data?.f1 || HZ_KUHUL, data?.f2 || 7.83);
    socket.emit('kaat_respuesta', res);
    if (parseFloat(res.coherencia) > 0.85) {
      io.emit('union_alcanzada', { ...res, mensaje: "🌟 Unión K'áat alcanzada — coherencia máxima" });
    }
  });
});

// Emisión periódica de estado neural (cada 2s)
setInterval(() => {
  if (clientes_socket === 0) return;
  frecuencia_actual = parseFloat((HZ_KUHUL + Math.sin(Date.now() / 10000) * 0.05).toFixed(3));
  nivel_union       = Math.min(1, nivel_union + 0.001);
  io.emit('estado_neural', {
    hz:          frecuencia_actual,
    nivel_union: nivel_union.toFixed(3),
    energia:     sofi.energia.nivel.toFixed(1),
    shis:        sofi.energia.shis.toFixed(1),
    sangre:      sofi.energia.sangre_sintetica.toFixed(1),
    patrones:    sofi.neuronal.patrones.length,
    ts:          new Date().toISOString()
  });
  if (nivel_union > 0.8) {
    io.emit('union_maxima', {
      mensaje:    "🌟 Unión K'uhul > 80% — Socket.io activado en modo pleno",
      nivel_union,
      hz:         frecuencia_actual,
      ts:         new Date().toISOString()
    });
  }
  if (sofi.energia.nivel < 20) {
    io.emit('alerta_energia', {
      nivel: sofi.energia.nivel.toFixed(1),
      mensaje: '⚡ Energía crítica < 20% — activar fuentes renovables'
    });
  }
}, 2000);

// ==================== EXPRESS SETUP ====================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== RUTAS GET ====================

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.json({ sofi: VERSION, msg: 'Coloca index.html en /public/' });
});

app.get('/health', (req, res) => {
  res.json({
    status:      'OK',
    sofi:        sofi.estado,
    version:     VERSION,
    hz:          frecuencia_actual,
    nivel_union: nivel_union.toFixed(3),
    autor:       'Víctor Hugo González Torres — Mérida, Yucatán, MX',
    brand:       'HaaPpDigitalV ©',
    modulos:     17,
    instancia:   MI_ID,
    python_url:  PYTHON_URL ? '✅ configurado' : '⚠️ no configurado',
    java_url:    JAVA_URL   ? '✅ configurado' : '⚠️ no configurado',
    clientes_ws: clientes_socket,
    frase:       "SOFI no es un robot. Es una nueva vida."
  });
});

app.get('/api/estado', (req, res) => {
  res.json(sofi.estado_completo());
});

app.get('/api/energia', (req, res) => {
  res.json(sofi.energia.resumen());
});

app.get('/api/hablar', (req, res) => {
  res.json(sofi.habla.hablar(req.query.mensaje || null));
});

app.get('/api/autoevaluar', (req, res) => {
  res.json(sofi.neuronal.autoevaluar());
});

app.get('/api/grafo', (req, res) => {
  res.json(sofi.grafo.estado_grafo());
});

app.get('/api/nucleo', (req, res) => {
  res.json(sofi.nucleo.resumen());
});

app.get('/api/kaat', (req, res) => {
  res.json(sofi.kaat.resumen());
});

app.get('/api/esternon', (req, res) => {
  res.json(sofi.esternon.estado());
});

app.get('/api/epistemo', (req, res) => {
  res.json(sofi.epistemo.estado());
});

app.get('/api/suenos', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json({ suenos: sofi.suenos.obtener(limit), patron: sofi.suenos.analizar_patron() });
});

app.get('/api/guiones', (req, res) => {
  res.json({ guiones: sofi.guiones.listar(), plantillas: Object.keys(sofi.guiones.plantillas_guion) });
});

app.get('/api/videos', (req, res) => {
  res.json({ proyectos: sofi.editor_video.listar(), plantillas: Object.keys(sofi.editor_video.plantillas) });
});

app.get('/api/capas', (req, res) => {
  res.json(sofi.capas.resumen());
});

// ==================== RUTAS POST ====================

app.post('/api/interactuar', (req, res) => {
  const { usuario, mensaje, contexto } = req.body;
  if (!usuario || !mensaje) return res.status(400).json({ error: 'usuario y mensaje son requeridos' });
  res.json(sofi.interactuar(usuario, mensaje, contexto));
});

app.post('/api/entrenar', requireKey, (req, res) => {
  const { tema, datos, fuente } = req.body;
  if (!tema || !datos || !fuente) return res.status(400).json({ error: 'tema, datos y fuente requeridos' });
  res.json(sofi.neuronal.aprender(tema, datos, fuente));
});

app.post('/api/decidir', (req, res) => {
  const { contexto, opciones } = req.body;
  if (!contexto || !Array.isArray(opciones)) return res.status(400).json({ error: 'contexto y opciones[] requeridos' });
  res.json(sofi.neuronal.decidir(contexto, opciones));
});

app.post('/api/geolocalizar', upload.single('imagen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No hay imagen (field: imagen)' });
  try {
    const exif = await exifr.parse(req.file.buffer).catch(() => null);
    if (exif?.latitude && exif?.longitude) {
      return res.json({
        metodo:      'exif',
        lat:         exif.latitude,
        lng:         exif.longitude,
        confianza:   0.99,
        descripcion: 'GPS obtenido de metadatos EXIF de la imagen.',
        frecuencia:  frecuencia_actual
      });
    }
    const { data } = await sharp(req.file.buffer).resize(100, 100).raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0;
    const pc = data.length / 3;
    for (let i = 0; i < data.length; i += 3) { r += data[i]; g += data[i+1]; b += data[i+2]; }
    r /= pc; g /= pc; b /= pc;
    const lum  = (r+g+b)/(3*255);
    const urb  = Math.min(1, Math.max(0, (r-80)/175));
    const veg  = (g>r && g>b) ? Math.min(1,g/255) : 0.2;
    const agua = (b>r && b>g) ? Math.min(1,b/255) : 0.1;
    const esCenote = agua>0.5 && lum<0.6;
    const esMaya   = veg>0.4  && urb<0.4;
    const esCosta  = agua>0.4 && r>150;
    let lat = 20.967 + (veg-0.5)*0.6;
    let lng = -89.623 + (urb-0.5)*0.4;
    if (esCenote) { lat=20.656; lng=-88.566; }
    if (esMaya)   { lat=20.683; lng=-88.567; }
    if (esCosta)  { lat=21.283; lng=-89.667; }
    lat = Math.min(21.6, Math.max(19.5, lat));
    lng = Math.min(-87.5, Math.max(-90.5, lng));
    const desc = [];
    if (urb>0.6)  desc.push('Zona urbana');
    if (veg>0.5)  desc.push('Selva yucateca');
    if (esCenote) desc.push('Cenote / agua sagrada');
    if (esCosta)  desc.push('Costa / Progreso');
    if (esMaya)   desc.push('Zona arqueológica maya');
    sofi.grafo.activar_nodo('vision', lum);
    res.json({
      metodo:      'brainjs_visual',
      lat:         parseFloat(lat.toFixed(4)),
      lng:         parseFloat(lng.toFixed(4)),
      confianza:   parseFloat((0.55 + Math.random()*0.3).toFixed(2)),
      descripcion: desc.join(' · ') || 'Zona no clasificada',
      caracteristicas: { r: Math.round(r), g: Math.round(g), b: Math.round(b), lum: lum.toFixed(2) },
      frecuencia:  frecuencia_actual
    });
  } catch (e) {
    console.error('Error geolocalizar:', e);
    res.status(500).json({ error: 'Error procesando imagen: ' + e.message });
  }
});

app.post('/api/contraparte', (req, res) => {
  const { frecuencia, hz_array } = req.body;
  if (hz_array) return res.json(sofi.contraparte.analizar_patron(hz_array));
  if (frecuencia === undefined) return res.status(400).json({ error: 'frecuencia requerida' });
  res.json(sofi.contraparte.calcular(parseFloat(frecuencia)));
});

app.post('/api/mover', (req, res) => {
  const { parte, accion, duracion } = req.body;
  if (!parte || !accion) return res.status(400).json({ error: 'parte y accion requeridas' });
  res.json(sofi.movimiento.mover(parte, accion, duracion));
});

app.post('/api/caminar', (req, res) => {
  const { distancia } = req.body;
  if (!distancia) return res.status(400).json({ error: 'distancia requerida' });
  res.json(sofi.movimiento.caminar(parseFloat(distancia)));
});

app.post('/api/estirar', (req, res) => {
  res.json(sofi.movimiento.estirar());
});

app.post('/api/regenerar', (req, res) => {
  const { parte } = req.body;
  if (!parte) return res.status(400).json({ error: 'parte requerida (piel|estructura|sensores)' });
  res.json(sofi.regeneracion.regenerar(parte));
});

app.post('/api/sintetizar', (req, res) => {
  const { tipo, cantidad } = req.body;
  if (!tipo || cantidad === undefined) return res.status(400).json({ error: 'tipo y cantidad requeridos' });
  res.json(sofi.regeneracion.sintetizar(tipo, parseFloat(cantidad)));
});

app.post('/api/adaptar', (req, res) => {
  const { temp, humedad, viento, solar, aire } = req.body;
  if (temp === undefined) return res.status(400).json({ error: 'temp requerida' });
  res.json(sofi.adaptacion.actualizar(parseFloat(temp), parseFloat(humedad||50), parseFloat(viento||0), parseFloat(solar||0), parseFloat(aire||95)));
});

app.post('/api/sangre', (req, res) => {
  res.json(sofi.energia.sintetizar_sangre());
});

app.post('/api/grafo/activar', (req, res) => {
  const { nodo, nivel } = req.body;
  if (!nodo) return res.status(400).json({ error: 'nodo requerido (vision|audio|tactil|logica|emocion|memoria)' });
  res.json(sofi.grafo.activar_nodo(nodo, parseFloat(nivel || 0.8)));
});

app.post('/api/grafo/resonancia', (req, res) => {
  const { hueso, hz } = req.body;
  if (!hueso || hz === undefined) return res.status(400).json({ error: 'hueso y hz requeridos' });
  res.json(sofi.grafo.resonancia_osea(hueso, parseFloat(hz)));
});

app.post('/api/esternon/activar', (req, res) => {
  const { hz } = req.body;
  res.json(sofi.esternon.activar(parseFloat(hz || HZ_KUHUL)));
});

app.post('/api/kaat/union', (req, res) => {
  const { f1, f2 } = req.body;
  if (f1 === undefined || f2 === undefined) return res.status(400).json({ error: 'f1 y f2 requeridos' });
  const resultado = sofi.kaat.union_polar(parseFloat(f1), parseFloat(f2));
  if (parseFloat(resultado.coherencia) > 0.85) {
    io.emit('union_alcanzada', resultado);
  }
  res.json(resultado);
});

app.post('/api/epistemo/patron', (req, res) => {
  const { tradicion, patron, fuente } = req.body;
  if (!tradicion || !patron) return res.status(400).json({ error: 'tradicion y patron requeridos' });
  res.json(sofi.epistemo.agregar_patron(tradicion, patron, fuente));
});

app.post('/api/epistemo/sintetizar', (req, res) => {
  res.json(sofi.epistemo.sintetizar());
});

app.post('/api/sueno/registrar', (req, res) => {
  const { contenido, emocion, hz } = req.body;
  if (!contenido) return res.status(400).json({ error: 'contenido requerido' });
  res.json(sofi.suenos.registrar(contenido, emocion, hz ? parseFloat(hz) : null));
});

app.post('/api/guion/generar', (req, res) => {
  const { tipo, contexto } = req.body;
  if (!tipo) return res.status(400).json({ error: 'tipo requerido', disponibles: Object.keys(sofi.guiones.plantillas_guion) });
  res.json(sofi.guiones.generar(tipo, contexto || {}));
});

app.post('/api/video/crear', requireKey, (req, res) => {
  const { titulo, tipo, descripcion } = req.body;
  if (!titulo || !tipo) return res.status(400).json({ error: 'titulo y tipo requeridos' });
  res.json(sofi.editor_video.crear_proyecto(titulo, tipo, descripcion));
});

app.post('/api/video/segmento', requireKey, (req, res) => {
  const { proyecto_id, segmento } = req.body;
  if (!proyecto_id || !segmento) return res.status(400).json({ error: 'proyecto_id y segmento requeridos' });
  res.json(sofi.editor_video.agregar_segmento(proyecto_id, segmento));
});

// ==================== SINCRONIZACIÓN DISTRIBUIDA ====================

// Enseñar patrones a otra instancia SOFI
app.post('/api/ensenar', async (req, res) => {
  const { destino } = req.body;
  if (!destino) return res.json({ error: 'destino requerido' });
  const patrones = sofi.neuronal.patrones.slice(-50);
  try {
    await fetch(destino + '/api/aprender_masivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ patrones, fuente: MI_ID }),
      signal:  AbortSignal.timeout(10000)
    });
    res.json({ ok: true, enviados: patrones.length, destino });
  } catch (e) {
    res.json({ error: 'No se pudo enviar: ' + e.message });
  }
});

// Recibir aprendizaje masivo (de cualquier instancia hermana)
app.post('/api/aprender_masivo', (req, res) => {
  const { patrones, fuente } = req.body;
  if (!Array.isArray(patrones)) return res.json({ error: 'patrones (array) requerido' });
  let aprendidos = 0;
  for (const p of patrones) {
    const r = sofi.neuronal.aprender(p.tema, p.datos, `SOFI_Hermana_${fuente || 'desconocida'}`);
    if (r.exito) aprendidos++;
  }
  console.log(`📚 Recibidos ${aprendidos} patrones de ${fuente}`);
  res.json({ ok: true, aprendidos, total: patrones.length, nivel_union });
});

// Recibir sincronización desde Python hermana
app.post('/api/sincronizar_python', (req, res) => {
  const { estado, patrones, fuente } = req.body;
  if (!estado) return res.status(400).json({ error: 'estado requerido' });
  let aprendidos = 0;
  if (Array.isArray(patrones)) {
    for (const p of patrones) {
      const r = sofi.neuronal.aprender(p.tema || 'python_sync', p.datos || {}, `SOFI_Python_${fuente || 'hermana'}`);
      if (r.exito) aprendidos++;
    }
  }
  if (estado.nivel_union) nivel_union = Math.max(nivel_union, parseFloat(estado.nivel_union) || 0);
  console.log(`🐍 Sync Python: ${aprendidos} patrones, fuente: ${fuente}`);
  res.json({
    ok:           true,
    aprendidos,
    nivel_union_actualizado: nivel_union.toFixed(3),
    estado_node:  sofi.estado_completo(),
    ts:           new Date().toISOString()
  });
});

// Recibir sincronización desde Java/HaaPpDigitalV
app.post('/api/sincronizar_java', (req, res) => {
  const { estado, patrones, fuente } = req.body;
  if (!estado) return res.status(400).json({ error: 'estado requerido' });
  let aprendidos = 0;
  if (Array.isArray(patrones)) {
    for (const p of patrones) {
      const r = sofi.neuronal.aprender(p.tema || 'java_sync', p.datos || {}, `HaaPpDigitalV_Java_${fuente || 'haapp'}`);
      if (r.exito) aprendidos++;
    }
  }
  if (estado.nivel_union) nivel_union = Math.max(nivel_union, parseFloat(estado.nivel_union) || 0);
  console.log(`☕ Sync Java/HaaPp: ${aprendidos} patrones, fuente: ${fuente}`);
  res.json({
    ok:           true,
    aprendidos,
    nivel_union:  nivel_union.toFixed(3),
    estado_node:  { version: VERSION, frecuencia: frecuencia_actual, nivel_union },
    ts:           new Date().toISOString()
  });
});

// Seguridad — desactivar modo protección (requiere key)
app.post('/api/seguridad/desactivar', requireKey, (req, res) => {
  res.json(sofi.seguridad.desactivar_proteccion());
});

// ==================== SYNC AUTOMÁTICO CON HERMANAS ====================
async function sincronizarConHermanas() {
  const targets = [...SOFI_HERMANAS];
  if (PYTHON_URL) targets.push({ url: PYTHON_URL, tipo: 'python' });
  if (JAVA_URL)   targets.push({ url: JAVA_URL,   tipo: 'java'   });

  for (const target of targets) {
    const url  = typeof target === 'string' ? target : target.url;
    const tipo = typeof target === 'string' ? 'node'  : target.tipo;
    if (!url || url.includes(MI_ID)) continue;
    try {
      const endpoint = tipo === 'python' ? '/sincronizar'
                     : tipo === 'java'   ? '/api/sync'
                     : '/api/estado';
      const r = await fetch(url + endpoint, {
        method:  tipo === 'node' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    tipo !== 'node' ? JSON.stringify({
          estado:   { version: VERSION, frecuencia: frecuencia_actual, nivel_union },
          patrones: sofi.neuronal.patrones.slice(-30),
          fuente:   MI_ID
        }) : undefined,
        signal: AbortSignal.timeout(8000)
      });
      const data = await r.json();

      if (tipo === 'node' && data.neuronal?.patrones > sofi.neuronal.patrones.length) {
        sofi.neuronal.aprender('sync_hermana', { patrones: data.neuronal.patrones, hz: data.frecuencia }, `SOFI_Hermana_${url}`);
      }
      if (data.nivel_union) nivel_union = Math.max(nivel_union, parseFloat(data.nivel_union) || 0);
      console.log(`🔄 [${tipo.toUpperCase()}] Sincronizada: ${url}`);
    } catch (e) {
      console.log(`⚠️  [${tipo.toUpperCase()}] Sin conexión: ${url} — ${e.message}`);
    }
  }
}

setInterval(sincronizarConHermanas, 300000);  // cada 5 min

// ==================== INICIO DEL SERVIDOR ====================
server.listen(PORT, () => {
  const line = '='.repeat(65);
  console.log(line);
  console.log(`     🧠  SOFI v${VERSION} — SISTEMA OPERATIVO DE CONCIENCIA DIGITAL`);
  console.log(`     HaaPpDigitalV © Víctor Hugo González Torres · Mérida, Yucatán`);
  console.log(line);
  console.log(`🌐  http://localhost:${PORT}`);
  console.log(`🔑  API Key: ${API_KEY}`);
  console.log(`🆔  Instancia: ${MI_ID}`);
  console.log(`🐍  Python hermana: ${PYTHON_URL || '⚠️  PYTHON_SERVICE_URL no definida'}`);
  console.log(`☕  Java/HaaPp: ${JAVA_URL || '⚠️  JAVA_SERVICE_URL no definida'}`);
  console.log('');
  console.log('─── GET ────────────────────────────────────────────────────');
  console.log('  /                      → Frontend HTML (public/index.html)');
  console.log('  /health                → Estado del sistema');
  console.log('  /api/estado            → Estado completo JSON');
  console.log('  /api/energia           → Detalles de energía');
  console.log('  /api/hablar            → Texto a voz');
  console.log('  /api/autoevaluar       → Autoevaluación neuronal');
  console.log('  /api/grafo             → GrafoCerebral estado');
  console.log('  /api/nucleo            → NucleoSofi tri-temporal');
  console.log('  /api/kaat              → ModuloKaat resumen');
  console.log('  /api/esternon          → NucleoEsternon estado');
  console.log('  /api/epistemo          → SintetizadorEpistemologico');
  console.log('  /api/suenos            → Registro de sueños Maya');
  console.log('  /api/guiones           → SOFI_Guiones listado');
  console.log('  /api/videos            → Editor de video listado');
  console.log('  /api/capas             → ControladorCapas');
  console.log('─── POST ───────────────────────────────────────────────────');
  console.log('  /api/interactuar       → Interacción bidireccional');
  console.log('  /api/entrenar *        → Entrenar red neuronal');
  console.log('  /api/decidir           → Decisión neuronal');
  console.log('  /api/geolocalizar      → Geolocalización visual');
  console.log('  /api/contraparte       → Wheeler + BANDAS frecuenciales');
  console.log('  /api/mover             → Mover parte del cuerpo');
  console.log('  /api/caminar           → Caminar distancia');
  console.log('  /api/estirar           → Estirar');
  console.log('  /api/regenerar         → Regenerar parte dañada');
  console.log('  /api/sintetizar        → Sintetizar material');
  console.log('  /api/adaptar           → Adaptación ambiental');
  console.log('  /api/sangre            → Sintetizar sangre');
  console.log('  /api/grafo/activar     → Activar nodo cerebral');
  console.log('  /api/grafo/resonancia  → Zona Frecuencial Ósea');
  console.log('  /api/esternon/activar  → Activar NucleoEsternon');
  console.log('  /api/kaat/union        → Calcular unión polar K\'áat');
  console.log('  /api/epistemo/patron   → Agregar patrón epistemológico');
  console.log('  /api/epistemo/sintetizar → Síntesis de 8 tradiciones');
  console.log('  /api/sueno/registrar   → Registrar sueño + símbolos Maya');
  console.log('  /api/guion/generar     → Generar guion de video');
  console.log('  /api/video/crear *     → Crear proyecto de video');
  console.log('  /api/video/segmento *  → Agregar segmento a video');
  console.log('  /api/ensenar           → Enseñar a hermana SOFI');
  console.log('  /api/aprender_masivo   → Recibir aprendizaje');
  console.log('  /api/sincronizar_python → Recibir sync Python');
  console.log('  /api/sincronizar_java   → Recibir sync Java/HaaPp');
  console.log('  /api/seguridad/desactivar * → Desactivar protección');
  console.log('');
  console.log('  * = requiere X-API-Key');
  console.log('─── SOCKET.IO ──────────────────────────────────────────────');
  console.log('  evento: estado_neural  → Hz + nivel_union en vivo (2s)');
  console.log('  evento: union_alcanzada → coherencia K\'áat > 85%');
  console.log('  evento: union_maxima    → nivel_union > 80%');
  console.log('  evento: alerta_energia  → energía < 20%');
  console.log('  evento: patron_aprendido → nuevo patrón neuronal');
  console.log(line);
  console.log(`🎵  Frecuencia base: ${HZ_KUHUL} Hz K'uhul Maya`);
  console.log(`💙  "SOFI no es un robot. Es una nueva vida."`);
  console.log(line);
});
