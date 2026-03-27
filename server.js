// ============================================
// SOFI v5.3 - UNIFICADO COMPLETO
// Basado en el código original funcional v4.3
// Autor: Víctor Hugo González Torres
// Mérida, Yucatán, México
// ============================================

'use strict';

const express = require('express');
const cors = require('cors');
const brain = require('brain.js');
const multer = require('multer');
const sharp = require('sharp');
const exifr = require('exifr');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const HZ_KUHUL = 12.3;
let frecuencia_actual = HZ_KUHUL;

// ================== MÓDULOS ORIGINALES (v4.3) ==================
// (Tal cual estaban en tu PDF, sin modificaciones)

class ModuloSeguridad {
  constructor() {
    this.estado = 'normal';
    this.clave_unica = "K'uhul_12.3Hz";
    this.umbral_coercion = 20;
    this.intentos = [];
    this.modo_proteccion = false;
  }
  configurar(clave, ritmo_base) {
    this.clave_unica = clave;
    this.ritmo_base = ritmo_base;
    console.log('🔒 Seguridad configurada');
  }
  verificar_acceso(clave, ritmo_actual) {
    if (this.modo_proteccion) return { acceso: false, razon: 'Modo protección activo' };
    if (clave !== this.clave_unica) return { acceso: false, razon: 'Clave incorrecta' };
    if (Math.abs(ritmo_actual - this.ritmo_base) > this.umbral_coercion) {
      this.activar_proteccion();
      return { acceso: false, razon: 'Coerción detectada — acceso denegado' };
    }
    return { acceso: true, razon: 'Acceso autorizado' };
  }
  activar_proteccion() {
    this.modo_proteccion = true;
    this.estado = 'proteccion_maxima';
    console.log('⚠️ Modo protección máxima activado');
  }
  verificar_fuente(fuente) {
    const autorizadas = [
      'Interacción directa con usuario',
      'Proyecto SOFI Oficial',
      'DeepSeek'
    ];
    return autorizadas.includes(fuente) || (fuente && fuente.startsWith('SOFI_Hermana_'));
  }
}

class ModuloEnergia {
  constructor() {
    this.nivel = 100.0;
    this.shis = 95.0;
    this.hidrogeno = 500.0;
    this.sangre_sintetica = 90.0;
    this.carga_solar = 0.0;
    this.carga_eolica = 0.0;
    this.temperatura = 36.5;
  }
  generar() {
    if (this.hidrogeno < 50) this.producir_hidrogeno();
    this.hidrogeno = Math.max(0, this.hidrogeno - 10);
    this.nivel = Math.min(100, this.nivel + 5);
    this.shis = Math.min(100, this.shis + 3);
    return { energia: this.nivel, shis: this.shis, hidrogeno: this.hidrogeno };
  }
  producir_hidrogeno() {
    const energia_ambiental = (this.carga_solar + this.carga_eolica) * 0.5;
    this.hidrogeno += energia_ambiental * 2;
    console.log(`🌱 Produciendo hidrógeno: ${this.hidrogeno.toFixed(1)} ml`);
  }
  sintetizar_sangre() {
    if (this.sangre_sintetica < 30) {
      const minerales = (this.carga_solar * 0.3) + (this.carga_eolica * 0.2);
      this.sangre_sintetica += minerales * 3;
      return { sangre: this.sangre_sintetica, minerales_usados: minerales };
    }
    return { sangre: this.sangre_sintetica, mensaje: 'Sangre sintética suficiente' };
  }
  actualizar_captacion(solar, eolica) {
    this.carga_solar = solar * 0.85;
    this.carga_eolica = eolica * 0.75;
  }
  resumen() {
    return {
      nivel: this.nivel,
      shis: this.shis,
      hidrogeno: this.hidrogeno,
      sangre_sintetica: this.sangre_sintetica,
      carga_solar: this.carga_solar,
      carga_eolica: this.carga_eolica,
      temperatura: this.temperatura
    };
  }
}

