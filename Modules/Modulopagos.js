// ============================================================
// MÓDULO PAGOS — SOFI v7.0
// Mercado Pago (MXN) + Ethereum Wallet
// HaaPpDigitalV © 2025
// ============================================================
import axios from 'axios';

// ── MERCADO PAGO ──────────────────────────────────────────────
export class ModuloMercadoPago {
  constructor() {
    this.token       = process.env.MP_ACCESS_TOKEN || '';
    this.clabe       = process.env.MP_CLABE        || '722969017167745283';
    this.beneficiario= process.env.MP_BENEFICIARIO || 'Victor Hugo Gonzalez Torres';
    this.activo      = !!this.token;
    this.base        = 'https://api.mercadopago.com';
    console.log(`💳 ModuloMercadoPago — ${this.activo ? '✅ Token configurado' : '⚠️ Solo CLABE disponible'}`);
  }

  // Datos para recibir dinero (siempre disponible)
  getDatosRecepcion() {
    return {
      clabe:        this.clabe,
      beneficiario: this.beneficiario,
      institucion:  'Mercado Pago W',
      pais:         'México',
      moneda:       'MXN'
    };
  }

  // Consultar saldo (requiere token)
  async getSaldo() {
    if (!this.activo) return { error: 'MP_ACCESS_TOKEN no configurado', clabe: this.clabe };
    try {
      const res = await axios.get(`${this.base}/v1/account/settlement_report/config`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      return { exito: true, data: res.data };
    } catch (err) {
      return { exito: false, error: err.response?.data?.message || err.message };
    }
  }

  // Crear preferencia de pago (link de cobro)
  async crearPago({ monto, descripcion, referencia = null }) {
    if (!this.activo) return { error: 'MP_ACCESS_TOKEN no configurado' };
    try {
      const res = await axios.post(`${this.base}/v1/payment_intents`, {
        transaction_amount: monto,
        description: descripcion,
        payment_method_id: 'account_money',
        payer: { email: process.env.MP_EMAIL || 'haappdigitalv@gmail.com' }
      }, { headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } });
      return { exito: true, pago: res.data };
    } catch (err) {
      return { exito: false, error: err.response?.data?.message || err.message };
    }
  }

  // Recibir notificación webhook
  procesarWebhook(body) {
    if (!body?.type) return { valido: false };
    return {
      valido: true,
      tipo:   body.type,
      id:     body.data?.id,
      fecha:  body.date_created
    };
  }

  estado() {
    return {
      activo: this.activo,
      clabe:  this.clabe,
      beneficiario: this.beneficiario,
      moneda: 'MXN'
    };
  }
}

// ── ETHEREUM / WEB3 WALLET ────────────────────────────────────
export class ModuloEthereum {
  constructor() {
    this.address   = process.env.ETH_ADDRESS || '0x14bA243A9BA7824A4F675788E4e2F19fC010BEaE';
    this.rpc_url   = process.env.ETH_RPC_URL || 'https://cloudflare-eth.com';
    this.thirdweb  = 'https://thirdweb.com';
    this.chain_id  = 1; // Ethereum Mainnet
    console.log(`⟠ ModuloEthereum — Address: ${this.address.slice(0,10)}...`);
  }

  // Obtener balance ETH via RPC
  async getBalance() {
    try {
      const res = await axios.post(this.rpc_url, {
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [this.address, 'latest'],
        id: 1
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 8000 });

      const weiHex = res.data.result;
      const wei    = parseInt(weiHex, 16);
      const eth    = wei / 1e18;

      return {
        exito: true,
        address: this.address,
        eth: eth.toFixed(8),
        wei: weiHex
      };
    } catch (err) {
      return { exito: false, address: this.address, error: err.message };
    }
  }

  // Precio ETH/USD desde CoinGecko
  async getPrecioETH() {
    try {
      const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: { ids: 'ethereum', vs_currencies: 'usd,mxn' },
        timeout: 5000
      });
      return {
        exito: true,
        usd: res.data.ethereum?.usd || 0,
        mxn: res.data.ethereum?.mxn || 0
      };
    } catch (err) {
      return { exito: false, error: err.message };
    }
  }

  // Últimas transacciones via Etherscan (si hay API key)
  async getTransacciones(limit = 5) {
    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    if (!apiKey) return { error: 'ETHERSCAN_API_KEY no configurado', address: this.address };
    try {
      const res = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account', action: 'txlist',
          address: this.address,
          startblock: 0, endblock: 99999999,
          page: 1, offset: limit,
          sort: 'desc', apikey: apiKey
        }
      });
      return { exito: true, txs: res.data.result?.slice(0, limit) || [] };
    } catch (err) {
      return { exito: false, error: err.message };
    }
  }

  estado() {
    return {
      address:  this.address,
      chain:    'Ethereum Mainnet',
      chain_id: this.chain_id,
      rpc:      this.rpc_url
    };
  }
}
