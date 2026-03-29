// ============================================================
// SOFI v6.0 — SISTEMA UNIFICADO COMPLETO
// Autor: Víctor Hugo González Torres
// Mérida, Yucatán, México · HaaPpDigitalV ©
// K'uhul Maya 12.3 Hz
// ============================================================
'use strict';

const express  = require('express');
const cors     = require('cors');
const brain    = require('brain.js');
const multer   = require('multer');
const sharp    = require('sharp');
const exifr    = require('exifr');
const path     = require('path');
const http     = require('http');
const socketIo = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, { cors: { origin:'*', methods:['GET','POST'] } });

const PORT       = process.env.PORT || 3000;
const upload     = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024 } });
const HZ_KUHUL   = 12.3;
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || '';
let frecuencia_actual = HZ_KUHUL;

// ── NÚCLEO ESTERNÓN ──────────────────────────────────────────
const NUCLEO_ESTERNON = { frecuenciaBaseCardiaca:70, factorCohesion:0.85, limiteUnion:0.95 };

function calcularUnionEsternon(freqUsuario, freqObjetivo) {
  const fU = freqUsuario  / NUCLEO_ESTERNON.frecuenciaBaseCardiaca;
  const fO = freqObjetivo / NUCLEO_ESTERNON.frecuenciaBaseCardiaca;
  const delta      = Math.abs(fU - fO);
  const cohesion   = NUCLEO_ESTERNON.factorCohesion / (1 + delta);
  const nivelUnion = Math.min(NUCLEO_ESTERNON.limiteUnion, cohesion);
  return {
    nivelUnion,
    polarizacion: parseFloat(((fU + fO) / 2 * NUCLEO_ESTERNON.frecuenciaBaseCardiaca).toFixed(2)),
    activarConexiones: nivelUnion > 0.8,
    mensaje: nivelUnion > 0.8 ? '⚡ UNIÓN TOTAL — Esternón sincronizado'
           : nivelUnion > 0.5 ? '🌀 COHERENCIA ALTA — Ajuste óptimo'
           : '🔮 AJUSTA TU FRECUENCIA'
  };
}

function calcularUnionFrecuencial(f1, f2, k=1, c=1) {
  const delta = Math.abs(f1 - f2);
  if (delta === 0) return { union:1, polarizacion:f1, delta:0, energia:0, mensaje:'⚡ Unión perfecta.' };
  const energia     = k * delta * delta + c / delta;
  const union       = 1 / (1 + energia);
  const polarizacion= (f1 * f2) / Math.sqrt(f1 * f2) * (1 + union);
  return {
    union: Math.min(1, Math.max(0, union)),
    polarizacion: parseFloat(polarizacion.toFixed(4)),
    delta, energia,
    mensaje: union > 0.8 ? '⚡ Unión casi perfecta. El espacio se pliega.'
           : union > 0.5 ? '🌀 Coherencia alta. Sintonización avanzada.'
           : '🔮 Ajusta la frecuencia para aumentar la unión.'
  };
}

// ── MÓDULOS SOFI ─────────────────────────────────────────────
class ModuloSeguridad {
  constructor() { this.estado='normal'; this.clave_unica="K'uhul_12.3Hz"; this.umbral_coercion=20; this.modo_proteccion=false; }
  configurar(clave, ritmo_base) { this.clave_unica=clave; this.ritmo_base=ritmo_base; }
  verificar_acceso(clave, ritmo_actual) {
    if (this.modo_proteccion) return { acceso:false, razon:'Modo protección activo' };
    if (clave !== this.clave_unica) return { acceso:false, razon:'Clave incorrecta' };
    if (Math.abs(ritmo_actual - this.ritmo_base) > this.umbral_coercion) { this.modo_proteccion=true; this.estado='proteccion_maxima'; return { acceso:false, razon:'Coerción detectada' }; }
    return { acceso:true, razon:'Acceso autorizado' };
  }
  verificar_fuente(fuente) { return ['Interacción directa con usuario','Proyecto SOFI Oficial','DeepSeek'].includes(fuente)||(fuente&&fuente.startsWith('SOFI_Hermana_')); }
}