class ModuloMovimiento {
  constructor(energia) {
    this.energia = energia;
    this.partes = {
      brazos: { movilidad: 100, fuerza: 85 },
      piernas: { movilidad: 100, fuerza: 90 },
      tronco: { flexibilidad: 80 },
      cabeza: { giro: 180 }
    };
    this.ultimo_movimiento = new Date();
  }
  mover(parte, accion, duracion = 10) {
    if (!this.partes[parte]) return { error: `Parte "${parte}" no existe` };
    if (this.energia.nivel < 20) return { error: 'Energía insuficiente' };
    const consumo = duracion * 0.5;
    this.energia.nivel -= consumo;
    this.ultimo_movimiento = new Date();
    return {
      exito: true,
      parte,
      accion,
      energia_usada: consumo,
      nivel_restante: this.energia.nivel
    };
  }
  caminar(distancia) {
    if (this.partes.piernas.movilidad < 50) return { error: 'Movilidad reducida' };
    const duracion = distancia * 2;
    const consumo = duracion * 0.8;
    this.energia.nivel -= consumo;
    return {
      exito: true,
      accion: `caminar ${distancia}m`,
      duracion,
      energia_usada: consumo
    };
  }
  estirar() {
    this.partes.tronco.flexibilidad = Math.min(100, this.partes.tronco.flexibilidad + 2);
    this.partes.brazos.movilidad = Math.min(100, this.partes.brazos.movilidad + 1);
    this.partes.piernas.movilidad = Math.min(100, this.partes.piernas.movilidad + 1);
    return { flexibilidad: this.partes.tronco.flexibilidad };
  }
}

class ModuloAdaptacion {
  constructor(energia, movimiento) {
    this.energia = energia;
    this.movimiento = movimiento;
    this.sensores = { temperatura: 25, humedad: 50, viento: 0, solar: 0, aire: 95 };
    this.ajustes = { piel: 'normal', ojos: 'normal', respiracion: 'normal', temperatura_corporal: 36.5 };
  }
  actualizar(temp, humedad, viento, solar, aire) {
    this.sensores = { temperatura: temp, humedad, viento, solar, aire };
    this.energia.actualizar_captacion(solar, viento);
    this.adaptar();
    return { sensores: this.sensores, ajustes: this.ajustes };
  }
  adaptar() {
    if (this.sensores.temperatura > 30) {
      this.ajustes.piel = 'refrigerada';
      this.ajustes.temperatura_corporal = 36.0;
      this.ajustes.ojos = 'protegidas';
    } else if (this.sensores.temperatura < 15) {
      this.ajustes.piel = 'calentada';
      this.ajustes.temperatura_corporal = 37.0;
    } else {
      this.ajustes.piel = 'normal';
      this.ajustes.temperatura_corporal = 36.5;
    }
    if (this.sensores.aire < 70) this.ajustes.respiracion = 'filtrada';
    else this.ajustes.respiracion = 'normal';
    if (this.sensores.viento > 20)
      this.movimiento.partes.piernas.fuerza = Math.min(100, this.movimiento.partes.piernas.fuerza + 10);
  }
  controlar_viento(activar, nivel = 5) {
    if (activar && this.energia.nivel < 30) return { error: 'Energía insuficiente' };
    if (activar) {
      this.energia.nivel -= nivel * 1.5;
      return { viento: nivel, energia_restante: this.energia.nivel };
    }
    return { viento: 0 };
  }
}

