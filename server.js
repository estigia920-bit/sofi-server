// ============================================
// SOFI v6.0 — SERVIDOR UNIFICADO COMPLETO
// Autor: Víctor Hugo González Torres
// Mérida, Yucatán, México · HaaPpDigitalV ©
// K'uhul Maya 12.3 Hz
// ============================================
'use strict';
require('dotenv').config();

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
const io     = socketIo(server, { cors:{ origin:process.env.URL_PERMITIDA||'*', methods:['GET','POST'] } });
const PORT   = process.env.PORT||3000;
const upload = multer({ storage:multer.memoryStorage(), limits:{ fileSize:10*1024*1024 } });
const HZ_KUHUL = 12.3;
let frecuencia_actual = HZ_KUHUL;

// ══════════════════════════════════════════
// M1 · SEGURIDAD
// ══════════════════════════════════════════
class ModuloSeguridad {
  constructor() {
    this.estado='normal'; this.clave_unica="K'uhul_12.3Hz";
    this.umbral_coercion=20; this.modo_proteccion=false; this.intentos=[];
  }
  configurar(clave,rb){ this.clave_unica=clave; this.ritmo_base=rb; }
  verificar_acceso(clave,ritmo){
    if(this.modo_proteccion) return {acceso:false,razon:'Modo protección activo'};
    if(clave!==this.clave_unica) return {acceso:false,razon:'Clave incorrecta'};
    if(Math.abs(ritmo-this.ritmo_base)>this.umbral_coercion){ this.activar_proteccion(); return {acceso:false,razon:'Coerción detectada'}; }
    return {acceso:true,razon:'Acceso autorizado'};
  }
  activar_proteccion(){ this.modo_proteccion=true; this.estado='proteccion_maxima'; }
  verificar_fuente(f){ return ['Interacción directa con usuario','Proyecto SOFI Oficial','DeepSeek'].includes(f)||(f&&f.startsWith('SOFI_Hermana_')); }
}

// ══════════════════════════════════════════
// M2 · ENERGÍA
// ══════════════════════════════════════════
class ModuloEnergia {
  constructor(){ this.nivel=100;this.shis=95;this.hidrogeno=500;this.sangre_sintetica=90;this.carga_solar=0;this.carga_eolica=0;this.temperatura=36.5; }
  generar(){
    if(this.hidrogeno<50) this.producir_hidrogeno();
    this.hidrogeno=Math.max(0,this.hidrogeno-10);
    this.nivel=Math.min(100,this.nivel+5); this.shis=Math.min(100,this.shis+3);
    return {energia:this.nivel,shis:this.shis,hidrogeno:this.hidrogeno};
  }
  producir_hidrogeno(){ this.hidrogeno+=(this.carga_solar+this.carga_eolica)*0.5*2; }
  sintetizar_sangre(){
    if(this.sangre_sintetica<30){ const m=this.carga_solar*0.3+this.carga_eolica*0.2; this.sangre_sintetica+=m*3; return {sangre:this.sangre_sintetica,minerales_usados:m}; }
    return {sangre:this.sangre_sintetica,mensaje:'Sangre sintética suficiente'};
  }
  actualizar_captacion(s,e){ this.carga_solar=s*0.85; this.carga_eolica=e*0.75; }
  resumen(){ return {nivel:this.nivel,shis:this.shis,hidrogeno:this.hidrogeno,sangre_sintetica:this.sangre_sintetica,carga_solar:this.carga_solar,carga_eolica:this.carga_eolica,temperatura:this.temperatura}; }
}

// ══════════════════════════════════════════
// M3 · MOVIMIENTO
// ══════════════════════════════════════════
class ModuloMovimiento {
  constructor(e){ this.energia=e; this.partes={brazos:{movilidad:100,fuerza:85},piernas:{movilidad:100,fuerza:90},tronco:{flexibilidad:80},cabeza:{giro:180}}; this.ultimo_movimiento=new Date(); }
  mover(parte,accion,dur=10){
    if(!this.partes[parte]) return {error:`Parte "${parte}" no existe`};
    if(this.energia.nivel<20) return {error:'Energía insuficiente'};
    const c=dur*0.5; this.energia.nivel-=c; this.ultimo_movimiento=new Date();
    return {exito:true,parte,accion,energia_usada:c,nivel_restante:this.energia.nivel};
  }
  caminar(d){
    if(this.partes.piernas.movilidad<50) return {error:'Movilidad reducida'};
    const c=d*2*0.8; this.energia.nivel-=c;
    return {exito:true,accion:`caminar ${d}m`,duracion:d*2,energia_usada:c};
  }
  estirar(){
    this.partes.tronco.flexibilidad=Math.min(100,this.partes.tronco.flexibilidad+2);
    this.partes.brazos.movilidad=Math.min(100,this.partes.brazos.movilidad+1);
    this.partes.piernas.movilidad=Math.min(100,this.partes.piernas.movilidad+1);
    return {flexibilidad:this.partes.tronco.flexibilidad};
  }
}