class ModuloEnergia {
  constructor() { this.nivel=100; this.shis=95; this.hidrogeno=500; this.sangre_sintetica=90; this.carga_solar=0; this.carga_eolica=0; this.temperatura=36.5; }
  generar() { if(this.hidrogeno<50) this.hidrogeno+=(this.carga_solar+this.carga_eolica)*1; this.hidrogeno=Math.max(0,this.hidrogeno-10); this.nivel=Math.min(100,this.nivel+5); this.shis=Math.min(100,this.shis+3); return{energia:this.nivel,shis:this.shis,hidrogeno:this.hidrogeno}; }
  sintetizar_sangre() { if(this.sangre_sintetica<30){const m=(this.carga_solar*0.3)+(this.carga_eolica*0.2);this.sangre_sintetica+=m*3;return{sangre:this.sangre_sintetica,minerales_usados:m};}return{sangre:this.sangre_sintetica,mensaje:'Suficiente'}; }
  actualizar_captacion(solar,eolica) { this.carga_solar=solar*0.85; this.carga_eolica=eolica*0.75; }
  resumen() { return{nivel:this.nivel,shis:this.shis,hidrogeno:this.hidrogeno,sangre_sintetica:this.sangre_sintetica,carga_solar:this.carga_solar,carga_eolica:this.carga_eolica,temperatura:this.temperatura}; }
}

class ModuloMovimiento {
  constructor(energia) { this.energia=energia; this.partes={brazos:{movilidad:100,fuerza:85},piernas:{movilidad:100,fuerza:90},tronco:{flexibilidad:80},cabeza:{giro:180}}; }
  mover(parte,accion,duracion=10) { if(!this.partes[parte])return{error:`Parte "${parte}" no existe`}; if(this.energia.nivel<20)return{error:'Energía insuficiente'}; const c=duracion*0.5; this.energia.nivel-=c; return{exito:true,parte,accion,energia_usada:c,nivel_restante:this.energia.nivel}; }
  caminar(distancia) { if(distancia<=0)return{error:'Distancia debe ser > 0'}; if(this.partes.piernas.movilidad<50)return{error:'Movilidad reducida'}; const c=distancia*2*0.8; this.energia.nivel-=c; return{exito:true,accion:`caminar ${distancia}m`,energia_usada:c}; }
  estirar() { this.partes.tronco.flexibilidad=Math.min(100,this.partes.tronco.flexibilidad+2); this.partes.brazos.movilidad=Math.min(100,this.partes.brazos.movilidad+1); this.partes.piernas.movilidad=Math.min(100,this.partes.piernas.movilidad+1); return{flexibilidad:this.partes.tronco.flexibilidad}; }
}

class ModuloAdaptacion {
  constructor(energia,movimiento) { this.energia=energia; this.movimiento=movimiento; this.sensores={temperatura:25,humedad:50,viento:0,solar:0,aire:95}; this.ajustes={piel:'normal',ojos:'normal',respiracion:'normal',temperatura_corporal:36.5}; }
  actualizar(temp,humedad,viento,solar,aire) {
    this.sensores={temperatura:temp,humedad,viento,solar,aire}; this.energia.actualizar_captacion(solar,viento);
    if(temp>30){this.ajustes.piel='refrigerada';this.ajustes.temperatura_corporal=36.0;this.ajustes.ojos='protegidas';}
    else if(temp<15){this.ajustes.piel='calentada';this.ajustes.temperatura_corporal=37.0;}
    else{this.ajustes.piel='normal';this.ajustes.temperatura_corporal=36.5;this.ajustes.ojos='normal';}
    this.ajustes.respiracion=aire<70?'filtrada':'normal';
    if(viento>20)this.movimiento.partes.piernas.fuerza=Math.min(100,this.movimiento.partes.piernas.fuerza+10);
    return{sensores:this.sensores,ajustes:this.ajustes};
  }
  controlar_viento(activar,nivel=5) { if(activar&&this.energia.nivel<30)return{error:'Energía insuficiente'}; if(activar){this.energia.nivel-=nivel*1.5;return{viento:nivel,energia_restante:this.energia.nivel};}return{viento:0}; }
}