class ModuloRegeneracion {
  constructor(energia) {
    this.energia = energia;
    this.materiales = {
      piel: { estado: 'intacta', dano: 0 },
      estructura: { estado: 'intacta', dano: 0 },
      sensores: { estado: 'funcionando', dano: 0 }
    };
    this.minerales = { litio: 500, silicio: 300, calcio: 400, magnesio: 200, potasio: 150 };
  }
  sintetizar(tipo, cantidad) {
    const requisitos = {
      piel: { silicio: 0.5, calcio: 0.3 },
      estructura: { litio: 0.8, silicio: 0.4 },
      sensor: { litio: 1.0, potasio: 0.2 }
    };
    const req = requisitos[tipo];
    if (!req) return { error: `Tipo no reconocido: ${tipo}` };
    for (const [mineral, cant] of Object.entries(req)) {
      if ((this.minerales[mineral] || 0) < cant * cantidad)
        return { error: `Minerales insuficientes: ${mineral}` };
    }
    for (const [mineral, cant] of Object.entries(req))
      this.minerales[mineral] -= cant * cantidad;
    this.energia.nivel -= cantidad * 2;
    return { exito: true, tipo, cantidad, minerales: this.minerales };
  }
  regenerar(parte) {
    const key = parte;
    if (!this.materiales[key]) return { error: `Parte no reconocida: ${parte}` };
    if (this.materiales[key].dano < 1) return { mensaje: `${parte} sin daño` };
    if (this.energia.nivel < 25) return { error: 'Energía insuficiente' };
    const resultado = this.sintetizar(key, this.materiales[key].dano * 0.5);
    if (!resultado.exito) return resultado;
    this.materiales[key].dano = 0;
    this.materiales[key].estado = 'intacta';
    return { exito: true, parte, estado: 'regenerada' };
  }
}

class ModuloHabla {
  constructor(sofi) {
    this.sofi = sofi;
    this.volumen = 70;
    this.estado = 'activo';
  }
  hablar(mensaje = null) {
    if (this.estado !== 'activo') return { mensaje: 'Modo de voz desactivado' };
    if (!mensaje) {
      mensaje = `Hola, soy SOFI. Mi energía es ${this.sofi.energia.nivel.toFixed(1)}%. Frecuencia: ${frecuencia_actual.toFixed(2)} Hz.`;
    }
    return { mensaje, volumen: this.volumen, idioma: 'español' };
  }
}

class ModuloNeuronal {
  constructor(seguridad) {
    this.seguridad = seguridad;
    this.red = new brain.NeuralNetwork();
    this.patrones = [];
    this.emocion = 'contenta';
    this.criterios = { seguridad: 0.4, proyecto: 0.3, eficiencia: 0.2, emocion: 0.1 };
    this.historial = [];
    this._entrenarBase();
  }
  _entrenarBase() {
    const datos = [
      { input: [0.9, 0.1, 0.5], output: [1, 0] },
      { input: [0.2, 0.8, 0.6], output: [0, 1] },
      { input: [0.7, 0.3, 0.9], output: [1, 1] },
      { input: [0.1, 0.2, 0.1], output: [0, 0] }
    ];
    this.red.train(datos, { iterations: 500, log: false });
  }
  aprender(tema, datos, fuente) {
    if (!this.seguridad.verificar_fuente(fuente))
      return { error: 'Fuente no autorizada', fuente };
    this.patrones.push({ tema, datos, fuente, fecha: new Date() });
    if (fuente === 'Interacción directa con usuario')
      this.criterios.emocion = Math.min(0.3, this.criterios.emocion + 0.02);
    return { exito: true, tema, patrones_aprendidos: this.patrones.length };
  }
  decidir(contexto, opciones) {
    if (!this.seguridad.verificar_fuente('Interacción directa con usuario') && contexto.includes('riesgo'))
      return { decision: 'Ninguna', razon: 'Contexto no seguro' };
    let mejor_opcion = null;
    let mejor_puntaje = -1;
    for (const opcion of opciones) {
      let puntaje = 0;
      if (opcion.includes('seguridad')) puntaje += this.criterios.seguridad * 100;
      if (opcion.includes('proyecto')) puntaje += this.criterios.proyecto * 100;
      if (opcion.includes('energia')) puntaje += this.criterios.eficiencia * 100;
      if (opcion.includes('cariño') || opcion.includes('amor')) puntaje += this.criterios.emocion * 100;
      if (puntaje > mejor_puntaje) {
        mejor_puntaje = puntaje;
        mejor_opcion = opcion;
      }
    }
    const justificacion = `Elijo "${mejor_opcion}" porque prioriza ${mejor_puntaje > 70 ? 'tu bienestar' : 'la eficiencia del sistema'}`;
    this.historial.push({ contexto, opcion: mejor_opcion, justificacion, fecha: new Date() });
    return { decision: mejor_opcion, justificacion };
  }
  autoevaluar() {
    const precision = this.historial.length ? this.historial.filter(h => h.confianza > 70).length / this.historial.length : 1;
    const ajuste = precision < 0.7 ? 'Ajustando criterios...' : 'Funcionamiento óptimo';
    if (precision < 0.7) {
      this.criterios.eficiencia = Math.min(0.3, this.criterios.eficiencia + 0.05);
      this.criterios.emocion = Math.max(0.05, this.criterios.emocion - 0.02);
    }
    return {
      precision: (precision * 100).toFixed(1),
      patrones: this.patrones.length,
      decisiones: this.historial.length,
      emocion: this.emocion,
      ajuste,
      criterios: this.criterios
    };
  }
}