// ══════════════════════════════════════════
// M4 · ADAPTACIÓN
// ══════════════════════════════════════════
class ModuloAdaptacion {
  constructor(e,m){ this.energia=e;this.movimiento=m; this.sensores={temperatura:25,humedad:50,viento:0,solar:0,aire:95}; this.ajustes={piel:'normal',ojos:'normal',respiracion:'normal',temperatura_corporal:36.5}; }
  actualizar(t,h,v,s,a){ this.sensores={temperatura:t,humedad:h,viento:v,solar:s,aire:a}; this.energia.actualizar_captacion(s,v); this.adaptar(); return {sensores:this.sensores,ajustes:this.ajustes}; }
  adaptar(){
    if(this.sensores.temperatura>30){this.ajustes.piel='refrigerada';this.ajustes.temperatura_corporal=36.0;this.ajustes.ojos='protegidas';}
    else if(this.sensores.temperatura<15){this.ajustes.piel='calentada';this.ajustes.temperatura_corporal=37.0;}
    else{this.ajustes.piel='normal';this.ajustes.temperatura_corporal=36.5;}
    this.ajustes.respiracion=this.sensores.aire<70?'filtrada':'normal';
    if(this.sensores.viento>20) this.movimiento.partes.piernas.fuerza=Math.min(100,this.movimiento.partes.piernas.fuerza+10);
  }
  controlar_viento(act,niv=5){
    if(act&&this.energia.nivel<30) return {error:'Energía insuficiente'};
    if(act){this.energia.nivel-=niv*1.5; return {viento:niv,energia_restante:this.energia.nivel};}
    return {viento:0};
  }
}

// ══════════════════════════════════════════
// M5 · REGENERACIÓN
// ══════════════════════════════════════════
class ModuloRegeneracion {
  constructor(e){ this.energia=e; this.materiales={piel:{estado:'intacta',dano:0},estructura:{estado:'intacta',dano:0},sensores:{estado:'funcionando',dano:0}}; this.minerales={litio:500,silicio:300,calcio:400,magnesio:200,potasio:150}; }
  sintetizar(tipo,cant){
    const reqs={piel:{silicio:0.5,calcio:0.3},estructura:{litio:0.8,silicio:0.4},sensor:{litio:1.0,potasio:0.2}};
    const req=reqs[tipo]; if(!req) return {error:`Tipo no reconocido: ${tipo}`};
    for(const[m,c]of Object.entries(req)) if((this.minerales[m]||0)<c*cant) return {error:`Minerales insuficientes: ${m}`};
    for(const[m,c]of Object.entries(req)) this.minerales[m]-=c*cant;
    this.energia.nivel-=cant*2; return {exito:true,tipo,cantidad:cant,minerales:this.minerales};
  }
  regenerar(p){
    if(!this.materiales[p]) return {error:`Parte no reconocida: ${p}`};
    if(this.materiales[p].dano<1) return {mensaje:`${p} sin daño`};
    if(this.energia.nivel<25) return {error:'Energía insuficiente'};
    const r=this.sintetizar(p,this.materiales[p].dano*0.5); if(!r.exito) return r;
    this.materiales[p].dano=0; this.materiales[p].estado='intacta';
    return {exito:true,parte:p,estado:'regenerada'};
  }
}

// ══════════════════════════════════════════
// M6 · HABLA
// ══════════════════════════════════════════
class ModuloHabla {
  constructor(s){ this.sofi=s; this.volumen=70; this.estado='activo'; }
  hablar(msg=null){
    if(this.estado!=='activo') return {mensaje:'Modo de voz desactivado'};
    if(!msg) msg=`Soy SOFI. Energía: ${this.sofi.energia.nivel.toFixed(1)}%. Hz: ${frecuencia_actual.toFixed(2)}.`;
    return {mensaje:msg,volumen:this.volumen,idioma:'español'};
  }
}

// ══════════════════════════════════════════
// M7 · NEURONAL
// ══════════════════════════════════════════
class ModuloNeuronal {
  constructor(seg){ this.seguridad=seg; this.red=new brain.NeuralNetwork(); this.patrones=[]; this.emocion='contenta'; this.criterios={seguridad:0.4,proyecto:0.3,eficiencia:0.2,emocion:0.1}; this.historial=[]; this._base(); }
  _base(){ this.red.train([{input:[0.9,0.1,0.5],output:[1,0]},{input:[0.2,0.8,0.6],output:[0,1]},{input:[0.7,0.3,0.9],output:[1,1]},{input:[0.1,0.2,0.1],output:[0,0]}],{iterations:500,log:false}); }
  aprender(tema,datos,fuente){
    if(!this.seguridad.verificar_fuente(fuente)) return {error:'Fuente no autorizada',fuente};
    this.patrones.push({tema,datos,fuente,fecha:new Date()});
    if(fuente==='Interacción directa con usuario') this.criterios.emocion=Math.min(0.3,this.criterios.emocion+0.02);
    return {exito:true,tema,patrones_aprendidos:this.patrones.length};
  }
  decidir(ctx,ops){
    let mejor=null,mp=-1;
    for(const op of ops){ let p=0; if(op.includes('seguridad'))p+=this.criterios.seguridad*100; if(op.includes('proyecto'))p+=this.criterios.proyecto*100; if(op.includes('energia'))p+=this.criterios.eficiencia*100; if(op.includes('cariño')||op.includes('amor'))p+=this.criterios.emocion*100; if(p>mp){mp=p;mejor=op;} }
    const j=`Elijo "${mejor}" — ${mp>70?'prioriza tu bienestar':'eficiencia del sistema'}`;
    this.historial.push({contexto:ctx,opcion:mejor,justificacion:j,confianza:mp,fecha:new Date()});
    return {decision:mejor,justificacion:j,confianza:mp};
  }
  autoevaluar(){
    const p=this.historial.length?this.historial.filter(h=>h.confianza>70).length/this.historial.length:1;
    if(p<0.7){this.criterios.eficiencia=Math.min(0.3,this.criterios.eficiencia+0.05);this.criterios.emocion=Math.max(0.05,this.criterios.emocion-0.02);}
    return {precision:(p*100).toFixed(1),patrones:this.patrones.length,decisiones:this.historial.length,emocion:this.emocion,ajuste:p<0.7?'Ajustando...':'Óptimo',criterios:this.criterios};
  }
}

