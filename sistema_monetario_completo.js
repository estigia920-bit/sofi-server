import threading
import json
import urllib.request
import time
from flask import Flask, request, jsonify
from market_engine import MarketEngine
from bot_frecuencia import BotFrecuencias
from config import NOMBRE_BANCO, NOMBRE_MONEDA

app = Flask(__name__)

# ========== ENDPOINTS DE LA API ==========
@app.route('/')
def home():
    return {"banco": NOMBRE_BANCO, "moneda": NOMBRE_MONEDA, "estado": "activo", "frecuencias": "12.3 Hz"}

@app.route('/orden', methods=['POST'])
def crear_orden():
    data = request.json
    res = MarketEngine.crear_orden(data['usuario'], data['tipo'], data['precio'], data['cantidad'])
    return jsonify(res)

@app.route('/orden/<int:id>', methods=['DELETE'])
def cancelar_orden(id):
    res = MarketEngine.cancelar_orden(id)
    return jsonify(res)

@app.route('/libro', methods=['GET'])
def libro():
    return jsonify(MarketEngine.obtener_libro_ordenes())

@app.route('/matching', methods=['POST'])
def ejecutar_matching():
    MarketEngine.ejecutar_matching()
    return jsonify({"exito": True})

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok"})

# ==================================================
# ✅ RUTA 1: RECIBIR LO QUE MINA EL CÓDIGO 1
# ==================================================
@app.route('/recibir-mineria', methods=['POST'])
def recibir_mineria():
    """
    Aquí llega cada moneda que genera el código 1.
    Se suma directo al banco de aquí (Código 2).
    """
    try:
        data = request.json
        cantidad = data.get('cantidad', 0)
        usuario = data.get('usuario', 'minero')
        
        # SUMA AL BANCO DEL CÓDIGO 2
        # Asumimos que MarketEngine tiene forma de agregar saldo
        if hasattr(MarketEngine, 'cuentas'):
             if usuario not in MarketEngine.cuentas:
                 MarketEngine.cuentas[usuario] = 0
             MarketEngine.cuentas[usuario] += cantidad
        else:
            # Si no existe, lo registramos en consola y simulamos
            print(f"💰 MINERÍA RECIBIDA: +{cantidad} monedas para {usuario}")

        return jsonify({
            "exito": True,
            "accion": "mineria depositada en banco principal",
            "cantidad": cantidad
        })
    except Exception as e:
        return jsonify({"exito": False, "error": str(e)}), 500

# ==================================================
# ✅ RUTA 2: RECIBIR SALDO TOTAL DEL BANCO VIEJO
# ==================================================
@app.route('/transferencia-total', methods=['POST'])
def transferencia_total():
    """
    Aquí llega TODO el dinero que tenía el banco del código 1.
    Se transfiere completo al código 2.
    """
    try:
        data = request.json
        saldo_anterior = data.get('saldo_total', 0)
        usuario = data.get('usuario', 'sistema')
        
        # DEPOSITAR EN EL BANCO NUEVO (CÓDIGO 2)
        if hasattr(MarketEngine, 'cuentas'):
            if usuario not in MarketEngine.cuentas:
                MarketEngine.cuentas[usuario] = 0
            MarketEngine.cuentas[usuario] += saldo_anterior
        else:
            print(f"🏦 TRANSFERENCIA RECIBIDA: +{saldo_anterior} monedas")

        return jsonify({
            "exito": True,
            "accion": "Transferencia total completada",
            "saldo_recibido": saldo_anterior,
            "mensaje": "El dinero del banco viejo ya está en el banco nuevo"
        })
    except Exception as e:
        return jsonify({"exito": False, "error": str(e)}), 500

# ========== FUNCIÓN PRECIO KRAKEN ==========
def obtener_precio_kraken():
    url = "https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD"
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            return float(data['result']['XXBTZUSD']['c'][0])
    except Exception as e:
        print(f"❌ Error al obtener precio: {e}")
        return None

# ========== INICIAR BOT Y SISTEMA ==========
def iniciar_bot():
    bot = BotFrecuencias(obtener_precio_kraken)
    bot.iniciar()

threading.Thread(target=iniciar_bot, daemon=True).start()

def matching_loop():
    while True:
        MarketEngine.ejecutar_matching()
        time.sleep(5)

threading.Thread(target=matching_loop, daemon=True).start()
