// ============================================================
// MÓDULO BINANCE — SOFI v7.0
// Precios en tiempo real + ejecución de órdenes reales
// HMAC SHA-256 · API REST + WebSocket
// HaaPpDigitalV © 2025
// ============================================================
import crypto from 'crypto';
import axios from 'axios';
import WebSocket from 'ws';
import { Senal, Trade } from '../models/index.js';

const BINANCE_BASE  = 'https://api.binance.com';
const BINANCE_WS    = 'wss://stream.binance.com:9443/stream';

export default class ModuloBinance {
  constructor(grafo, config) {
    this.grafo   = grafo;
    this.apiKey  = config.BINANCE_API_KEY  || process.env.BINANCE_API_KEY  || '';
    this.secret  = config.BINANCE_SECRET   || process.env.BINANCE_SECRET   || '';
    this.activo  = !!this.apiKey && !!this.secret;
    this.precios = {};
    this.ws      = null;
    this.suscripciones = new Set();
    this.callbacks_precio = new Map(); // activo → [fn, fn, ...]

    // Pares a monitorear
    this.pares = ['BTCUSDT','ETHUSDT','XAUUSDT','SOLUSDT','BNBUSDT',
                  'XRPUSDT','DOGEUSDT','ADAUSDT'];

    console.log(`📡 ModuloBinance iniciado — API: ${this.activo ? '✅ ACTIVA' : '⚠️ Sin credenciales'}`);
    if (this.activo) this._iniciarWebSocket();
  }

  // ── FIRMA HMAC ───────────────────────────────────────────────
  _firmar(queryString) {
    return crypto.createHmac('sha256', this.secret)
      .update(queryString)
      .digest('hex');
  }

  _headers() {
    return { 'X-MBX-APIKEY': this.apiKey, 'Content-Type': 'application/x-www-form-urlencoded' };
  }