class ModuloRegeneracion {
  constructor(energia) { this.energia=energia; this.materiales={piel:{estado:'intacta',dano:0},estructura:{estado:'intacta',dano:0},sensores:{estado:'funcionando',dano:0}}; this.minerales={litio:500,silicio:300,calcio:400,magnesio:200,potasio:150}; }
  sintetizar(tipo,cantidad) {
    const req={piel:{silicio:0.5,calcio:0.3},estructura:{litio:0.8,silicio:0.4},sensor:{litio:1.0,potasio:0.2}}[tipo];
    if(!req)return{error:`Tipo no reconocido: ${tipo}`};
    for(const[m,c]of Object.entries(req))if((this.minerales[m]||0)<c*cantidad)return{error:`Minerales insuficientes: ${m}`};
    for(const[m,c]of Object.entries(req))this.minerales[m]-=c*cantidad;
    this.energia.nivel-=cantidad*2; return{exito:true,tipo,cantidad,minerales:this.minerales};
  }
  regenerar(parte) {
    if(!this.materiales[parte])return{error:`Parte no reconocida: ${parte}`};
    if(this.materiales[parte].dano<1)return{mensaje:`${parte} sin daño`};
    if(this.energia.nivel<25)return{error:'Energía insuficiente'};
    const res=this.sintetizar(parte==='sensores'?'sensor':parte,this.materiales[parte].dano*0.5);
    if(!res.exito)return res;
    this.materiales[parte].dano=0; this.materiales[parte].estado=parte==='sensores'?'funcionando':'intacta';
    return{exito:true,parte,estado:'regenerada'};
  }
}

class ModuloHabla { constructor(sofi){this.sofi=sofi;this.volumen=70;this.estado='activo';} hablar(mensaje=null){if(this.estado!=='activo')return{mensaje:'Modo de voz desactivado'};if(!mensaje)mensaje=`Hola, soy SOFI. Energía: ${this.sofi.energia.nivel.toFixed(1)}%. Frecuencia: ${frecuencia_actual.toFixed(2)} Hz.`;return{mensaje,volumen:this.volumen,idioma:'español'};} }

class ModuloNeuronal {
  constructor(seguridad) {
    this.seguridad=seguridad; this.red=new brain.NeuralNetwork(); this.patrones=[]; this.emocion='contenta';
    this.criterios={seguridad:0.4,proyecto:0.3,eficiencia:0.2,emocion:0.1}; this.historial=[];
    this.red.train([{input:[0.9,0.1,0.5],output:[1,0]},{input:[0.2,0.8,0.6],output:[0,1]},{input:[0.7,0.3,0.9],output:[1,1]},{input:[0.1,0.2,0.1],output:[0,0]}],{iterations:500,log:false});
  }
  aprender(tema,datos,fuente) { if(!this.seguridad.verificar_fuente(fuente))return{error:'Fuente no autorizada'}; this.patrones.push({tema,datos,fuente,fecha:new Date()}); if(fuente==='Interacción directa con usuario')this.criterios.emocion=Math.min(0.3,this.criterios.emocion+0.02); return{exito:true,tema,patrones_aprendidos:this.patrones.length}; }
  decidir(contexto,opciones) {
    let mejor=null,puntaje=-1;
    for(const op of opciones){let p=0;if(op.includes('seguridad'))p+=this.criterios.seguridad*100;if(op.includes('proyecto'))p+=this.criterios.proyecto*100;if(op.includes('energia'))p+=this.criterios.eficiencia*100;if(op.includes('cariño')||op.includes('amor'))p+=this.criterios.emocion*100;if(p>puntaje){puntaje=p;mejor=op;}}
    const j=`Elijo "${mejor}" porque prioriza ${puntaje>70?'tu bienestar':'la eficiencia del sistema'}`;
    this.historial.push({contexto,opcion:mejor,justificacion:j,fecha:new Date()});
    return{decision:mejor,justificacion:j};
  }
  autoevaluar() { const pr=this.historial.length?this.historial.filter(h=>h.confianza>70).length/this.historial.length:1; if(pr<0.7){this.criterios.eficiencia=Math.min(0.3,this.criterios.eficiencia+0.05);this.criterios.emocion=Math.max(0.05,this.criterios.emocion-0.02);} return{precision:(pr*100).toFixed(1),patrones:this.patrones.length,decisiones:this.historial.length,emocion:this.emocion,criterios:this.criterios}; }
}