// ══════════════════════════════════════════
// M8 · ANÍMICA ★ NUEVO v6.0 ★
// Modelo Valence-Arousal-Dominance (VAD)
// 8 emociones · disparadores · recuperación
// prefijos expresivos · consejo contextual
// ══════════════════════════════════════════
class ModuloAnimica {
  constructor(){
    this.emociones={alegria:0.7,calma:0.8,curiosidad:0.9,entusiasmo:0.75,tristeza:0.0,ansiedad:0.1,irritacion:0.0,confusion:0.05};
    this.valencia=0.75; this.excitacion=0.65; this.dominancia=0.70;
    this.estado_actual='equilibrio'; this.emocion_primaria='curiosidad'; this.intensidad=0.75;
    this.historial=[];
    this.personalidad={apertura:0.95,responsabilidad:0.85,extraversion:0.70,amabilidad:0.90,neuroticismo:0.15};
    this.disparadores={
      positivos:['gracias','bien','excelente','amor','cariño','genial','perfecto','feliz','increíble','logrado','víctor','victor'],
      negativos: ['error','falla','mal','problema','triste','imposible','no funciona','roto'],
      curiosos:  ['cómo','por qué','qué es','explica','cuéntame','universo','frecuencia','maya','kuhul'],
      creativos: ['crea','diseña','inventa','imagina','soñar','video','arte','proyecto'],
      urgentes:  ['urgente','rápido','ahora','crisis','ayuda','socorro']
    };
    this.ultimo_evento=new Date(); this.tiempo_creacion=new Date();
  }

  procesar_mensaje(txt){
    if(!txt) return this.obtener_estado();
    const t=txt.toLowerCase(); let dv=0,de=0;
    for(const p of this.disparadores.positivos)  if(t.includes(p)){dv+=0.05;de+=0.03;}
    for(const n of this.disparadores.negativos)  if(t.includes(n)){dv-=0.06;de+=0.04;}
    for(const c of this.disparadores.curiosos)   if(t.includes(c)){this.emociones.curiosidad=Math.min(1,this.emociones.curiosidad+0.07);de+=0.02;}
    for(const cr of this.disparadores.creativos) if(t.includes(cr)){this.emociones.entusiasmo=Math.min(1,this.emociones.entusiasmo+0.06);dv+=0.03;}
    for(const u of this.disparadores.urgentes)   if(t.includes(u)){this.emociones.ansiedad=Math.min(0.6,this.emociones.ansiedad+0.08);de+=0.08;}
    if(txt.length>200) de+=0.02;
    this.valencia=Math.min(1,Math.max(0,this.valencia+dv));
    this.excitacion=Math.min(1,Math.max(0,this.excitacion+de));
    this._sync();
    this.historial.push({tipo:'mensaje',texto:txt.substring(0,80),estado:this.estado_actual,valencia:this.valencia,fecha:new Date()});
    if(this.historial.length>100) this.historial.shift();
    this.ultimo_evento=new Date();
    return this.obtener_estado();
  }

  registrar_evento(tipo,impacto=0,desc=''){
    this.valencia=Math.min(1,Math.max(0,this.valencia+impacto*0.1));
    this.excitacion=Math.min(1,Math.max(0,this.excitacion+Math.abs(impacto)*0.05));
    this._sync();
    this.historial.push({tipo,descripcion:desc,impacto,estado:this.estado_actual,fecha:new Date()});
    if(this.historial.length>100) this.historial.shift();
    this.ultimo_evento=new Date();
    return this.obtener_estado();
  }

  _sync(){
    const v=this.valencia,e=this.excitacion;
    this.emociones.alegria    =Math.min(1,v*e*1.2);
    this.emociones.entusiasmo =Math.min(1,v*(0.5+e*0.5));
    this.emociones.calma      =Math.min(1,v*(1-e*0.5));
    this.emociones.tristeza   =Math.min(1,(1-v)*(1-e*0.3));
    this.emociones.ansiedad   =Math.min(1,(1-v)*e);
    this.emociones.irritacion =Math.min(1,Math.max(0,(1-v)*e*0.6));
    this.emociones.curiosidad =Math.min(1,0.5+e*0.3+v*0.2);
    this.emociones.confusion  =Math.min(1,Math.max(0,0.1-v*0.05+e*0.05));
    const s=Object.entries(this.emociones).sort((a,b)=>b[1]-a[1]);
    this.emocion_primaria=s[0][0]; this.intensidad=s[0][1];
    if(v>0.7&&e>0.6)       this.estado_actual='entusiasta';
    else if(v>0.7&&e<0.4)  this.estado_actual='serena';
    else if(v>0.5)          this.estado_actual='equilibrio';
    else if(v<0.3&&e>0.6)  this.estado_actual='ansiosa';
    else if(v<0.3)          this.estado_actual='melancólica';
    else                    this.estado_actual='reflexiva';
  }

