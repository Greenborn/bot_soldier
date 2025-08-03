#!/usr/bin/env node

/**
 * SCRIPT DE PRUEBA - FUNCIONALIDAD GENÉRICA DE ENVÍO DE INFORMACIÓN
 * ================================================================
 * 
 * Este script prueba la funcionalidad de mensajería genérica del bot soldier,
 * incluyendo:
 * - Conexión WebSocket al coordinador
 * - Envío de mensajes genéricos al front
 * - Recepción de mensajes broadcast
 * - Suscripción y notificación de eventos
 * - Manejo de errores y reconexión
 * 
 * Utiliza la configuración del archivo .env para establecer la conexión.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const WebSocket = require('ws');
const readline = require('readline');

// ================================================================
// CONFIGURACIÓN DESDE .ENV
// ================================================================
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const BOT_NAME = process.env.BOT_NAME || 'soldier';
const BOT_USERNAME = process.env.BOT_USERNAME;
const BOT_API_KEY = process.env.BOT_API_KEY;
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL, 10) || 30000;

// ================================================================
// VARIABLES GLOBALES
// ================================================================
let ws = null;
let isConnected = false;
let isAuthenticated = false;
let heartbeatTimer = null;
let testResults = {
  connection: false,
  authentication: false,
  genericMessage: false,
  broadcast: false,
  events: false
};

// Interface de línea de comandos
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ================================================================
// FUNCIONES DE UTILIDAD
// ================================================================

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${type}]`;
  console.log(`${prefix} ${message}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'SUCCESS');
}

function logError(message) {
  log(`❌ ${message}`, 'ERROR');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'WARNING');
}

function generateUniqueId() {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ================================================================
// FUNCIONES DE HEARTBEAT
// ================================================================

function startHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN && isAuthenticated) {
      const heartbeat = {
        type: 'heartbeat',
        timestamp: Date.now(),
        status: {
          state: 'testing',
          currentAction: 'generic_messaging_test',
          actionsQueued: 0,
          systemInfo: {
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            uptime: Date.now()
          }
        }
      };
      
      ws.send(JSON.stringify(heartbeat));
      log('Heartbeat enviado', 'HEARTBEAT');
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ================================================================
// FUNCIONES DE CONEXIÓN Y AUTENTICACIÓN
// ================================================================

function connectToServer() {
  return new Promise((resolve, reject) => {
    log(`Conectando a ${WS_SERVER_URL}...`);
    
    ws = new WebSocket(WS_SERVER_URL);
    
    ws.on('open', () => {
      log('Conexión WebSocket establecida');
      isConnected = true;
      testResults.connection = true;
      resolve();
    });
    
    ws.on('error', (error) => {
      logError(`Error de conexión: ${error.message}`);
      isConnected = false;
      reject(error);
    });
    
    ws.on('close', () => {
      log('Conexión WebSocket cerrada');
      isConnected = false;
      isAuthenticated = false;
      stopHeartbeat();
    });
    
    ws.on('message', handleMessage);
  });
}

function authenticateBot() {
  return new Promise((resolve, reject) => {
    if (!BOT_USERNAME || !BOT_API_KEY) {
      logError('BOT_USERNAME y BOT_API_KEY son requeridos en el archivo .env');
      reject(new Error('Credenciales faltantes'));
      return;
    }
    
    log('Esperando solicitud de identificación...');
    
    // Configurar timeout para autenticación
    const authTimeout = setTimeout(() => {
      logError('Timeout en autenticación');
      reject(new Error('Timeout en autenticación'));
    }, 10000);
    
    // Función temporal para manejar identificación
    const handleAuth = (message) => {
      if (message.type === 'identify_request') {
        log('Enviando credenciales de autenticación...');
        
        const identifyMessage = {
          type: 'identify',
          clientType: 'bot',
          username: BOT_USERNAME,
          apiKey: BOT_API_KEY,
          botName: `${BOT_NAME} Test Client`
        };
        
        ws.send(JSON.stringify(identifyMessage));
        log('Credenciales enviadas');
        
      } else if (message.type === 'welcome') {
        logSuccess('Autenticación exitosa');
        isAuthenticated = true;
        testResults.authentication = true;
        clearTimeout(authTimeout);
        startHeartbeat();
        resolve();
        
      } else if (message.type === 'error' && message.code) {
        logError(`Error de autenticación: ${message.code} - ${message.message}`);
        clearTimeout(authTimeout);
        reject(new Error(message.message));
      }
    };
    
    // Agregar listener temporal
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleAuth(message);
      } catch (error) {
        logError(`Error al parsear mensaje: ${error.message}`);
      }
    });
  });
}

// ================================================================
// MANEJO DE MENSAJES
// ================================================================

function handleMessage(data) {
  try {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'heartbeat_ack':
        log('Heartbeat confirmado por el servidor', 'HEARTBEAT');
        break;
        
      case 'generic_message_response':
        logSuccess(`Respuesta a mensaje genérico recibida: ${message.requestId}`);
        if (message.success) {
          testResults.genericMessage = true;
          log(`Payload de respuesta: ${JSON.stringify(message.payload)}`);
        }
        break;
        
      case 'broadcast_message':
        logSuccess(`Mensaje broadcast recibido: ${message.category}`);
        testResults.broadcast = true;
        log(`Targets: ${message.targets?.join(', ')}`);
        log(`Payload: ${JSON.stringify(message.payload)}`);
        
        // Enviar confirmación de broadcast
        if (ws && ws.readyState === WebSocket.OPEN) {
          const ackMessage = {
            type: 'broadcast_ack',
            requestId: message.requestId,
            botName: BOT_NAME,
            received: true,
            processed: true,
            timestamp: Date.now()
          };
          ws.send(JSON.stringify(ackMessage));
          log('Confirmación de broadcast enviada');
        }
        break;
        
      case 'event_notification':
        logSuccess(`Evento recibido: ${message.event} (${message.severity})`);
        testResults.events = true;
        log(`Categoría: ${message.category}`);
        log(`Datos: ${JSON.stringify(message.data)}`);
        break;
        
      case 'subscription_confirmed':
        logSuccess(`Suscripción confirmada: ${message.subscriptionId}`);
        log(`Eventos: ${message.events.join(', ')}`);
        break;
        
      case 'error':
        logError(`Error del servidor: ${message.code} - ${message.message}`);
        break;
        
      default:
        log(`Mensaje recibido: ${message.type}`, 'DEBUG');
        break;
    }
  } catch (error) {
    logError(`Error al procesar mensaje: ${error.message}`);
  }
}

// ================================================================
// FUNCIONES DE PRUEBA
// ================================================================

async function testGenericMessage() {
  log('🧪 Probando mensaje genérico...');
  
  const requestId = generateUniqueId();
  const genericMessage = {
    type: 'generic_message',
    targetBot: 'test_target', // Simular que enviamos a otro bot
    category: 'testing',
    priority: 'normal',
    expectResponse: true,
    requestId: requestId,
    payload: {
      action: 'test_action',
      parameters: {
        testParam: 'valor_de_prueba',
        timestamp: Date.now()
      }
    },
    metadata: {
      source: 'test_client',
      userId: 'test_user',
      timestamp: Date.now()
    }
  };
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(genericMessage));
    log(`Mensaje genérico enviado con ID: ${requestId}`);
  } else {
    logError('WebSocket no está conectado');
  }
}

async function testBroadcastMessage() {
  log('🧪 Probando mensaje broadcast...');
  
  const requestId = generateUniqueId();
  const broadcastMessage = {
    type: 'broadcast_message',
    targets: ['all'], // Enviar a todos los bots
    category: 'testing',
    priority: 'normal',
    requestId: requestId,
    payload: {
      action: 'test_broadcast',
      message: 'Este es un mensaje de prueba broadcast',
      timestamp: Date.now()
    },
    metadata: {
      source: 'test_client',
      timestamp: Date.now()
    }
  };
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(broadcastMessage));
    log(`Mensaje broadcast enviado con ID: ${requestId}`);
  } else {
    logError('WebSocket no está conectado');
  }
}

async function testEventSubscription() {
  log('🧪 Probando suscripción a eventos...');
  
  const requestId = generateUniqueId();
  const subscribeMessage = {
    type: 'subscribe_events',
    events: ['system_alerts', 'bot_status_change', 'test_events'],
    filter: {
      severity: ['normal', 'high', 'critical'],
      bots: [BOT_NAME],
      exclude_sources: []
    },
    requestId: requestId
  };
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(subscribeMessage));
    log(`Suscripción a eventos enviada con ID: ${requestId}`);
  } else {
    logError('WebSocket no está conectado');
  }
}

async function simulateEvent() {
  log('🧪 Simulando evento del sistema...');
  
  // Simular un evento que podría ser enviado por el servidor
  const eventMessage = {
    type: 'event_notification',
    event: 'test_event',
    category: 'testing',
    severity: 'normal',
    data: {
      message: 'Evento de prueba simulado',
      source: 'test_client',
      timestamp: Date.now()
    },
    timestamp: Date.now(),
    subscriptionId: 'test_subscription'
  };
  
  // En una prueba real, este mensaje vendría del servidor
  // Aquí lo simulamos procesándolo directamente
  handleMessage(JSON.stringify(eventMessage));
}

// ================================================================
// MENÚ INTERACTIVO
// ================================================================

function showMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('MENÚ DE PRUEBAS - MENSAJERÍA GENÉRICA');
  console.log('='.repeat(60));
  console.log('1. Probar mensaje genérico');
  console.log('2. Probar mensaje broadcast');
  console.log('3. Suscribirse a eventos');
  console.log('4. Simular evento');
  console.log('5. Mostrar estado de pruebas');
  console.log('6. Ejecutar todas las pruebas');
  console.log('7. Cerrar conexión y salir');
  console.log('='.repeat(60));
  console.log('Selecciona una opción (1-7): ');
}

function showTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('ESTADO DE LAS PRUEBAS');
  console.log('='.repeat(60));
  console.log(`Conexión: ${testResults.connection ? '✅ EXITOSA' : '❌ FALLIDA'}`);
  console.log(`Autenticación: ${testResults.authentication ? '✅ EXITOSA' : '❌ FALLIDA'}`);
  console.log(`Mensaje Genérico: ${testResults.genericMessage ? '✅ EXITOSA' : '❌ FALLIDA'}`);
  console.log(`Mensaje Broadcast: ${testResults.broadcast ? '✅ EXITOSA' : '❌ FALLIDA'}`);
  console.log(`Eventos: ${testResults.events ? '✅ EXITOSA' : '❌ FALLIDA'}`);
  console.log('='.repeat(60));
  
  const successCount = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  console.log(`Resumen: ${successCount}/${totalTests} pruebas exitosas`);
}

async function runAllTests() {
  log('🚀 Ejecutando todas las pruebas...');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  await testGenericMessage();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await testBroadcastMessage();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await testEventSubscription();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await simulateEvent();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  showTestResults();
}

function handleUserInput(input) {
  const option = input.trim();
  
  switch (option) {
    case '1':
      testGenericMessage();
      break;
    case '2':
      testBroadcastMessage();
      break;
    case '3':
      testEventSubscription();
      break;
    case '4':
      simulateEvent();
      break;
    case '5':
      showTestResults();
      break;
    case '6':
      runAllTests();
      break;
    case '7':
      cleanup();
      return;
    default:
      logWarning('Opción no válida. Selecciona un número del 1 al 7.');
      break;
  }
  
  setTimeout(showMenu, 1000);
}

// ================================================================
// FUNCIÓN DE LIMPIEZA
// ================================================================

function cleanup() {
  log('Cerrando conexiones y limpiando recursos...');
  
  stopHeartbeat();
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  rl.close();
  
  setTimeout(() => {
    logSuccess('Script de prueba finalizado');
    process.exit(0);
  }, 1000);
}

// ================================================================
// FUNCIÓN PRINCIPAL
// ================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('SCRIPT DE PRUEBA - FUNCIONALIDAD GENÉRICA DE MENSAJERÍA');
  console.log('='.repeat(70));
  console.log(`Bot Name: ${BOT_NAME}`);
  console.log(`Bot Username: ${BOT_USERNAME || 'NO CONFIGURADO'}`);
  console.log(`Server URL: ${WS_SERVER_URL}`);
  console.log(`Heartbeat Interval: ${HEARTBEAT_INTERVAL}ms`);
  console.log('='.repeat(70));
  
  // Validar configuración
  if (!BOT_USERNAME || !BOT_API_KEY) {
    logError('Configuración incompleta en archivo .env');
    logError('Variables requeridas: BOT_USERNAME, BOT_API_KEY');
    process.exit(1);
  }
  
  try {
    // Conectar al servidor
    await connectToServer();
    logSuccess('Conexión establecida');
    
    // Autenticar bot
    await authenticateBot();
    logSuccess('Autenticación completada');
    
    // Configurar menú interactivo
    rl.on('line', handleUserInput);
    
    // Mostrar menú inicial
    showMenu();
    
  } catch (error) {
    logError(`Error durante la inicialización: ${error.message}`);
    cleanup();
  }
}

// ================================================================
// MANEJO DE SEÑALES DEL SISTEMA
// ================================================================

process.on('SIGINT', () => {
  log('Señal SIGINT recibida (Ctrl+C)');
  cleanup();
});

process.on('SIGTERM', () => {
  log('Señal SIGTERM recibida');
  cleanup();
});

process.on('uncaughtException', (error) => {
  logError(`Excepción no capturada: ${error.message}`);
  cleanup();
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Promesa rechazada no manejada: ${reason}`);
  cleanup();
});

// ================================================================
// EJECUTAR SCRIPT
// ================================================================

if (require.main === module) {
  main().catch((error) => {
    logError(`Error fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  connectToServer,
  authenticateBot,
  testGenericMessage,
  testBroadcastMessage,
  testEventSubscription,
  testResults
};