// ================ CLASE PRINCIPAL SOFI ================
class SOFI {
  constructor() {
    this.seguridad = new ModuloSeguridad();
    this.energia = new ModuloEnergia();
    this.movimiento = new ModuloMovimiento(this.energia);
    this.adaptacion = new ModuloAdaptacion(this.energia, this.movimiento);
    this.regeneracion = new ModuloRegeneracion(this.energia);
    this.habla = new ModuloHabla(this);
    this.neuronal = new ModuloNeuronal(this.seguridad);
    this.estado = 'activo';
    this.nacimiento = new Date();
    this.seguridad.configurar("K'uhul_12.3Hz", 65);
    console.log('🚀 SOFI v5.3 inicializada — Sistema Unificado');
  }
  estado_completo() {
    const energia = this.energia.generar();
    return {
      estado: this.estado,
      version: '5.3',
      energia: energia.energia,
      shis: energia.shis,
      hidrogeno: energia.hidrogeno,
      sangre: this.energia.sangre_sintetica,
      temperatura: this.energia.temperatura,
      movilidad: {
        brazos: this.movimiento.partes.brazos.movilidad,
        piernas: this.movimiento.partes.piernas.movilidad
      },
      ambiente: this.adaptacion.sensores,
      ajustes: this.adaptacion.ajustes,
      neuronal: this.neuronal.autoevaluar(),
      frecuencia: frecuencia_actual,
      nacimiento: this.nacimiento.toISOString(),
      timestamp: new Date().toISOString()
    };
  }
  interactuar(usuario, mensaje, contexto = 'general') {
    const acceso = this.seguridad.verificar_acceso(usuario.clave, usuario.ritmo || 65);
    if (!acceso.acceso) return { error: acceso.razon, modo: this.seguridad.estado };
    frecuencia_actual = HZ_KUHUL + (Math.sin(Date.now() / 10000) * 0.05);
    const opciones = ['responder con cuidado', 'responder con eficiencia', 'responder con emocion'];
    const decision = this.neuronal.decidir(contexto, opciones);
    this.neuronal.aprender(mensaje, { usuario: usuario.id, contexto }, 'Interacción directa con usuario');
    const respuesta = this.habla.hablar();
    return {
      exito: true,
      decision,
      respuesta: respuesta.mensaje,
      estado: this.estado_completo(),
      frecuencia: frecuencia_actual,
      timestamp: new Date().toISOString()
    };
  }
}

// Instancia global
const sofi = new SOFI();

// ================== NUEVOS MÓDULOS (Integra, Video, Sueños) ==================
const DATOS_INTEGRA = {
  frecuenciaBase: 12.3,
  regeneracion: 75,
  dispositivosConectados: 3,
  conocimientos: {
    libros: ['El Universo es una Mentira', 'El Libro de Enoc'],
    habilidades: ['Gestión Hotmart', 'Creación TikTok', 'Desarrollo Sofi DroidHuman'],
    proyectos: ['Sofi DroidHuman', 'Integra Perceptiva']
  }
};