  // ── WEBSOCKET PRECIOS EN TIEMPO REAL ─────────────────────────
  _iniciarWebSocket() {
    const streams = this.pares.map(p => `${p.toLowerCase()}@ticker`).join('/');
    const url = `${BINANCE_WS}?streams=${streams}`;

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('🔴 Binance WebSocket conectado — precios en vivo');
      this.grafo.activar('trading', 0.3);
    });

    this.ws.on('message', (raw) => {
      try {
        const msg  = JSON.parse(raw);
        const data = msg.data || msg;
        if (data.s && data.c) {
          const activo = data.s;
          const precio = parseFloat(data.c);
          const prev   = this.precios[activo]?.precio || precio;
          this.precios[activo] = {
            precio,
            precio_anterior: prev,
            variacion_pct: prev > 0 ? ((precio - prev) / prev) * 100 : 0,
            alto_24h: parseFloat(data.h || 0),
            bajo_24h: parseFloat(data.l || 0),
            volumen:  parseFloat(data.v || 0),
            ts: Date.now()
          };
          // Notificar callbacks suscritos
          const cbs = this.callbacks_precio.get(activo) || [];
          cbs.forEach(fn => fn(this.precios[activo]));
        }
      } catch (_) {}
    });

    this.ws.on('close', () => {
      console.warn('⚠️ Binance WS desconectado — reconectando en 5s...');
      setTimeout(() => this._iniciarWebSocket(), 5000);
    });

    this.ws.on('error', (err) => {
      console.error('❌ Binance WS error:', err.message);
    });
  }

  // ── SUSCRIBIR A PRECIO ────────────────────────────────────────
  suscribirPrecio(activo, callback) {
    const key = activo.toUpperCase();
    if (!this.callbacks_precio.has(key)) this.callbacks_precio.set(key, []);
    this.callbacks_precio.get(key).push(callback);
  }

  // ── OBTENER PRECIO (REST fallback) ────────────────────────────
  async getPrecio(symbol) {
    // Si ya tenemos precio en tiempo real, usarlo
    if (this.precios[symbol]) return this.precios[symbol].precio;
    try {
      const res = await axios.get(`${BINANCE_BASE}/api/v3/ticker/price`, { params: { symbol } });
      return parseFloat(res.data.price);
    } catch (err) {
      console.error(`❌ Precio ${symbol}:`, err.message);
      return null;
    }
  }

  // ── TODOS LOS PRECIOS ─────────────────────────────────────────
  getTodosPrecios() {
    return this.precios;
  }

  // ── INFO CUENTA ───────────────────────────────────────────────
  async getCuenta() {
    if (!this.activo) return { error: 'API no configurada' };
    try {
      const ts  = Date.now();
      const qs  = `timestamp=${ts}&recvWindow=5000`;
      const sig = this._firmar(qs);
      const res = await axios.get(`${BINANCE_BASE}/api/v3/account?${qs}&signature=${sig}`,
        { headers: this._headers() });
      const balances = res.data.balances
        .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map(b => ({ asset: b.asset, free: parseFloat(b.free), locked: parseFloat(b.locked) }));
      return { exito: true, balances, canTrade: res.data.canTrade };
    } catch (err) {
      return { exito: false, error: err.response?.data?.msg || err.message };
    }
  }

  // ── CREAR ORDEN REAL ──────────────────────────────────────────
  async crearOrden({ symbol, side, type = 'MARKET', quantity, price = null }) {
    if (!this.activo) return { exito: false, error: 'API Binance no configurada' };
    try {
      const ts = Date.now();
      let params = `symbol=${symbol}&side=${side}&type=${type}&quantity=${quantity}&timestamp=${ts}&recvWindow=5000`;
      if (type === 'LIMIT' && price) params += `&price=${price}&timeInForce=GTC`;
      const sig = this._firmar(params);
      const res = await axios.post(`${BINANCE_BASE}/api/v3/order`, `${params}&signature=${sig}`,
        { headers: this._headers() });
      
      this.grafo.activar('trading', 0.4);
      this.grafo.activar('ataque', 0.3);

      // Persistir en MongoDB
      await Trade.create({
        id_operacion: res.data.orderId?.toString() || `BNB-${Date.now()}`,
        usuario: 'sofi',
        activo: symbol,
        tipo: side === 'BUY' ? 'COMPRA' : 'VENTA',
        cantidad: quantity,
        precio_entrada: parseFloat(res.data.price || res.data.fills?.[0]?.price || 0),
        estado: res.data.status === 'FILLED' ? 'CERRADA' : 'ABIERTA',
        fuente: 'BINANCE',
        binance_order_id: res.data.orderId?.toString()
      });

      return { exito: true, orden: res.data };
    } catch (err) {
      const msg = err.response?.data?.msg || err.message;
      console.error('❌ Orden Binance:', msg);
      return { exito: false, error: msg };
    }
  }

  // ── CANCELAR ORDEN ────────────────────────────────────────────
  async cancelarOrden(symbol, orderId) {
    if (!this.activo) return { exito: false, error: 'API no configurada' };
    try {
      const ts  = Date.now();
      const qs  = `symbol=${symbol}&orderId=${orderId}&timestamp=${ts}`;
      const sig = this._firmar(qs);
      const res = await axios.delete(`${BINANCE_BASE}/api/v3/order?${qs}&signature=${sig}`,
        { headers: this._headers() });
      return { exito: true, resultado: res.data };
    } catch (err) {
      return { exito: false, error: err.response?.data?.msg || err.message };
    }
  }

  // ── HISTORIAL ÓRDENES ─────────────────────────────────────────
  async getHistorialOrdenes(symbol, limit = 10) {
    if (!this.activo) return { exito: false, error: 'API no configurada' };
    try {
      const ts  = Date.now();
      const qs  = `symbol=${symbol}&limit=${limit}&timestamp=${ts}`;
      const sig = this._firmar(qs);
      const res = await axios.get(`${BINANCE_BASE}/api/v3/myTrades?${qs}&signature=${sig}`,
        { headers: this._headers() });
      return { exito: true, trades: res.data };
    } catch (err) {
      return { exito: false, error: err.response?.data?.msg || err.message };
    }
  }

  // ── KLINES (velas) ────────────────────────────────────────────
  async getKlines(symbol, interval = '1m', limit = 50) {
    try {
      const res = await axios.get(`${BINANCE_BASE}/api/v3/klines`,
        { params: { symbol, interval, limit } });
      return res.data.map(k => ({
        ts: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
        low: parseFloat(k[3]), close: parseFloat(k[4]), vol: parseFloat(k[5])
      }));
    } catch (err) {
      return [];
    }
  }

  estado() {
    return {
      activa: this.activo,
      precios_activos: Object.keys(this.precios).length,
      pares_monitoreados: this.pares,
      ws_conectado: this.ws?.readyState === 1,
      precios: this.precios
    };
  }
}
