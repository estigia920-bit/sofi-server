// ============================================================
// MÓDULO MONGODB — SOFI v7.0
// Persistencia completa: usuarios, trades, memorias, historial
// HaaPpDigitalV © 2025
// ============================================================
import mongoose from 'mongoose';
import { Usuario, Trade, Memoria, Chat, Ingreso, Senal, EstadoSistema } from '../models/index.js';

export default class ModuloMongoDB {
  constructor() {
    this.conectado = false;
    this.reintentos = 0;
    console.log('🍃 ModuloMongoDB iniciado');
  }

  // ── CONEXIÓN ──────────────────────────────────────────────────
  async conectar(uri) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10
      });
      this.conectado = true;
      this.reintentos = 0;
      console.log('✅ MongoDB CONECTADO — Base de datos SOFI v7 activa');
      mongoose.connection.on('disconnected', () => {
        this.conectado = false;
        console.warn('⚠️ MongoDB desconectado — reintentando...');
        setTimeout(() => this.conectar(uri), 5000);
      });
    } catch (err) {
      this.conectado = false;
      this.reintentos++;
      console.error(`❌ MongoDB error (intento ${this.reintentos}):`, err.message);
      setTimeout(() => this.conectar(uri), 5000);
    }
  }

  // ── USUARIOS ──────────────────────────────────────────────────
  async guardarUsuario(data) {
    try {
      return await Usuario.findOneAndUpdate(
        { id: data.id },
        { ...data, ultimo_acceso: new Date() },
        { upsert: true, new: true }
      );
    } catch (err) { console.error('DB guardarUsuario:', err.message); return null; }
  }

  async getUsuario(id) {
    try { return await Usuario.findOne({ id }); }
    catch (err) { return null; }
  }

  async listarUsuarios() {
    try { return await Usuario.find({}, '-hash').lean(); }
    catch (err) { return []; }
  }

  async actualizarSaldo(id, monto) {
    try {
      return await Usuario.findOneAndUpdate(
        { id },
        { $inc: { saldo_interno: monto } },
        { new: true }
      );
    } catch (err) { return null; }
  }

  // ── TRADES ────────────────────────────────────────────────────
  async guardarTrade(data) {
    try {
      return await Trade.findOneAndUpdate(
        { id_operacion: data.id_operacion },
        data,
        { upsert: true, new: true }
      );
    } catch (err) { console.error('DB guardarTrade:', err.message); return null; }
  }

  async cerrarTrade(id_operacion, precio_cierre, ganancia) {
    try {
      return await Trade.findOneAndUpdate(
        { id_operacion },
        {
          precio_cierre,
          ganancia,
          estado: 'CERRADA',
          timestamp_cierre: new Date()
        },
        { new: true }
      );
    } catch (err) { return null; }
  }

  async getTradesAbiertos(usuario = null) {
    try {
      const q = { estado: 'ABIERTA' };
      if (usuario) q.usuario = usuario;
      return await Trade.find(q).sort({ timestamp_apertura: -1 }).lean();
    } catch (err) { return []; }
  }

  async getHistorialTrades(limit = 50) {
    try {
      return await Trade.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    } catch (err) { return []; }
  }

  async getEstadisticasTrades() {
    try {
      const stats = await Trade.aggregate([
        {
          $group: {
            _id: null,
            total_trades: { $sum: 1 },
            ganancia_total: { $sum: '$ganancia' },
            trades_ganadores: { $sum: { $cond: [{ $gt: ['$ganancia', 0] }, 1, 0] } },
            trades_perdedores: { $sum: { $cond: [{ $lt: ['$ganancia', 0] }, 1, 0] } }
          }
        }
      ]);
      return stats[0] || { total_trades: 0, ganancia_total: 0, trades_ganadores: 0, trades_perdedores: 0 };
    } catch (err) { return {}; }
  }

  // ── MEMORIAS ──────────────────────────────────────────────────
  async guardarMemoria(data) {
    try {
      const mem = new Memoria(data);
      return await mem.save();
    } catch (err) { return null; }
  }

  async getMemoriasRecientes(limit = 20) {
    try {
      return await Memoria.find({}).sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) { return []; }
  }

  async buscarMemorias(etiqueta) {
    try {
      return await Memoria.find({ etiqueta: { $regex: etiqueta, $options: 'i' } })
        .sort({ timestamp: -1 }).limit(10).lean();
    } catch (err) { return []; }
  }

  // ── CHAT HISTORIAL ────────────────────────────────────────────
  async guardarChat(data) {
    try {
      const chat = new Chat(data);
      return await chat.save();
    } catch (err) { return null; }
  }

  async getHistorialChat(usuario, limit = 30) {
    try {
      return await Chat.find({ usuario })
        .sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) { return []; }
  }

  // ── INGRESOS ──────────────────────────────────────────────────
  async guardarIngreso(data) {
    try {
      const ing = new Ingreso(data);
      return await ing.save();
    } catch (err) { return null; }
  }

  async getTotalIngresos() {
    try {
      const res = await Ingreso.aggregate([
        { $group: { _id: '$moneda', total: { $sum: '$monto' }, count: { $sum: 1 } } }
      ]);
      return res;
    } catch (err) { return []; }
  }

  async getIngresosRecientes(limit = 20) {
    try {
      return await Ingreso.find({}).sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) { return []; }
  }

  // ── SEÑALES ZFPI ──────────────────────────────────────────────
  async guardarSenal(data) {
    try {
      const s = new Senal(data);
      return await s.save();
    } catch (err) { return null; }
  }

  async getUltimasSeñales(activo, limit = 10) {
    try {
      const q = activo ? { activo } : {};
      return await Senal.find(q).sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) { return []; }
  }

  // ── ESTADO SISTEMA ────────────────────────────────────────────
  async persistirEstado(estado) {
    try {
      await EstadoSistema.findOneAndUpdate(
        {},
        { ...estado, timestamp: new Date() },
        { upsert: true, sort: { createdAt: -1 } }
      );
    } catch (err) { /* silent */ }
  }

  async getUltimoEstado() {
    try { return await EstadoSistema.findOne({}).sort({ timestamp: -1 }).lean(); }
    catch (err) { return null; }
  }

  // ── DASHBOARD STATS ───────────────────────────────────────────
  async getDashboardStats() {
    try {
      const [usuarios, tradesStats, ingresos, memorias, chats, senales] = await Promise.all([
        Usuario.countDocuments(),
        this.getEstadisticasTrades(),
        this.getTotalIngresos(),
        Memoria.countDocuments(),
        Chat.countDocuments(),
        Senal.countDocuments()
      ]);
      return {
        usuarios_registrados: usuarios,
        trades: tradesStats,
        ingresos,
        memorias_almacenadas: memorias,
        chats_registrados: chats,
        senales_generadas: senales,
        db_conectada: this.conectado
      };
    } catch (err) {
      return { db_conectada: this.conectado, error: err.message };
    }
  }

  estado() {
    return {
      conectado: this.conectado,
      reintentos: this.reintentos
    };
  }
}