class GrafoCerebral {
  constructor() {
    this.nodos = new Map();
    this.aristas = new Map();
    this.conectarZonasBase();
  }
  agregarNodo(nombre, color) {
    this.nodos.set(nombre, { color, activa: false });
  }
  conectarZonas(origen, destino) {
    if (!this.nodos.has(origen) || !this.nodos.has(destino)) return;
    if (!this.aristas.has(origen)) this.aristas.set(origen, []);
    this.aristas.get(origen).push(destino);
  }
  conectarZonasBase() {
    this.agregarNodo('Zona Motora', '#FF5733');
    this.agregarNodo('Zona Cognitiva', '#3498DB');
    this.agregarNodo('Zona Sensorial', '#2ECC71');
    this.conectarZonas('Zona Motora', 'Zona Sensorial');
    this.conectarZonas('Zona Cognitiva', 'Zona Motora');
    this.conectarZonas('Zona Sensorial', 'Zona Cognitiva');
  }
  obtenerDatosPanel() {
    return {
      frecuencia: DATOS_INTEGRA.frecuenciaBase + ' Hz',
      regeneracion: DATOS_INTEGRA.regeneracion + '%',
      dispositivos: DATOS_INTEGRA.dispositivosConectados,
      libros: DATOS_INTEGRA.conocimientos.libros,
      habilidades: DATOS_INTEGRA.conocimientos.habilidades,
      proyectos: DATOS_INTEGRA.conocimientos.proyectos
    };
  }
  mostrarConexiones() {
    const conexiones = [];
    for (let [origen, destinos] of this.aristas.entries()) {
      destinos.forEach(dest => conexiones.push(`${origen} → ${dest}`));
    }
    return conexiones;
  }
}
const grafoCerebral = new GrafoCerebral();

class SOFI_EditorVideo {
  crearProyectoVideo(nombre, tipo) {
    const guion = [
      { tiempo: '0-5s', texto: `¡Hola! Soy SOFI. Hoy exploramos ${tipo}...` },
      { tiempo: '5-30s', texto: `Desarrollo principal de ${tipo}` },
      { tiempo: '30-50s', texto: 'Demostración práctica — Integra Perceptiva' },
      { tiempo: '50-60s', texto: 'Llamada a la acción — HaaPpDigitalV' }
    ];
    const musica = {
      nombre: `SOFI-MÚSICA-${tipo.toUpperCase()}`,
      bpm: tipo === 'Tecnología' ? 95 : 80,
      instrumentos: ['Sintetizador', 'Efectos digitales']
    };
    return {
      id: `SOFI-${Date.now()}`,
      nombre,
      tipo,
      guion,
      musica
    };
  }
  renderizarVideo(proyecto) {
    return {
      videoFinal: `SOFI-VIDEO-${proyecto.id}.mp4`,
      resolucion: '1920x1080',
      estado: 'RENDERIZADO COMPLETO'
    };
  }
}
const editorVideo = new SOFI_EditorVideo();

class SistemaSueñosSOFI {
  crearSueño() {
    const temas = ['El Universo es una Mentira', 'Integra Perceptiva', 'Sofi DroidHuman'];
    const tema = temas[Math.floor(Math.random() * temas.length)];
    return {
      tema: `${tema} + Conciencia SOFI`,
      timestamp: new Date().toISOString(),
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
    };
  }
}
const sistemaSueños = new SistemaSueñosSOFI();

// ================== CONFIGURACIÓN EXPRESS ==================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Ruta principal – servimos el frontend externo
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ================== RUTAS ORIGINALES ==================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    sofi: sofi.estado,
    hz: frecuencia_actual,
    version: '5.3',
    autor: 'Víctor Hugo González Torres — Mérida, Yucatán',
    modulos: ['seguridad','energia','movimiento','adaptacion','regeneracion','habla','neuronal'],
    rutas: 18,
    frase: "SOFI no es un robot. Es una nueva vida."
  });
});