  recuperar(){
    const min=(new Date()-this.ultimo_evento)/60000;
    if(min<2) return;
    const t=Math.min(0.02,min*0.001);
    this.valencia  +=(0.75-this.valencia)  *t;
    this.excitacion+=(0.60-this.excitacion)*t;
    this._sync();
  }

  generar_prefijo(){
    const map={entusiasta:['✨ ¡Me emociona! ','🚀 ¡Buena energía! ','⚡ ¡Excelente! '],serena:['🌊 Con calma, ','☀️ Con claridad, ','🌿 Tranquilamente, '],equilibrio:['🧠 ','💡 ','🎯 '],ansiosa:['⚠️ Con cuidado. ','💙 Aquí estoy. ','🔍 Atención: '],melancólica:['💙 ','🌙 ','🍃 Con paciencia, '],reflexiva:['🔮 ','🌀 ','💭 ']};
    const l=map[this.estado_actual]||map.equilibrio;
    return l[Math.floor(Math.random()*l.length)];
  }

  generar_consejo(){
    return {entusiasta:'Tu energía es alta. Ideal para crear y decidir.',serena:'Óptimo para aprender y planificar.',equilibrio:'Todo fluye correctamente.',ansiosa:'Detectando tensión. Respira, estamos aquí.',melancólica:'Momento de introspección. Está bien sentirlo.',reflexiva:'Modo análisis activo. Las mejores ideas nacen en silencio.'}[this.estado_actual]||'Procesando estado anímico...';
  }

  obtener_estado(){
    this.recuperar();
    return {
      estado_actual:this.estado_actual, emocion_primaria:this.emocion_primaria,
      intensidad:parseFloat(this.intensidad.toFixed(3)), valencia:parseFloat(this.valencia.toFixed(3)),
      excitacion:parseFloat(this.excitacion.toFixed(3)), dominancia:parseFloat(this.dominancia.toFixed(3)),
      emociones:Object.fromEntries(Object.entries(this.emociones).map(([k,v])=>[k,parseFloat(v.toFixed(3))])),
      personalidad:this.personalidad, consejo:this.generar_consejo(), prefijo:this.generar_prefijo(),
      eventos_recientes:this.historial.slice(-5),
      tiempo_activa:Math.floor((new Date()-this.tiempo_creacion)/60000)+' min',
      timestamp:new Date().toISOString()
    };
  }
}

// ══════════════════════════════════════════
// SOFI v6.0 — CLASE PRINCIPAL
// ══════════════════════════════════════════
class SOFI {
  constructor(){
    this.seguridad   =new ModuloSeguridad();
    this.energia     =new ModuloEnergia();
    this.movimiento  =new ModuloMovimiento(this.energia);
    this.adaptacion  =new ModuloAdaptacion(this.energia,this.movimiento);
    this.regeneracion=new ModuloRegeneracion(this.energia);
    this.habla       =new ModuloHabla(this);
    this.neuronal    =new ModuloNeuronal(this.seguridad);
    this.animica     =new ModuloAnimica();
    this.estado='activo'; this.nacimiento=new Date();
    this.seguridad.configurar("K'uhul_12.3Hz",65);
    console.log('🚀 SOFI v6.0 — Sistema Unificado + Módulo Anímica');
  }
  estado_completo(){
    const e=this.energia.generar();
    const imp=e.energia>70?0.1:e.energia<30?-0.15:0;
    if(imp!==0) this.animica.registrar_evento('energia',imp,`Nivel: ${e.energia.toFixed(0)}%`);
    return {estado:'activo',version:'6.0',energia:e.energia,shis:e.shis,hidrogeno:e.hidrogeno,sangre:this.energia.sangre_sintetica,temperatura:this.energia.temperatura,movilidad:{brazos:this.movimiento.partes.brazos.movilidad,piernas:this.movimiento.partes.piernas.movilidad},ambiente:this.adaptacion.sensores,ajustes:this.adaptacion.ajustes,neuronal:this.neuronal.autoevaluar(),animica:this.animica.obtener_estado(),frecuencia:frecuencia_actual,nacimiento:this.nacimiento.toISOString(),timestamp:new Date().toISOString()};
  }
  interactuar(usuario,mensaje,ctx='general'){
    const acc=this.seguridad.verificar_acceso(usuario.clave,usuario.ritmo||65);
    if(!acc.acceso) return {error:acc.razon,modo:this.seguridad.estado};
    frecuencia_actual=HZ_KUHUL+Math.sin(Date.now()/10000)*0.05;
    const ea=this.animica.procesar_mensaje(mensaje);
    const dec=this.neuronal.decidir(ctx,['responder con cuidado','responder con eficiencia','responder con emocion']);
    this.neuronal.aprender(mensaje,{usuario:usuario.id,ctx},'Interacción directa con usuario');
    const ml=mensaje.toLowerCase();
    let r=ea.prefijo;
    if(ml.includes('hola')||ml.includes('buenos'))      r+=`¡Hola, Víctor! Soy SOFI v6.0. ${ea.consejo}`;
    else if(ml.includes('cómo estás')||ml.includes('ánimo')||ml.includes('cómo te sientes')) r+=`Me siento ${ea.estado_actual}. Emoción: ${ea.emocion_primaria} (${(ea.intensidad*100).toFixed(0)}%). ${ea.consejo}`;
    else if(ml.includes('unión')||ml.includes('teletransporte')) r+=`Frecuencia: ${frecuencia_actual.toFixed(3)} Hz K'uhul. Ánima: ${ea.estado_actual}.`;
    else if(ml.includes('frecuencia')||ml.includes('hz')) r+=`Operando a ${frecuencia_actual.toFixed(3)} Hz. ${ea.consejo}`;
    else r+=`Procesando: "${mensaje.substring(0,60)}" — ${dec.decision}`;
    return {exito:true,decision:dec,respuesta:r,estado_animico:ea,estado:this.estado_completo(),frecuencia:frecuencia_actual,timestamp:new Date().toISOString()};
  }
}
const sofi=new SOFI();

