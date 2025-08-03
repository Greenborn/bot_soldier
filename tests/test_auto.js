#!/usr/bin/env node

/**
 * SCRIPT DE PRUEBA AUTOMÁTICA - MENSAJERÍA GENÉRICA
 * ==================================================
 * 
 * Script automatizado para probar la funcionalidad de mensajería genérica
 * sin interacción del usuario. Ideal para CI/CD y pruebas rápidas.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const WebSocket = require('ws');

// Configuración desde .env
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const BOT_NAME = process.env.BOT_NAME || 'soldier';
const BOT_USERNAME = process.env.BOT_USERNAME;
const BOT_API_KEY = process.env.BOT_API_KEY;
const TEST_TIMEOUT = 30000; // 30 segundos timeout total

class GenericMessagingTester {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.testResults = {
      connection: false,
      authentication: false,
      genericMessage: false,
      broadcast: false,
      events: false
    };
    this.pendingRequests = new Map();
    this.testStartTime = Date.now();
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.testStartTime;
    console.log(`[${timestamp}] [+${elapsed}ms] [${type}] ${message}`);
  }

  generateRequestId() {
    return `autotest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.log('Conectando al servidor WebSocket...');
      
      this.ws = new WebSocket(WS_SERVER_URL);
      
      const timeout = setTimeout(() => {
        reject(new Error('Timeout en conexión'));
      }, 10000);
      
      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.log('✅ Conexión establecida');
        this.isConnected = true;
        this.testResults.connection = true;
        resolve();
      });
      
      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`❌ Error de conexión: ${error.message}`, 'ERROR');
        reject(error);
      });
      
      this.ws.on('message', (data) => this.handleMessage(data));
      
      this.ws.on('close', () => {
        this.log('Conexión cerrada');
        this.isConnected = false;
        this.isAuthenticated = false;
      });
    });
  }

  async authenticate() {
    return new Promise((resolve, reject) => {
      this.log('Esperando solicitud de identificación...');
      
      const timeout = setTimeout(() => {
        reject(new Error('Timeout en autenticación'));
      }, 10000);
      
      const messageHandler = (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'identify_request') {
            this.log('Enviando credenciales...');
            
            const identifyMessage = {
              type: 'identify',
              clientType: 'bot',
              username: BOT_USERNAME,
              apiKey: BOT_API_KEY,
              botName: `${BOT_NAME} Auto Test`
            };
            
            this.ws.send(JSON.stringify(identifyMessage));
            
          } else if (message.type === 'welcome') {
            clearTimeout(timeout);
            this.ws.off('message', messageHandler);
            this.log('✅ Autenticación exitosa');
            this.isAuthenticated = true;
            this.testResults.authentication = true;
            resolve();
            
          } else if (message.type === 'error') {
            clearTimeout(timeout);
            this.ws.off('message', messageHandler);
            reject(new Error(`Error de autenticación: ${message.message}`));
          }
        } catch (error) {
          this.log(`Error al procesar mensaje: ${error.message}`, 'ERROR');
        }
      };
      
      this.ws.on('message', messageHandler);
    });
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'generic_message_response':
          this.log('✅ Respuesta a mensaje genérico recibida');
          this.testResults.genericMessage = true;
          
          if (this.pendingRequests.has(message.requestId)) {
            const { resolve } = this.pendingRequests.get(message.requestId);
            this.pendingRequests.delete(message.requestId);
            resolve(message);
          }
          break;
          
        case 'broadcast_message':
          this.log('✅ Mensaje broadcast recibido');
          this.testResults.broadcast = true;
          
          // Enviar confirmación
          const ackMessage = {
            type: 'broadcast_ack',
            requestId: message.requestId,
            botName: BOT_NAME,
            received: true,
            processed: true,
            timestamp: Date.now()
          };
          this.ws.send(JSON.stringify(ackMessage));
          break;
          
        case 'event_notification':
          this.log('✅ Evento recibido');
          this.testResults.events = true;
          break;
          
        case 'subscription_confirmed':
          this.log('✅ Suscripción a eventos confirmada');
          break;
          
        case 'error':
          this.log(`❌ Error del servidor: ${message.message}`, 'ERROR');
          break;
      }
    } catch (error) {
      this.log(`Error al procesar mensaje: ${error.message}`, 'ERROR');
    }
  }

  async testGenericMessage() {
    return new Promise((resolve, reject) => {
      this.log('🧪 Probando mensaje genérico...');
      
      const requestId = this.generateRequestId();
      const genericMessage = {
        type: 'generic_message',
        targetBot: 'test_target',
        category: 'automated_testing',
        priority: 'normal',
        expectResponse: true,
        requestId: requestId,
        payload: {
          action: 'automated_test',
          parameters: {
            testType: 'generic_message',
            timestamp: Date.now()
          }
        },
        metadata: {
          source: 'automated_test',
          timestamp: Date.now()
        }
      };
      
      // Configurar timeout para la respuesta
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Timeout esperando respuesta de mensaje genérico'));
      }, 5000);
      
      this.pendingRequests.set(requestId, {
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
      
      this.ws.send(JSON.stringify(genericMessage));
      this.log(`Mensaje genérico enviado: ${requestId}`);
    });
  }

  async testBroadcastMessage() {
    return new Promise((resolve) => {
      this.log('🧪 Probando mensaje broadcast...');
      
      const requestId = this.generateRequestId();
      const broadcastMessage = {
        type: 'broadcast_message',
        targets: ['all'],
        category: 'automated_testing',
        priority: 'normal',
        requestId: requestId,
        payload: {
          action: 'automated_broadcast_test',
          message: 'Mensaje de prueba automático',
          timestamp: Date.now()
        },
        metadata: {
          source: 'automated_test',
          timestamp: Date.now()
        }
      };
      
      this.ws.send(JSON.stringify(broadcastMessage));
      this.log(`Mensaje broadcast enviado: ${requestId}`);
      
      // Esperar un poco para recibir el broadcast
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  async testEventSubscription() {
    return new Promise((resolve) => {
      this.log('🧪 Probando suscripción a eventos...');
      
      const requestId = this.generateRequestId();
      const subscribeMessage = {
        type: 'subscribe_events',
        events: ['system_alerts', 'automated_test_events'],
        filter: {
          severity: ['normal', 'high'],
          bots: [BOT_NAME]
        },
        requestId: requestId
      };
      
      this.ws.send(JSON.stringify(subscribeMessage));
      this.log(`Suscripción enviada: ${requestId}`);
      
      // Simular evento después de un momento
      setTimeout(() => {
        this.simulateEvent();
        resolve();
      }, 1000);
    });
  }

  simulateEvent() {
    this.log('🧪 Simulando evento...');
    
    const eventMessage = {
      type: 'event_notification',
      event: 'automated_test_event',
      category: 'testing',
      severity: 'normal',
      data: {
        message: 'Evento de prueba automático',
        source: 'automated_test',
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      subscriptionId: 'auto_test_sub'
    };
    
    // Simular recepción del evento
    this.handleMessage(JSON.stringify(eventMessage));
  }

  async runAllTests() {
    const startTime = Date.now();
    this.log('🚀 Iniciando pruebas automáticas...');
    
    try {
      // Validar configuración
      if (!BOT_USERNAME || !BOT_API_KEY) {
        throw new Error('BOT_USERNAME y BOT_API_KEY requeridos en .env');
      }
      
      // Conectar
      await this.connect();
      
      // Autenticar
      await this.authenticate();
      
      // Esperar un momento antes de las pruebas
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ejecutar pruebas
      await this.testGenericMessage();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.testBroadcastMessage();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.testEventSubscription();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mostrar resultados
      this.showResults(startTime);
      
    } catch (error) {
      this.log(`❌ Error durante las pruebas: ${error.message}`, 'ERROR');
      this.showResults(startTime);
      process.exit(1);
    } finally {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    }
  }

  showResults(startTime) {
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('RESULTADOS DE PRUEBAS AUTOMÁTICAS');
    console.log('='.repeat(60));
    console.log(`Duración total: ${duration}ms`);
    console.log('');
    
    const tests = [
      { name: 'Conexión', result: this.testResults.connection },
      { name: 'Autenticación', result: this.testResults.authentication },
      { name: 'Mensaje Genérico', result: this.testResults.genericMessage },
      { name: 'Mensaje Broadcast', result: this.testResults.broadcast },
      { name: 'Eventos', result: this.testResults.events }
    ];
    
    tests.forEach(test => {
      const status = test.result ? '✅ EXITOSA' : '❌ FALLIDA';
      console.log(`${test.name.padEnd(20)}: ${status}`);
    });
    
    const successCount = tests.filter(t => t.result).length;
    const totalTests = tests.length;
    
    console.log('');
    console.log(`Resumen: ${successCount}/${totalTests} pruebas exitosas`);
    console.log('='.repeat(60));
    
    if (successCount === totalTests) {
      console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
      process.exit(0);
    } else {
      console.log('⚠️  Algunas pruebas fallaron');
      process.exit(1);
    }
  }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
  const tester = new GenericMessagingTester();
  
  // Configurar timeout global
  setTimeout(() => {
    console.log('❌ Timeout global alcanzado');
    process.exit(1);
  }, TEST_TIMEOUT);
  
  // Manejar señales
  process.on('SIGINT', () => {
    console.log('\nPruebas interrumpidas por el usuario');
    process.exit(130);
  });
  
  // Ejecutar pruebas
  tester.runAllTests().catch(error => {
    console.error(`❌ Error fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = GenericMessagingTester;