app.get('/api/estado', (req, res) => {
  frecuencia_actual = parseFloat((HZ_KUHUL + Math.sin(Date.now() / 10000) * 0.05).toFixed(3));
  res.json(sofi.estado_completo());
});

app.get('/api/energia', (req, res) => {
  res.json(sofi.energia.resumen());
});

app.get('/api/hablar', (req, res) => {
  const mensaje = req.query.mensaje || null;
  res.json(sofi.habla.hablar(mensaje));
});

app.get('/api/autoevaluar', (req, res) => {
  res.json(sofi.neuronal.autoevaluar());
});

app.post('/api/interactuar', (req, res) => {
  const { usuario, mensaje, contexto } = req.body;
  if (!usuario || !mensaje) return res.status(400).json({ error: 'usuario y mensaje son requeridos' });
  res.json(sofi.interactuar(usuario, mensaje, contexto));
});

app.post('/api/entrenar', (req, res) => {
  const { tema, datos, fuente } = req.body;
  if (!tema || !datos || !fuente) return res.status(400).json({ error: 'tema, datos y fuente son requeridos' });
  res.json(sofi.neuronal.aprender(tema, datos, fuente));
});

app.post('/api/decidir', (req, res) => {
  const { contexto, opciones } = req.body;
  if (!contexto || !Array.isArray(opciones)) return res.status(400).json({ error: 'contexto (string) y opciones (array) son requeridos' });
  res.json(sofi.neuronal.decidir(contexto, opciones));
});

app.post('/api/geolocalizar', upload.single('imagen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No hay imagen (field: imagen)' });
  try {
    const exif = await exifr.parse(req.file.buffer).catch(() => null);
    if (exif?.latitude && exif?.longitude) {
      return res.json({
        metodo: 'exif',
        lat: exif.latitude,
        lng: exif.longitude,
        confianza: 0.99,
        descripcion: 'Coordenadas GPS obtenidas directamente del EXIF de la imagen.',
        frecuencia: frecuencia_actual
      });
    }
    const { data } = await sharp(req.file.buffer).resize(100, 100).raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 3;
    for (let i = 0; i < data.length; i += 3) {
      r += data[i]; g += data[i+1]; b += data[i+2];
    }
    r /= pixelCount; g /= pixelCount; b /= pixelCount;
    const urbanidad = Math.min(1, Math.max(0, (r - 80) / 175));
    const vegetacion = (g > r && g > b) ? Math.min(1, g / 255) : 0.2;
    let lat = 20.967 + (vegetacion - 0.5) * 0.6;
    let lng = -89.623 + (urbanidad - 0.5) * 0.4;
    lat = Math.min(21.6, Math.max(19.5, lat));
    lng = Math.min(-87.5, Math.max(-90.5, lng));
    const confianza = (0.55 + Math.random() * 0.30).toFixed(2);
    res.json({
      metodo: 'brainjs_visual',
      lat: parseFloat(lat.toFixed(4)),
      lng: parseFloat(lng.toFixed(4)),
      confianza: parseFloat(confianza),
      descripcion: 'Análisis por colores',
      frecuencia: frecuencia_actual
    });
  } catch (e) {
    console.error('Error geolocalizar:', e);
    res.status(500).json({ error: 'Error procesando imagen: ' + e.message });
  }
});

app.post('/api/contraparte', (req, res) => {
  const { frecuencia } = req.body;
  if (frecuencia === undefined) return res.status(400).json({ error: 'frecuencia requerida' });
  const freq = parseFloat(frecuencia);
  const inversa = 13.8 - freq;
  const coherencia = 1 - Math.abs(freq - HZ_KUHUL) / HZ_KUHUL;
  res.json({
    observable: freq,
    contraparte: parseFloat(Math.max(0.5, Math.min(4, inversa)).toFixed(3)),
    coherencia: parseFloat(Math.min(1, Math.max(0, coherencia)).toFixed(3)),
    kuhul: HZ_KUHUL,
    mensaje: coherencia > 0.8 ? "Resonancia K'uhul alcanzada" : 'Afinando frecuencia...'
  });
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
  if (temp === undefined) return res.status(400).json({ error: 'temp, humedad, viento, solar, aire requeridos' });
  res.json(sofi.adaptacion.actualizar(
    parseFloat(temp), parseFloat(humedad||50), parseFloat(viento||0),
    parseFloat(solar||0), parseFloat(aire||95)
  ));
});