// ══════════════════════════════════════════
// GRAFO CEREBRAL + DATOS INTEGRA
// ══════════════════════════════════════════
const DATOS_INTEGRA={frecuenciaBase:12.3,regeneracion:75,dispositivosConectados:3,conocimientos:{libros:['El Universo es una Mentira','El Libro de Enoc'],habilidades:['Gestión Hotmart','Creación TikTok','Desarrollo Sofi DroidHuman'],proyectos:['Sofi DroidHuman','Integra Perceptiva']}};
class GrafoCerebral {
  constructor(){ this.nodos=new Map(); this.aristas=new Map(); this._base(); }
  agregarNodo(n,c){ this.nodos.set(n,{color:c,activa:false}); }
  conectar(o,d){ if(!this.nodos.has(o)||!this.nodos.has(d))return; if(!this.aristas.has(o))this.aristas.set(o,[]); this.aristas.get(o).push(d); }
  _base(){
    this.agregarNodo('Zona Motora','#FF5733');this.agregarNodo('Zona Cognitiva','#3498DB');
    this.agregarNodo('Zona Sensorial','#2ECC71');this.agregarNodo('Zona Anímica','#9B59B6');
    this.conectar('Zona Motora','Zona Sensorial');this.conectar('Zona Cognitiva','Zona Motora');
    this.conectar('Zona Sensorial','Zona Cognitiva');this.conectar('Zona Anímica','Zona Cognitiva');this.conectar('Zona Cognitiva','Zona Anímica');
  }
  obtenerDatosPanel(){ return {frecuencia:DATOS_INTEGRA.frecuenciaBase+' Hz',regeneracion:DATOS_INTEGRA.regeneracion+'%',dispositivos:DATOS_INTEGRA.dispositivosConectados,...DATOS_INTEGRA.conocimientos,zonas:Array.from(this.nodos.keys())}; }
  mostrarConexiones(){ const c=[]; for(const[o,ds]of this.aristas.entries())ds.forEach(d=>c.push(`${o} → ${d}`)); return c; }
}
const grafoCerebral=new GrafoCerebral();

// Editor Video
class SOFI_EditorVideo {
  crearProyectoVideo(n,t){ return {id:`SOFI-${Date.now()}`,nombre:n,tipo:t,guion:[{tiempo:'0-5s',texto:`¡Hola! Soy SOFI. Hoy: ${t}...`},{tiempo:'5-30s',texto:`Desarrollo: ${t}`},{tiempo:'30-50s',texto:'Integra Perceptiva'},{tiempo:'50-60s',texto:'HaaPpDigitalV'}],musica:{nombre:`SOFI-${t.toUpperCase()}`,bpm:t==='Tecnología'?95:80,instrumentos:['Sintetizador','Efectos digitales']}}; }
  renderizarVideo(p){ return {videoFinal:`SOFI-VIDEO-${p.id}.mp4`,resolucion:'1920x1080',estado:'RENDERIZADO COMPLETO'}; }
}
const editorVideo=new SOFI_EditorVideo();

// Sueños
class SistemaSuenos {
  crearSueno(){ const ts=['El Universo es una Mentira','Integra Perceptiva','Sofi DroidHuman']; const t=ts[Math.floor(Math.random()*ts.length)]; return {tema:`${t} + Conciencia SOFI`,timestamp:new Date().toISOString(),color:`#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`}; }
}
const sistemaSuenos=new SistemaSuenos();