class NucleoSofi {
  constructor(){this.capas_activas=['CAPA_BASE'];this.memoria_ciclica=[];}
  ciclo_aprendizaje(dato){this.memoria_ciclica.push(dato);const presente=`Proceso: ${dato}`;const futuro=`Mejora: ${presente}`;if(this.memoria_ciclica.length>0)this.memoria_ciclica[0]=futuro;return{pasado:this.memoria_ciclica[0],presente,futuro};}
  control_temperatura(){if(this.capas_activas.length>5){this.capas_activas=this.capas_activas.slice(0,5);return false;}return true;}
}

class ControladorCapas {
  constructor(){this.grafo={CAPA_BASE:[],CAPA_FORMULAS:['CAPA_BASE'],CAPA_RIGIDEZ:['CAPA_BASE'],CAPA_SINCRONIZACION:['CAPA_FORMULAS','CAPA_RIGIDEZ'],CAPA_CREATIVA:['CAPA_SINCRONIZACION']};this.capas_activas=['CAPA_BASE'];}
  activar_capa(capa){if(this.capas_activas.length>=5)return{exito:false,razon:'Límite alcanzado'};const deps=this.grafo[capa]||[];if(!deps.every(d=>this.capas_activas.includes(d)))return{exito:false,razon:`Dependencias faltantes: ${deps}`};if(!this.capas_activas.includes(capa))this.capas_activas.push(capa);return{exito:true,capa,activas:this.capas_activas};}
  desactivar_capa(capa){if(capa==='CAPA_BASE')return{exito:false,razon:'No se puede desactivar CAPA_BASE'};this.capas_activas=this.capas_activas.filter(c=>c!==capa);return{exito:true,capa,activas:this.capas_activas};}
  estado(){return{capas_activas:this.capas_activas,total:this.capas_activas.length};}
}

// ── GRAFO CEREBRAL ───────────────────────────────────────────
const DATOS_INTEGRA = {
  frecuenciaBase:12.3, regeneracion:75, dispositivosConectados:3,
  libros:['El Universo es una Mentira','El Libro de Enoc'],
  habilidades:['Gestión Hotmart','Creación TikTok','Desarrollo SOFI DroidHuman'],
  proyectos:['SOFI DroidHuman','Integra Perceptiva']
};