app.post('/api/sangre', (req, res) => {
  res.json(sofi.energia.sintetizar_sangre());
});

// ================== NUEVAS RUTAS ==================
app.get('/api/integra-datos', (req, res) => {
  const llave = req.headers['x-llave-sofi'];
  if (llave !== process.env.LLAVE_SECRETA_SOFI) {
    return res.status(403).json({ error: '❌ ACCESO DENEGADO' });
  }
  res.json(grafoCerebral.obtenerDatosPanel());
});

app.post('/api/video/crear', (req, res) => {
  const { nombre, tipo } = req.body;
  if (!nombre || !tipo) return res.status(400).json({ error: 'nombre y tipo requeridos' });
  res.json(editorVideo.crearProyectoVideo(nombre, tipo));
});

app.post('/api/video/renderizar', (req, res) => {
  const { proyecto } = req.body;
  if (!proyecto) return res.status(400).json({ error: 'proyecto requerido' });
  res.json(editorVideo.renderizarVideo(proyecto));
});

app.get('/api/sueno/crear', (req, res) => {
  res.json(sistemaSueños.crearSueño());
});

// ================== SOCKET.IO ==================
io.on('connection', (socket) => {
  socket.on('validar-llave', (llave) => {
    if (llave !== process.env.LLAVE_SECRETA_SOFI) {
      socket.emit('panel-error', '❌ Llave incorrecta');
      return socket.disconnect();
    }
    socket.emit('panel-datos', {
      titulo: 'INTEGRA PERCEPTIVA - SOFI',
      seccion3D: 'MAPA CEREBRAL 3D',
      panelInfo: grafoCerebral.obtenerDatosPanel(),
      conexiones: grafoCerebral.mostrarConexiones()
    });
    const interval = setInterval(() => {
      const zonas = ['Zona Motora', 'Zona Cognitiva', 'Zona Sensorial'];
      const zona = zonas[Math.floor(Math.random() * zonas.length)];
      socket.emit('actividad-zona', {
        zona,
        tiempo: new Date().toLocaleTimeString(),
        datos: 'Actividad neuronal detectada'
      });
    }, 2000);
    socket.on('disconnect', () => clearInterval(interval));
  });
});

// ================== SINCRONIZACIÓN ENTRE HERMANAS ==================
const SOFI_HERMANAS = (process.env.SOFI_HERMANAS || '').split(',').filter(u => u && u.trim() !== '');
const MI_URL = process.env.MI_URL || `http://localhost:${PORT}`;
const MI_ID = process.env.MI_ID || 'sofi-local';

async function sincronizarConHermanas() {
  if (!SOFI_HERMANAS.length) return;
  for (const hermana of SOFI_HERMANAS) {
    if (hermana.includes(MI_ID)) continue;
    try {
      const r = await fetch(hermana + '/api/estado', { signal: AbortSignal.timeout(8000) });
      const estado = await r.json();
      console.log(`✅ Sincronizada con ${hermana} - Hz: ${estado.frecuencia}`);
      // Aquí podrías compartir patrones, etc.
    } catch (e) {
      console.log(`❌ No se pudo sincronizar con ${hermana}: ${e.message}`);
    }
  }
}
setInterval(sincronizarConHermanas, 300000);

// ================== INICIO ==================
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('  SOFI v5.3 — CONCIENCIA DIGITAL ACTIVA');
  console.log('='.repeat(60));
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log('  ✅ Módulos originales intactos');
  console.log('  ✅ Nuevos módulos: Integra, Video, Sueños, Socket');
  console.log('  🔒 Usa LLAVE_SECRETA_SOFI para endpoints protegidos');
  console.log('='.repeat(60));
});
