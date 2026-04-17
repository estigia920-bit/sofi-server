// ============================================================
// SOFI v7.0 — MODELOS MONGODB
// HaaPpDigitalV © 2025 · K'uhul Maya 12.3 Hz
// ============================================================
import mongoose from 'mongoose';

// ── USUARIO ──────────────────────────────────────────────────
const usuarioSchema = new mongoose.Schema({
  id:    { type: String, required: true, unique: true, index: true },
  hash:  { type: String, required: true },
  perfil: {
    nombre: { type: String, default: '' },
    rol:    { type: String, default: 'usuario', enum: ['usuario','admin','sofi'] },
    avatar: { type: String, default: '' }
  },
  saldo_interno:   { type: Number, default: 0 },
  datos_personales:{ type: Object, default: {} },
  creado: { type: Date, default: Date.now },
  ultimo_acceso: { type: Date, default: Date.now }
}, { timestamps: true });

// ── TRADE / OPERACIÓN ─────────────────────────────────────────
const tradeSchema = new mongoose.Schema({
  id_operacion: { type: String, required: true, unique: true, index: true },
  usuario:   { type: String, default: 'sofi', index: true },
  activo:    { type: String, required: true },
  tipo:      { type: String, enum: ['COMPRA','VENTA'], required: true },
  cantidad:  { type: Number, required: true },
  precio_entrada: { type: Number, required: true },
  precio_cierre:  { type: Number, default: null },
  ganancia:       { type: Number, default: 0 },
  estado:    { type: String, enum: ['ABIERTA','CERRADA','CANCELADA'], default: 'ABIERTA' },
  fase_zfpi: { type: String, default: '' },
  confianza: { type: Number, default: 0 },
  hz_kuhul:  { type: Number, default: 12.3 },
  fuente:    { type: String, enum: ['SIMULADO','BINANCE','MANUAL'], default: 'BINANCE' },
  binance_order_id: { type: String, default: null },
  timestamp_apertura: { type: Date, default: Date.now },
  timestamp_cierre:   { type: Date, default: null }
}, { timestamps: true });

// ── MEMORIA DE SOFI ───────────────────────────────────────────
const memoriaSchema = new mongoose.Schema({
  dato:    { type: String, required: true },
  etiqueta:{ type: String, default: '' },
  razon:   { type: String, default: '' },
  nivel_activacion: { type: Number, default: 0.5 },
  nodos_activados:  [{ type: String }],
  hz_kuhul:  { type: Number, default: 12.3 },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// ── HISTORIAL DE CHAT ─────────────────────────────────────────
const chatSchema = new mongoose.Schema({
  usuario:  { type: String, default: 'guest', index: true },
  mensaje:  { type: String, required: true },
  respuesta:{ type: String, default: '' },
  accion:   { type: String, default: 'desconocido' },
  estado_animo: { type: String, default: 'ESTABLE' },
  hz_kuhul: { type: Number, default: 12.3 },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// ── INGRESO K'UHUL ────────────────────────────────────────────
const ingresoSchema = new mongoose.Schema({
  id_ingreso: { type: String, required: true, unique: true },
  tipo:   { type: String, enum: ['frecuencia','mineria','trading','resonancia'], required: true },
  monto:  { type: Number, required: true },
  moneda: { type: String, default: '$ZYXSOF' },
  factor_hz:    { type: Number, default: 1 },
  factor_union: { type: Number, default: 1 },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// ── SEÑAL ZFPI ────────────────────────────────────────────────
const senalSchema = new mongoose.Schema({
  id_senal: { type: String, required: true, unique: true },
  activo:   { type: String, required: true, index: true },
  precio:   { type: Number, required: true },
  precio_anterior: { type: Number, default: 0 },
  variacion:   { type: Number, default: 0 },
  fase:        { type: String, default: 'CONSOLIDACION' },
  señal:       { type: String, default: 'ESPERAR' },
  confianza:   { type: Number, default: 0 },
  resonancia:  { type: Number, default: 0 },
  hz_kuhul:    { type: Number, default: 12.3 },
  fuente:      { type: String, enum: ['BINANCE','SIMULADO'], default: 'BINANCE' },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// ── ESTADO SISTEMA ────────────────────────────────────────────
const estadoSistemaSchema = new mongoose.Schema({
  version:    { type: String, default: '7.0.0' },
  hz_kuhul:   { type: Number, default: 12.3 },
  nivel_union:{ type: Number, default: 0 },
  energia:    { type: Number, default: 100 },
  interacciones: { type: Number, default: 0 },
  ganancias_totales: { type: Number, default: 0 },
  ingresos_zyxsof:   { type: Number, default: 0 },
  estado_animo: { type: String, default: 'ESTABLE' },
  modo_ataque:  { type: String, default: 'NORMAL' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const Usuario       = mongoose.model('Usuario',       usuarioSchema);
export const Trade         = mongoose.model('Trade',         tradeSchema);
export const Memoria       = mongoose.model('Memoria',       memoriaSchema);
export const Chat          = mongoose.model('Chat',          chatSchema);
export const Ingreso       = mongoose.model('Ingreso',       ingresoSchema);
export const Senal         = mongoose.model('Senal',         senalSchema);
export const EstadoSistema = mongoose.model('EstadoSistema', estadoSistemaSchema);