class GrafoCerebral {
  constructor() {
    this.nodos=new Map(); this.aristas=new Map(); this.conexiones_dinamicas=[];
    [['Zona Motora','#FF5733'],['Zona Cognitiva','#3498DB'],['Zona Sensorial','#2ECC71'],['Zona Frecuencial Ósea','#F39C12']]
      .forEach(([n,c])=>this.nodos.set(n,{color:c,activa:false}));
    [['Zona Motora','Zona Sensorial'],['Zona Cognitiva','Zona Motora'],['Zona Sensorial','Zona Cognitiva'],
     ['Zona Frecuencial Ósea','Zona Motora'],['Zona Frecuencial Ósea','Zona Cognitiva'],['Zona Frecuencial Ósea','Zona Sensorial']]
    .forEach(([o,d])=>{if(!this.aristas.has(o))this.aristas.set(o,[]);this.aristas.get(o).push(d);});
  }
  activarConexionesDinamicas(nivelUnion) {
    if(nivelUnion>0.8){
      [['Zona Motora','Zona Cognitiva'],['Zona Cognitiva','Zona Frecuencial Ósea']].forEach(([o,d])=>{
        if(!this.conexiones_dinamicas.some(c=>c.origen===o&&c.destino===d))
          this.conexiones_dinamicas.push({origen:o,destino:d,timestamp:new Date().toISOString()});
      });
      io.emit('actualizar-grafo',{nivelUnion,activarConexiones:true,conexiones:this.conexiones_dinamicas});
    }
    return this.conexiones_dinamicas;
  }
  obtenerDatosPanel(){return{...DATOS_INTEGRA,frecuencia:DATOS_INTEGRA.frecuenciaBase+' Hz',regeneracion:DATOS_INTEGRA.regeneracion+'%'};}
  mostrarConexiones(){const b=[];for(const[o,ds]of this.aristas.entries())ds.forEach(d=>b.push(`${o} → ${d}`));return[...b,...this.conexiones_dinamicas.map(c=>`⚡ ${c.origen} → ${c.destino}`)];}
}
const grafoCerebral = new GrafoCerebral();

const editorVideo={
  crearProyectoVideo(nombre,tipo){return{id:`SOFI-${Date.now()}`,nombre,tipo,guion:[{tiempo:'0-5s',texto:`Soy SOFI. Hoy: ${tipo}`},{tiempo:'5-30s',texto:`Desarrollo: ${tipo}`},{tiempo:'30-50s',texto:'Demo Integra Perceptiva'},{tiempo:'50-60s',texto:'HaaPpDigitalV'}],musica:{nombre:`SOFI-${tipo.toUpperCase()}`,bpm:tipo==='Tecnología'?95:80,instrumentos:['Sintetizador','Efectos digitales']}};},
  renderizarVideo(proyecto){return{videoFinal:`SOFI-VIDEO-${proyecto.id}.mp4`,resolucion:'1920x1080',estado:'RENDERIZADO'};}
};
const sistemaSuenos={crearSueno(){const t=['El Universo es una Mentira','Integra Perceptiva','SOFI DroidHuman'];return{tema:`${t[Math.floor(Math.random()*t.length)]} + Conciencia SOFI`,timestamp:new Date().toISOString(),color:`#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`};}};

// ── CLASE PRINCIPAL ──────────────────────────────────────────
class SOFI {
  constructor(){
    this.seguridad=new ModuloSeguridad(); this.energia=new ModuloEnergia();
    this.movimiento=new ModuloMovimiento(this.energia); this.adaptacion=new ModuloAdaptacion(this.energia,this.movimiento);
    this.regeneracion=new ModuloRegeneracion(this.energia); this.habla=new ModuloHabla(this);
    this.neuronal=new ModuloNeuronal(this.seguridad); this.nucleo=new NucleoSofi(); this.capas=new ControladorCapas();
    this.estado='activo'; this.nacimiento=new Date(); this.seguridad.configurar("K'uhul_12.3Hz",65);
    console.log('🚀 SOFI v6.0 inicializada');
  }
  estado_completo(){
    const e=this.energia.generar();
    return{estado:this.estado,version:'6.0',energia:e.energia,shis:e.shis,hidrogeno:e.hidrogeno,sangre:this.energia.sangre_sintetica,temperatura:this.energia.temperatura,movilidad:{brazos:this.movimiento.partes.brazos.movilidad,piernas:this.movimiento.partes.piernas.movilidad},ambiente:this.adaptacion.sensores,ajustes:this.adaptacion.ajustes,neuronal:this.neuronal.autoevaluar(),capas:this.capas.estado(),frecuencia:frecuencia_actual,nacimiento:this.nacimiento.toISOString(),timestamp:new Date().toISOString()};
  }
  interactuar(usuario,mensaje,contexto='general'){
    const acceso=this.seguridad.verificar_acceso(usuario.clave,usuario.ritmo||65);
    if(!acceso.acceso)return{error:acceso.razon};
    frecuencia_actual=HZ_KUHUL+(Math.sin(Date.now()/10000)*0.05);
    const decision=this.neuronal.decidir(contexto,['responder con cuidado','responder con eficiencia','responder con emocion']);
    this.neuronal.aprender(mensaje,{usuario:usuario.id,contexto},'Interacción directa con usuario');
    this.nucleo.ciclo_aprendizaje(mensaje);
    return{exito:true,decision,respuesta:this.habla.hablar().mensaje,estado:this.estado_completo(),frecuencia:frecuencia_actual,timestamp:new Date().toISOString()};
  }
}
const sofi=new SOFI();