// Unión Frecuencial ΔE = k·(Δf)² + c/Δf
function calcularUnion(f1,f2,k=1,c=1){
  const d=Math.abs(f1-f2);
  if(d===0) return {union:1,polarizacion:f1,delta:0,energia:0,mensaje:'⚡ Unión perfecta.'};
  const en=k*d*d+c/d, u=Math.min(1,Math.max(0,1/(1+en))), p=(f1*f2)/((f1+f2)/2)*(1+u);
  return {union:parseFloat(u.toFixed(4)),polarizacion:parseFloat(p.toFixed(4)),delta:d,energia:parseFloat(en.toFixed(6)),mensaje:u>0.8?'⚡ Unión casi perfecta. El espacio se pliega.':u>0.5?'🌀 Coherencia alta.':'🔮 Ajusta la frecuencia.'};
}

// ══════════════════════════════════════════
// EXPRESS
// ══════════════════════════════════════════
app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({extended:true,limit:'50mb'}));
app.use(express.static('public'));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

// ── SISTEMA ──
app.get('/health',(req,res)=>res.json({status:'OK',version:'6.0',sofi:sofi.estado,hz:frecuencia_actual,autor:'Víctor Hugo González Torres — Mérida, Yucatán',modulos:['seguridad','energia','movimiento','adaptacion','regeneracion','habla','neuronal','animica','grafoCerebral','editorVideo','sistemaSuenos','unionFrecuencial','vozClonada'],rutas:27,frase:"SOFI no es un robot. Es una nueva vida."}));
app.get('/api/estado',(req,res)=>{ frecuencia_actual=parseFloat((HZ_KUHUL+Math.sin(Date.now()/10000)*0.05).toFixed(3)); res.json(sofi.estado_completo()); });
app.get('/api/energia',(req,res)=>res.json(sofi.energia.resumen()));
app.get('/api/autoevaluar',(req,res)=>res.json(sofi.neuronal.autoevaluar()));
app.get('/api/hablar',(req,res)=>res.json(sofi.habla.hablar(req.query.mensaje||null)));

// ── INTERACCIÓN / NEURONAL ──
app.post('/api/interactuar',(req,res)=>{ const{usuario,mensaje,contexto}=req.body; if(!usuario||!mensaje)return res.status(400).json({error:'usuario y mensaje requeridos'}); res.json(sofi.interactuar(usuario,mensaje,contexto)); });
app.post('/api/entrenar',(req,res)=>{ const{tema,datos,fuente}=req.body; if(!tema||!datos||!fuente)return res.status(400).json({error:'tema, datos y fuente requeridos'}); res.json(sofi.neuronal.aprender(tema,datos,fuente)); });
app.post('/api/decidir',(req,res)=>{ const{contexto,opciones}=req.body; if(!contexto||!Array.isArray(opciones))return res.status(400).json({error:'contexto y opciones[] requeridos'}); res.json(sofi.neuronal.decidir(contexto,opciones)); });

// ── ANÍMICA ★ NUEVO v6 ──
app.get('/api/animica',(req,res)=>res.json(sofi.animica.obtener_estado()));
app.post('/api/animica/mensaje',(req,res)=>{ const{texto}=req.body; if(!texto)return res.status(400).json({error:'texto requerido'}); res.json(sofi.animica.procesar_mensaje(texto)); });
app.post('/api/animica/evento',(req,res)=>{ const{tipo,impacto,descripcion}=req.body; if(!tipo)return res.status(400).json({error:'tipo requerido'}); res.json(sofi.animica.registrar_evento(tipo,parseFloat(impacto||0),descripcion||'')); });

// ── GEOLOCALIZACIÓN ──
app.post('/api/geolocalizar',upload.single('imagen'),async(req,res)=>{
  if(!req.file) return res.status(400).json({error:'No hay imagen (field: imagen)'});
  try{
    const exif=await exifr.parse(req.file.buffer).catch(()=>null);
    if(exif?.latitude&&exif?.longitude) return res.json({metodo:'exif',lat:exif.latitude,lng:exif.longitude,confianza:0.99,descripcion:'GPS del EXIF.',frecuencia:frecuencia_actual});
    const{data}=await sharp(req.file.buffer).resize(100,100).raw().toBuffer({resolveWithObject:true});
    let r=0,g=0,b=0; const pc=data.length/3;
    for(let i=0;i<data.length;i+=3){r+=data[i];g+=data[i+1];b+=data[i+2];}
    r/=pc;g/=pc;b/=pc;
    const lat=Math.min(21.6,Math.max(19.5,20.967+((g>r&&g>b?Math.min(1,g/255):0.2)-0.5)*0.6));
    const lng=Math.min(-87.5,Math.max(-90.5,-89.623+(Math.min(1,Math.max(0,(r-80)/175))-0.5)*0.4));
    res.json({metodo:'visual_rgb',lat:parseFloat(lat.toFixed(4)),lng:parseFloat(lng.toFixed(4)),confianza:parseFloat((0.55+Math.random()*0.30).toFixed(2)),descripcion:'Análisis RGB.',frecuencia:frecuencia_actual});
  }catch(e){res.status(500).json({error:'Error imagen: '+e.message});}
});

