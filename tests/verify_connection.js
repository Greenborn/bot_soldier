#!/usr/bin/env node

/**
 * VERIFICADOR RÁPIDO DE CONEXIÓN
 * ==============================
 * 
 * Script simple para verificar que la configuración del .env es correcta
 * y que se puede establecer conexión con el servidor coordinador.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const WebSocket = require('ws');

const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const BOT_USERNAME = process.env.BOT_USERNAME;
const BOT_API_KEY = process.env.BOT_API_KEY;

console.log('🔍 VERIFICADOR DE CONEXIÓN BOT SOLDIER');
console.log('=====================================');
console.log(`Server URL: ${WS_SERVER_URL}`);
console.log(`Bot Username: ${BOT_USERNAME || 'NO CONFIGURADO'}`);
console.log(`API Key: ${BOT_API_KEY ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
console.log('');

// Validar configuración básica
if (!BOT_USERNAME || !BOT_API_KEY) {
  console.error('❌ ERROR: BOT_USERNAME y BOT_API_KEY son requeridos');
  console.error('   Configura estas variables en tu archivo .env');
  process.exit(1);
}

console.log('⏳ Intentando conectar...');

const ws = new WebSocket(WS_SERVER_URL);
let connectionSuccess = false;

const timeout = setTimeout(() => {
  if (!connectionSuccess) {
    console.error('❌ TIMEOUT: No se pudo conectar en 10 segundos');
    console.error('   Verifica que el servidor esté ejecutándose en:', WS_SERVER_URL);
    process.exit(1);
  }
}, 10000);

ws.on('open', () => {
  connectionSuccess = true;
  clearTimeout(timeout);
  console.log('✅ Conexión WebSocket establecida exitosamente');
  
  // Probar autenticación básica
  console.log('⏳ Probando autenticación...');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    
    if (message.type === 'identify_request') {
      console.log('📝 Servidor solicita identificación');
      
      const identifyMessage = {
        type: 'identify',
        clientType: 'bot',
        username: BOT_USERNAME,
        apiKey: BOT_API_KEY,
        botName: 'Connection Test Bot'
      };
      
      ws.send(JSON.stringify(identifyMessage));
      console.log('📤 Credenciales enviadas');
      
    } else if (message.type === 'welcome') {
      console.log('✅ Autenticación exitosa');
      console.log('🎉 ¡Configuración correcta! El bot puede conectarse.');
      ws.close();
      process.exit(0);
      
    } else if (message.type === 'error') {
      console.error('❌ Error de autenticación:', message.message);
      console.error('   Verifica BOT_USERNAME y BOT_API_KEY en .env');
      ws.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error al procesar mensaje:', error.message);
  }
});

ws.on('error', (error) => {
  clearTimeout(timeout);
  console.error('❌ Error de conexión:', error.message);
  
  if (error.code === 'ECONNREFUSED') {
    console.error('   El servidor no está disponible en:', WS_SERVER_URL);
  } else if (error.code === 'ENOTFOUND') {
    console.error('   No se puede resolver el hostname');
  }
  
  process.exit(1);
});

ws.on('close', (code, reason) => {
  if (code !== 1000) {
    console.log(`⚠️  Conexión cerrada: ${code} ${reason || ''}`);
  }
});

// Manejar interrupción
process.on('SIGINT', () => {
  console.log('\n🛑 Verificación interrumpida por el usuario');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  process.exit(130);
});