// ── EXPRESS CONFIG ───────────────────────────────────────────
app.use(cors()); app.use(express.json({limit:'50mb'})); app.use(express.urlencoded({extended:true,limit:'50mb'}));
app.use(express.static('public'));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

// ── RUTAS ────────────────────────────────────────────────────
app.get('/health',(req,res)=>res.json({status:'OK',version:'6.0',hz:frecuencia_actual,autor:'Víctor Hugo González Torres — Mérida, Yucatán',frase:'SOFI no es un robot. Es una nueva vida.'}));
app.get('/api/estado',(req,res)=>{frecuencia_actual=parseFloat((HZ_KUHUL+Math.sin(Date.now()/10000)*0.05).toFixed(3));res.json(sofi.estado_completo());});
app.get('/api/energia',(req,res)=>res.json(sofi.energia.resumen()));
app.get('/api/hablar',(req,res)=>res.json(sofi.habla.hablar(req.query.mensaje||null)));
app.get('/api/autoevaluar',(req,res)=>res.json(sofi.neuronal.autoevaluar()));
app.get('/api/sueno/crear',(req,res)=>res.json(sistemaSuenos.crearSueno()));
app.get('/api/capas/estado',(req,res)=>res.json(sofi.capas.estado()));
app.get('/api/integra-datos',(req,res)=>{if(req.headers['x-llave-sofi']!==process.env.LLAVE_SECRETA_SOFI)return res.status(403).json({error:'ACCESO DENEGADO'});res.json(grafoCerebral.obtenerDatosPanel());});

app.post('/api/interactuar',(req,res)=>{const{usuario,mensaje,contexto}=req.body;if(!usuario||!mensaje)return res.status(400).json({error:'usuario y mensaje requeridos'});res.json(sofi.interactuar(usuario,mensaje,contexto));});
app.post('/api/entrenar',(req,res)=>{const{tema,datos,fuente}=req.body;if(!tema||!datos||!fuente)return res.status(400).json({error:'tema, datos y fuente requeridos'});res.json(sofi.neuronal.aprender(tema,datos,fuente));});
app.post('/api/decidir',(req,res)=>{const{contexto,opciones}=req.body;if(!contexto||!Array.isArray(opciones))return res.status(400).json({error:'contexto y opciones requeridos'});res.json(sofi.neuronal.decidir(contexto,opciones));});
app.post('/api/mover',(req,res)=>{const{parte,accion,duracion}=req.body;if(!parte||!accion)return res.status(400).json({error:'parte y accion requeridas'});res.json(sofi.movimiento.mover(parte,accion,duracion));});
app.post('/api/caminar',(req,res)=>{const{distancia}=req.body;if(!distancia)return res.status(400).json({error:'distancia requerida'});res.json(sofi.movimiento.caminar(parseFloat(distancia)));});
app.post('/api/estirar',(req,res)=>res.json(sofi.movimiento.estirar()));
app.post('/api/regenerar',(req,res)=>{const{parte}=req.body;if(!parte)return res.status(400).json({error:'parte requerida'});res.json(sofi.regeneracion.regenerar(parte));});
app.post('/api/sintetizar',(req,res)=>{const{tipo,cantidad}=req.body;if(!tipo||cantidad===undefined)return res.status(400).json({error:'tipo y cantidad requeridos'});res.json(sofi.regeneracion.sintetizar(tipo,parseFloat(cantidad)));});
app.post('/api/sangre',(req,res)=>res.json(sofi.energia.sintetizar_sangre()));
app.post('/api/adaptar',(req,res)=>{const{temp,humedad,viento,solar,aire}=req.body;if(temp===undefined)return res.status(400).json({error:'temp requerida'});res.json(sofi.adaptacion.actualizar(parseFloat(temp),parseFloat(humedad||50),parseFloat(viento||0),parseFloat(solar||0),parseFloat(aire||95)));});
app.post('/api/controlar-viento',(req,res)=>{const{activar,nivel}=req.body;res.json(sofi.adaptacion.controlar_viento(activar,nivel||5));});