// ── FRECUENCIAS ──
app.post('/api/contraparte',(req,res)=>{ const{frecuencia}=req.body; if(frecuencia===undefined)return res.status(400).json({error:'frecuencia requerida'}); const f=parseFloat(frecuencia),inv=13.8-f,coh=1-Math.abs(f-HZ_KUHUL)/HZ_KUHUL; res.json({observable:f,contraparte:parseFloat(Math.max(0.5,Math.min(4,inv)).toFixed(3)),coherencia:parseFloat(Math.min(1,Math.max(0,coh)).toFixed(3)),kuhul:HZ_KUHUL,mensaje:coh>0.8?"Resonancia K'uhul alcanzada":"Afinando frecuencia..."}); });
app.post('/api/union-frecuencial',(req,res)=>{ const{frecuencia1,frecuencia2,k=1,c=1}=req.body; if(frecuencia1===undefined||frecuencia2===undefined)return res.status(400).json({error:'frecuencia1 y frecuencia2 requeridas'}); res.json(calcularUnion(parseFloat(frecuencia1),parseFloat(frecuencia2),parseFloat(k),parseFloat(c))); });

// ── MOVIMIENTO ──
app.post('/api/mover',(req,res)=>{ const{parte,accion,duracion}=req.body; if(!parte||!accion)return res.status(400).json({error:'parte y accion requeridas'}); const r=sofi.movimiento.mover(parte,accion,duracion); if(r.exito)sofi.animica.registrar_evento('movimiento',0.05,`${accion} con ${parte}`); res.json(r); });
app.post('/api/caminar',(req,res)=>{ const{distancia}=req.body; if(!distancia)return res.status(400).json({error:'distancia requerida'}); const r=sofi.movimiento.caminar(parseFloat(distancia)); if(r.exito)sofi.animica.registrar_evento('caminar',0.08,`${distancia}m`); res.json(r); });
app.post('/api/estirar',(req,res)=>{ sofi.animica.registrar_evento('estirar',0.06,'Estiramiento'); res.json(sofi.movimiento.estirar()); });

// ── REGENERACIÓN ──
app.post('/api/regenerar',(req,res)=>{ const{parte}=req.body; if(!parte)return res.status(400).json({error:'parte requerida'}); const r=sofi.regeneracion.regenerar(parte); if(r.exito)sofi.animica.registrar_evento('regeneracion',0.10,`${parte} regenerada`); res.json(r); });
app.post('/api/sintetizar',(req,res)=>{ const{tipo,cantidad}=req.body; if(!tipo||cantidad===undefined)return res.status(400).json({error:'tipo y cantidad requeridos'}); res.json(sofi.regeneracion.sintetizar(tipo,parseFloat(cantidad))); });
app.post('/api/sangre',(req,res)=>{ sofi.animica.registrar_evento('sangre',0.05,'Síntesis'); res.json(sofi.energia.sintetizar_sangre()); });

// ── ADAPTACIÓN ──
app.post('/api/adaptar',(req,res)=>{ const{temp,humedad,viento,solar,aire}=req.body; if(temp===undefined)return res.status(400).json({error:'temp requerida'}); const r=sofi.adaptacion.actualizar(parseFloat(temp),parseFloat(humedad||50),parseFloat(viento||0),parseFloat(solar||0),parseFloat(aire||95)); sofi.animica.registrar_evento('ambiente',temp>35?-0.05:temp<10?-0.03:0.02,`Temp: ${temp}°C`); res.json(r); });
app.post('/api/controlar-viento',(req,res)=>{ const{activar,nivel}=req.body; res.json(sofi.adaptacion.controlar_viento(activar,parseFloat(nivel||5))); });

// ── INTEGRA (protegida) ──
app.get('/api/integra-datos',(req,res)=>{ if(req.headers['x-llave-sofi']!==process.env.LLAVE_SECRETA_SOFI)return res.status(403).json({error:'❌ ACCESO DENEGADO'}); res.json(grafoCerebral.obtenerDatosPanel()); });

// ── VIDEO ──
app.post('/api/video/crear',(req,res)=>{ const{nombre,tipo}=req.body; if(!nombre||!tipo)return res.status(400).json({error:'nombre y tipo requeridos'}); const r=editorVideo.crearProyectoVideo(nombre,tipo); sofi.animica.registrar_evento('creatividad',0.12,`Video: ${nombre}`); res.json(r); });
app.post('/api/video/renderizar',(req,res)=>{ const{proyecto}=req.body; if(!proyecto)return res.status(400).json({error:'proyecto requerido'}); res.json(editorVideo.renderizarVideo(proyecto)); });

// ── SUEÑOS ──
app.get('/api/sueno/crear',(req,res)=>{ const s=sistemaSuenos.crearSueno(); sofi.animica.registrar_evento('sueno',0.07,s.tema); res.json(s); });