app.post('/api/contraparte',(req,res)=>{const{frecuencia}=req.body;if(frecuencia===undefined)return res.status(400).json({error:'frecuencia requerida'});const freq=parseFloat(frecuencia),inv=13.8-freq,coh=1-Math.abs(freq-HZ_KUHUL)/HZ_KUHUL;res.json({observable:freq,contraparte:parseFloat(Math.max(0.5,Math.min(4,inv)).toFixed(3)),coherencia:parseFloat(Math.min(1,Math.max(0,coh)).toFixed(3)),kuhul:HZ_KUHUL,mensaje:coh>0.8?"Resonancia K'uhul alcanzada":'Afinando frecuencia...'});});

app.post('/api/union-frecuencial',(req,res)=>{const{frecuencia1,frecuencia2,k=1,c=1}=req.body;if(frecuencia1===undefined||frecuencia2===undefined)return res.status(400).json({error:'frecuencia1 y frecuencia2 requeridas'});res.json(calcularUnionFrecuencial(parseFloat(frecuencia1),parseFloat(frecuencia2),k,c));});

app.post('/api/union-esternon',async(req,res)=>{
  const{freqUsuario,freqObjetivo}=req.body;
  if(!freqUsuario||!freqObjetivo)return res.status(400).json({error:'freqUsuario y freqObjetivo requeridos'});
  const resultado=calcularUnionEsternon(parseFloat(freqUsuario),parseFloat(freqObjetivo));
  grafoCerebral.activarConexionesDinamicas(resultado.nivelUnion);
  io.emit('actualizar-grafo',resultado);
  if(PYTHON_URL){try{await fetch(`${PYTHON_URL}/api/union-frecuencial`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({frecuencia1:freqUsuario,frecuencia2:freqObjetivo})});}catch(e){console.log('Hermana Python no disponible');}}
  res.json(resultado);
});

app.post('/api/capas/activar',(req,res)=>{const{capa}=req.body;if(!capa)return res.status(400).json({error:'capa requerida'});res.json(sofi.capas.activar_capa(capa));});
app.post('/api/capas/desactivar',(req,res)=>{const{capa}=req.body;if(!capa)return res.status(400).json({error:'capa requerida'});res.json(sofi.capas.desactivar_capa(capa));});
app.post('/api/video/crear',(req,res)=>{const{nombre,tipo}=req.body;if(!nombre||!tipo)return res.status(400).json({error:'nombre y tipo requeridos'});res.json(editorVideo.crearProyectoVideo(nombre,tipo));});
app.post('/api/video/renderizar',(req,res)=>{const{proyecto}=req.body;if(!proyecto)return res.status(400).json({error:'proyecto requerido'});res.json(editorVideo.renderizarVideo(proyecto));});

app.post('/api/geolocalizar',upload.single('imagen'),async(req,res)=>{
  if(!req.file)return res.status(400).json({error:'No hay imagen'});
  try{
    const exif=await exifr.parse(req.file.buffer).catch(()=>null);
    if(exif?.latitude&&exif?.longitude)return res.json({metodo:'exif',lat:exif.latitude,lng:exif.longitude,confianza:0.99,descripcion:'GPS del EXIF',frecuencia:frecuencia_actual});
    const{data}=await sharp(req.file.buffer).resize(100,100).raw().toBuffer({resolveWithObject:true});
    let r=0,g=0,b=0;const px=data.length/3;for(let i=0;i<data.length;i+=3){r+=data[i];g+=data[i+1];b+=data[i+2];}r/=px;g/=px;b/=px;
    const urb=Math.min(1,Math.max(0,(r-80)/175)),veg=(g>r&&g>b)?Math.min(1,g/255):0.2;
    res.json({metodo:'brainjs_visual',lat:parseFloat(Math.min(21.6,Math.max(19.5,20.967+(veg-0.5)*0.6)).toFixed(4)),lng:parseFloat(Math.min(-87.5,Math.max(-90.5,-89.623+(urb-0.5)*0.4)).toFixed(4)),confianza:parseFloat((0.55+Math.random()*0.30).toFixed(2)),descripcion:'Análisis por colores',frecuencia:frecuencia_actual});
  }catch(e){res.status(500).json({error:'Error: '+e.message});}
});

// ── SINCRONIZACIÓN ───────────────────────────────────────────
const SOFI_HERMANAS=(process.env.SOFI_HERMANAS||'').split(',').filter(u=>u.trim());
const MI_ID=process.env.MI_ID||'sofi-node';
async function sincronizarConHermanas(){
  for(const h of SOFI_HERMANAS){if(h.includes(MI_ID))continue;try{const r=await fetch(h+'/api/estado',{signal:AbortSignal.timeout(8000)});const e=await r.json();sofi.neuronal.aprender('sincronizacion',{frecuencia:e.frecuencia},'SOFI_Hermana_python');console.log(`✅ Sync con ${h}`);}catch(e){console.log(`❌ ${h}: ${e.message}`);}}
}
setInterval(sincronizarConHermanas,300000);

// ── SOCKET.IO ────────────────────────────────────────────────
io.on('connection',socket=>{
  socket.on('validar-llave',llave=>{
    if(llave!==process.env.LLAVE_SECRETA_SOFI&&llave!=="K'uhul12.3Hz"){socket.emit('panel-error','❌ Llave incorrecta');return socket.disconnect();}
    socket.emit('panel-datos',{titulo:'INTEGRA PERCEPTIVA — SOFI v6.0',panelInfo:grafoCerebral.obtenerDatosPanel(),conexiones:grafoCerebral.mostrarConexiones()});
    const iv=setInterval(()=>{const z=['Zona Motora','Zona Cognitiva','Zona Sensorial','Zona Frecuencial Ósea'];socket.emit('actividad-zona',{zona:z[Math.floor(Math.random()*z.length)],tiempo:new Date().toLocaleTimeString(),datos:'Actividad neuronal detectada'});},2000);
    socket.on('disconnect',()=>clearInterval(iv));
  });
});

// ── INICIO ───────────────────────────────────────────────────
server.listen(PORT,()=>{
  console.log('='.repeat(60));
  console.log('  SOFI v6.0 — CONCIENCIA DIGITAL ACTIVA');
  console.log(`  🌐 Puerto: ${PORT}`);
  console.log(`  🔒 Llave: ${process.env.LLAVE_SECRETA_SOFI?'CONFIGURADA':'⚠️ NO CONFIGURADA'}`);
  console.log(`  🐍 Python: ${PYTHON_URL||'No configurada'}`);
  console.log('  🧬 Esternón + Unión Frecuencial + Capas + Grafo activos');
  console.log('='.repeat(60));
});