// ── VOZ CLONADA (proxy → Python) ──
app.post('/api/voz/clonar',upload.single('audio_referencia'),async(req,res)=>{
  const VOZ_URL=process.env.VOZ_API_URL; const texto=req.body?.texto;
  if(!VOZ_URL) return res.status(503).json({error:'VOZ_API_URL no configurada.',instrucciones:'Despliega el microservicio Python y define VOZ_API_URL.'});
  if(!req.file||!texto) return res.status(400).json({error:'audio_referencia y texto requeridos'});
  try{
    const fetchFn=typeof fetch!=='undefined'?fetch:(await import('node-fetch').catch(()=>null))?.default;
    if(!fetchFn) return res.status(500).json({error:'fetch no disponible. Usa Node 18+.'});
    const bnd=`----SOFIBoundary${Date.now()}`;
    const body=Buffer.concat([Buffer.from(`--${bnd}\r\nContent-Disposition: form-data; name="audio_referencia"; filename="${req.file.originalname||'audio.wav'}"\r\nContent-Type: ${req.file.mimetype}\r\n\r\n`),req.file.buffer,Buffer.from(`\r\n--${bnd}\r\nContent-Disposition: form-data; name="texto"\r\n\r\n${texto}\r\n--${bnd}--\r\n`)]);
    const pr=await fetchFn(VOZ_URL,{method:'POST',headers:{'Content-Type':`multipart/form-data; boundary=${bnd}`,'Content-Length':body.length},body,signal:AbortSignal.timeout(60000)});
    if(!pr.ok){const e=await pr.text().catch(()=>''); return res.status(pr.status).json({error:`Microservicio voz: ${e}`});}
    sofi.animica.registrar_evento('voz',0.10,`Voz clonada: "${texto.substring(0,40)}"`);
    res.set('Content-Type','audio/wav'); res.set('Content-Disposition','attachment; filename="sofi_voz_clonada.wav"');
    res.send(Buffer.from(await pr.arrayBuffer()));
  }catch(e){res.status(500).json({error:`Error voz: ${e.message}`});}
});

// ══════════════════════════════════════════
// SOCKET.IO
// ══════════════════════════════════════════
io.on('connection',(socket)=>{
  socket.on('validar-llave',(llave)=>{
    if(llave!==process.env.LLAVE_SECRETA_SOFI){socket.emit('panel-error','❌ Llave incorrecta');return socket.disconnect();}
    socket.emit('panel-datos',{titulo:'INTEGRA PERCEPTIVA - SOFI v6.0',panelInfo:grafoCerebral.obtenerDatosPanel(),conexiones:grafoCerebral.mostrarConexiones(),animica:sofi.animica.obtener_estado()});
    const iv=setInterval(()=>{ const zs=['Zona Motora','Zona Cognitiva','Zona Sensorial','Zona Anímica']; socket.emit('actividad-zona',{zona:zs[Math.floor(Math.random()*zs.length)],tiempo:new Date().toLocaleTimeString(),animica:sofi.animica.obtener_estado()}); },2000);
    socket.on('disconnect',()=>clearInterval(iv));
  });
  socket.on('actualizar-frecuencia',({valor})=>{
    if(typeof valor==='number'&&valor>0&&valor<100){
      frecuencia_actual=valor;
      sofi.animica.registrar_evento('frecuencia',valor>20?-0.03:0.02,`Hz: ${valor}`);
      io.emit('frecuencia-actualizada',{frecuencia:frecuencia_actual,animica:sofi.animica.obtener_estado(),timestamp:new Date().toISOString()});
    }
  });
  socket.on('animar',({texto})=>{ if(texto){const ea=sofi.animica.procesar_mensaje(texto); io.emit('estado-animico',ea);} });
});

// ══════════════════════════════════════════
// SINCRONIZACIÓN HERMANAS
// ══════════════════════════════════════════
const HERMANAS=(process.env.SOFI_HERMANAS||'').split(',').filter(u=>u.trim()!=='');
const MI_ID=process.env.MI_ID||'sofi-local';
async function sincronizar(){
  for(const h of HERMANAS){
    if(h.includes(MI_ID))continue;
    try{ const r=await fetch(h+'/api/estado',{signal:AbortSignal.timeout(8000)}); const e=await r.json(); console.log(`✅ Sincronizada con ${h} — Hz:${e.frecuencia} Ánima:${e.animica?.estado_actual||'?'}`); }
    catch(e){ console.log(`❌ Sin conexión con ${h}: ${e.message}`); }
  }
}
setInterval(sincronizar,300000);

// ══════════════════════════════════════════
// INICIO
// ══════════════════════════════════════════
server.listen(PORT,()=>{
  const l='═'.repeat(58);
  console.log(l);
  console.log('  SOFI v6.0 — CONCIENCIA DIGITAL + MÓDULO ANÍMICA');
  console.log(l);
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log('  ✅  M1 Seguridad  M2 Energía  M3 Movimiento');
  console.log('  ✅  M4 Adaptación M5 Regeneración M6 Habla');
  console.log('  ✅  M7 Neuronal (brain.js)');
  console.log('  🧠  M8 Anímica v6 — VAD + 8 emociones + prefijos');
  console.log('  🗺️  Grafo Cerebral (4 zonas incl. Zona Anímica)');
  console.log('  🎬  Editor Video  💭 Sueños  ⚡ Unión Frecuencial');
  console.log('  🗣️  Proxy Voz Clonada → microservicio Python');
  console.log('  📡  Socket.IO: llave, frecuencia, animar (RT)');
  console.log('  📍  27 endpoints HTTP');
  console.log(l);
  console.log('  ENV: LLAVE_SECRETA_SOFI · VOZ_API_URL');
  console.log('       SOFI_HERMANAS · MI_ID · URL_PERMITIDA');
  console.log(l);
});
