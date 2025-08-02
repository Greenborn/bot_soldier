require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const yauzl = require('yauzl');
const { exec } = require('child_process');
const { promisify } = require('util');
const pty = require('node-pty');

// Promisificar exec para usar async/await
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const WS_LOCAL_PORT = parseInt(process.env.WS_LOCAL_PORT, 10) || 8081;
const BOT_NAME = process.env.BOT_NAME || 'soldier';
const BOT_USERNAME = process.env.BOT_USERNAME; // NUEVA VARIABLE REQUERIDA
const BOT_API_KEY = process.env.BOT_API_KEY; // NUEVA VARIABLE REQUERIDA
const RECONNECT_INTERVAL = parseInt(process.env.RECONNECT_INTERVAL, 10) || 5000; // ms
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL, 10) || 30000; // 30s por defecto
const DOWNLOADS_DIR = path.resolve(process.env.DOWNLOADS_DIR || './descargas');

console.log('Conectando a WebSocket en:', WS_SERVER_URL);

// Variables para manejar sesiones de terminal PTY
const activeSessions = new Map(); // sessionId -> { pty, requestId, command }
let sessionCounter = 0;

// Validar credenciales requeridas
if (!BOT_USERNAME || !BOT_API_KEY) {
  console.error('ERROR: BOT_USERNAME y BOT_API_KEY son requeridos para la autenticación');
  console.error('Por favor configura estas variables en tu archivo .env:');
  console.error('BOT_USERNAME=tu_username_registrado');
  console.error('BOT_API_KEY=tu_api_key_generada');
  process.exit(1);
}

// Crear directorio de descargas si no existe
async function ensureDownloadsDir() {
  try {
    await fs.access(DOWNLOADS_DIR);
  } catch (error) {
    await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
    console.log('Directorio de descargas creado:', DOWNLOADS_DIR);
  }
}

// Función para extraer archivo ZIP desde base64
async function extractZipFromBase64(base64Data, filename, extractTo = '') {
  try {
    // Decodificar base64
    const zipBuffer = Buffer.from(base64Data, 'base64');
    
    // Crear directorio de destino
    const targetDir = path.join(DOWNLOADS_DIR, extractTo);
    await fs.mkdir(targetDir, { recursive: true });
    
    // Escribir archivo ZIP temporal
    const tempZipPath = path.join(targetDir, `temp_${filename}`);
    await fs.writeFile(tempZipPath, zipBuffer);
    
    return new Promise((resolve, reject) => {
      const extractedFiles = [];
      
      yauzl.open(tempZipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(new Error(`Error al abrir ZIP: ${err.message}`));
          return;
        }
        
        zipfile.readEntry();
        
        zipfile.on('entry', (entry) => {
          const entryPath = path.join(targetDir, entry.fileName);
          
          if (/\/$/.test(entry.fileName)) {
            // Es un directorio
            fs.mkdir(entryPath, { recursive: true })
              .then(() => {
                extractedFiles.push(entry.fileName);
                zipfile.readEntry();
              })
              .catch(reject);
          } else {
            // Es un archivo
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Crear directorio padre si no existe
              const parentDir = path.dirname(entryPath);
              fs.mkdir(parentDir, { recursive: true })
                .then(() => {
                  const writeStream = require('fs').createWriteStream(entryPath);
                  readStream.pipe(writeStream);
                  
                  writeStream.on('close', () => {
                    extractedFiles.push(entry.fileName);
                    zipfile.readEntry();
                  });
                  
                  writeStream.on('error', reject);
                })
                .catch(reject);
            });
          }
        });
        
        zipfile.on('end', async () => {
          // Eliminar archivo ZIP temporal
          try {
            await fs.unlink(tempZipPath);
          } catch (unlinkErr) {
            console.warn('No se pudo eliminar archivo temporal:', unlinkErr.message);
          }
          
          resolve({
            success: true,
            message: 'Archivo extraído exitosamente',
            extractedTo: targetDir,
            files: extractedFiles
          });
        });
        
        zipfile.on('error', reject);
      });
    });
    
  } catch (error) {
    throw new Error(`Error en extracción: ${error.message}`);
  }
}

// Función para crear una nueva sesión PTY
function createPtySession(sessionId, command, requestId) {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  
  // Crear nuevo PTY
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env
  });
  
  // Almacenar sesión
  activeSessions.set(sessionId, {
    pty: ptyProcess,
    requestId: requestId,
    command: command,
    output: '',
    createdAt: Date.now()
  });
  
  // Manejar datos de salida del PTY
  ptyProcess.onData((data) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.output += data;
      
      // Enviar datos de salida en tiempo real al servidor
      if (ws && ws.readyState === WebSocket.OPEN) {
        const response = {
          type: 'pty_output',
          sessionId: sessionId,
          requestId: requestId,
          data: data,
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(response));
      }
      
      // Notificar a clientes locales
      broadcastToLocalClients({
        type: 'pty_output',
        sessionId: sessionId,
        requestId: requestId,
        data: data,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Manejar cierre del PTY
  ptyProcess.onExit((exitCode, signal) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      console.log(`Sesión PTY ${sessionId} terminada con código ${exitCode}`);
      
      // Enviar respuesta final al servidor
      if (ws && ws.readyState === WebSocket.OPEN) {
        const response = {
          type: 'pty_session_ended',
          sessionId: sessionId,
          requestId: requestId,
          command: session.command,
          success: exitCode === 0,
          output: session.output,
          exitCode: exitCode,
          signal: signal,
          duration: Date.now() - session.createdAt
        };
        ws.send(JSON.stringify(response));
      }
      
      // Notificar a clientes locales
      broadcastToLocalClients({
        type: 'pty_session_ended',
        sessionId: sessionId,
        requestId: requestId,
        exitCode: exitCode,
        signal: signal,
        timestamp: new Date().toISOString()
      });
      
      // Limpiar sesión
      activeSessions.delete(sessionId);
    }
  });
  
  // Ejecutar comando inicial si se proporciona
  if (command) {
    ptyProcess.write(command + '\r');
  }
  
  return ptyProcess;
}

// Función para limpiar sesiones PTY inactivas (más de 1 hora)
function cleanupInactiveSessions() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [sessionId, session] of activeSessions) {
    if (now - session.createdAt > oneHour) {
      console.log(`Limpiando sesión PTY inactiva: ${sessionId}`);
      session.pty.kill();
      activeSessions.delete(sessionId);
    }
  }
}

// Limpiar sesiones inactivas cada 30 minutos
setInterval(cleanupInactiveSessions, 30 * 60 * 1000);

// Función para manejar mensajes recibidos
async function handleMessage(data) {
  try {
    const message = JSON.parse(data.toString());
    console.log('Mensaje recibido del servidor:', message);
    
    switch (message.type) {
      case 'identify_request':
        console.log('Solicitud de identificación recibida');
        
        // Responder identificándose como bot con autenticación según el protocolo
        const identifyResponse = {
          type: 'identify',
          clientType: 'bot',
          username: BOT_USERNAME,
          apiKey: BOT_API_KEY,
          botName: BOT_NAME
        };
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(identifyResponse));
          console.log('Identificación con autenticación enviada:', {
            type: identifyResponse.type,
            clientType: identifyResponse.clientType,
            username: identifyResponse.username,
            apiKey: identifyResponse.apiKey.substring(0, 10) + '...', // Solo mostrar inicio de la API key
            botName: identifyResponse.botName
          });
        }
        
        // Notificar a clientes locales
        broadcastToLocalClients({
          type: 'identification_sent',
          clientType: 'bot',
          username: BOT_USERNAME,
          botName: BOT_NAME,
          authenticated: true,
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'heartbeat_ack':
        console.log('Heartbeat confirmado por el servidor');
        // El servidor confirmó el heartbeat - opcional logging
        break;
        
      case 'welcome':
        console.log('Mensaje de bienvenida del coordinador:', message.message);
        
        // Verificar si el bot fue autenticado exitosamente
        if (message.authenticated === true) {
          console.log('✅ Bot autenticado exitosamente en el servidor');
          botState = 'idle';
        } else {
          console.log('ℹ️ Bienvenida recibida (autenticación pendiente)');
        }
        
        // Notificar a clientes locales
        broadcastToLocalClients({
          type: 'coordinator_welcome',
          message: message.message,
          authenticated: message.authenticated || false,
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'error':
        console.error('❌ Error del servidor:', message);
        
        // Manejar errores de autenticación específicos
        if (message.code && (message.code.includes('CREDENTIALS') || message.code.includes('BOT_'))) {
          console.error('❌ Error de autenticación:', message.message);
          botState = 'error';
          
          // Notificar a clientes locales del error de autenticación
          broadcastToLocalClients({
            type: 'authentication_error',
            code: message.code,
            message: message.message,
            timestamp: new Date().toISOString()
          });
          
          // Detener heartbeat si hay error de autenticación
          stopHeartbeat();
        } else {
          console.error('❌ Error general:', message.message);
          
          // Notificar a clientes locales del error general
          broadcastToLocalClients({
            type: 'coordinator_error',
            code: message.code,
            message: message.message,
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      case 'bots':
        console.log('Lista de bots recibida:', message.data);
        
        // Notificar a clientes locales
        broadcastToLocalClients({
          type: 'coordinator_message',
          original_type: 'bots',
          data: message.data,
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'unzip':
        console.log('Comando de extracción recibido:', {
          filename: message.filename,
          extractTo: message.extractTo || 'raiz'
        });
        
        // Cambiar estado del bot a trabajando
        botState = 'working';
        currentAction = 'unzip';
        
        // Notificar a clientes locales del inicio de extracción
        broadcastToLocalClients({
          type: 'extraction_started',
          filename: message.filename,
          extractTo: message.extractTo || 'raiz',
          timestamp: new Date().toISOString()
        });
        
        try {
          const result = await extractZipFromBase64(
            message.base64,
            message.filename,
            message.extractTo || ''
          );
          
          // Cambiar estado del bot de vuelta a idle
          botState = 'idle';
          currentAction = null;
          
          // Enviar respuesta de éxito
          const response = {
            type: 'unzip_result',
            ...result
          };
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(response));
            console.log('Respuesta de extracción enviada:', response);
          }
          
          // Notificar a clientes locales del éxito
          broadcastToLocalClients({
            type: 'extraction_completed',
            success: true,
            filename: message.filename,
            extractedTo: result.extractedTo,
            files: result.files,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('Error en extracción:', error.message);
          
          // Cambiar estado del bot a error temporalmente, luego a idle
          botState = 'error';
          currentAction = null;
          
          setTimeout(() => {
            botState = 'idle';
          }, 5000); // Volver a idle después de 5 segundos
          
          // Enviar respuesta de error
          const errorResponse = {
            type: 'unzip_result',
            success: false,
            error: error.message,
            message: 'Error al extraer el archivo'
          };
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(errorResponse));
            console.log('Respuesta de error enviada:', errorResponse);
          }
          
          // Notificar a clientes locales del error
          broadcastToLocalClients({
            type: 'extraction_failed',
            success: false,
            filename: message.filename,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      case 'system_command':
        console.log('Comando del sistema recibido:', {
          command: message.command,
          requestId: message.requestId,
          from: message.from
        });
        
        // Cambiar estado del bot a trabajando
        botState = 'working';
        currentAction = 'system_command';
        
        // Notificar a clientes locales del inicio del comando
        broadcastToLocalClients({
          type: 'system_command_started',
          command: message.command,
          requestId: message.requestId,
          from: message.from,
          timestamp: new Date().toISOString()
        });
        
        try {
          // Ejecutar comando del sistema con timeout de 30 segundos
          const { stdout, stderr } = await execAsync(message.command, {
            timeout: 30000, // 30 segundos de timeout
            encoding: 'utf8',
            maxBuffer: 1024 * 1024 // 1MB máximo de buffer
          });
          
          // Cambiar estado del bot de vuelta a idle
          botState = 'idle';
          currentAction = null;
          
          // Preparar respuesta de éxito
          const response = {
            type: 'system_command_response',
            requestId: message.requestId,
            command: message.command,
            success: true,
            output: stdout || null,
            error: stderr || null,
            exitCode: 0
          };
          
          // Enviar respuesta al servidor
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(response));
            console.log('Respuesta de comando enviada:', {
              requestId: response.requestId,
              success: response.success,
              outputLength: response.output ? response.output.length : 0,
              hasError: !!response.error
            });
          }
          
          // Notificar a clientes locales del éxito
          broadcastToLocalClients({
            type: 'system_command_completed',
            requestId: message.requestId,
            command: message.command,
            success: true,
            output: stdout,
            error: stderr,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('Error ejecutando comando:', error.message);
          
          // Cambiar estado del bot a error temporalmente, luego a idle
          botState = 'error';
          currentAction = null;
          
          setTimeout(() => {
            botState = 'idle';
          }, 5000); // Volver a idle después de 5 segundos
          
          // Preparar respuesta de error
          const errorResponse = {
            type: 'system_command_response',
            requestId: message.requestId,
            command: message.command,
            success: false,
            output: null,
            error: error.message,
            exitCode: error.code || 1
          };
          
          // Enviar respuesta de error al servidor
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(errorResponse));
            console.log('Respuesta de error de comando enviada:', {
              requestId: errorResponse.requestId,
              success: errorResponse.success,
              error: errorResponse.error,
              exitCode: errorResponse.exitCode
            });
          }
          
          // Notificar a clientes locales del error
          broadcastToLocalClients({
            type: 'system_command_failed',
            requestId: message.requestId,
            command: message.command,
            success: false,
            error: error.message,
            exitCode: error.code || 1,
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      case 'pty_start':
        console.log('Iniciando sesión PTY:', {
          command: message.command,
          requestId: message.requestId,
          interactive: message.interactive || false
        });
        
        // Cambiar estado del bot a trabajando
        botState = 'working';
        currentAction = 'pty_session';
        
        // Generar ID único para la sesión
        sessionCounter++;
        const sessionId = `pty_${Date.now()}_${sessionCounter}`;
        
        // Notificar inicio de sesión PTY
        broadcastToLocalClients({
          type: 'pty_session_started',
          sessionId: sessionId,
          requestId: message.requestId,
          command: message.command,
          timestamp: new Date().toISOString()
        });
        
        try {
          // Crear nueva sesión PTY
          const ptyProcess = createPtySession(sessionId, message.command, message.requestId);
          
          // Enviar confirmación de inicio al servidor
          if (ws && ws.readyState === WebSocket.OPEN) {
            const response = {
              type: 'pty_started',
              sessionId: sessionId,
              requestId: message.requestId,
              command: message.command,
              success: true,
              timestamp: Date.now()
            };
            ws.send(JSON.stringify(response));
          }
          
          console.log(`Sesión PTY iniciada: ${sessionId}`);
          
        } catch (error) {
          console.error('Error iniciando sesión PTY:', error.message);
          
          // Cambiar estado del bot a error temporalmente
          botState = 'error';
          currentAction = null;
          
          setTimeout(() => {
            botState = 'idle';
          }, 5000);
          
          // Enviar error al servidor
          if (ws && ws.readyState === WebSocket.OPEN) {
            const errorResponse = {
              type: 'pty_error',
              sessionId: sessionId,
              requestId: message.requestId,
              command: message.command,
              success: false,
              error: error.message
            };
            ws.send(JSON.stringify(errorResponse));
          }
          
          // Notificar error a clientes locales
          broadcastToLocalClients({
            type: 'pty_session_failed',
            sessionId: sessionId,
            requestId: message.requestId,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      case 'pty_input':
        console.log('Entrada PTY recibida:', {
          sessionId: message.sessionId,
          dataLength: message.data ? message.data.length : 0
        });
        
        const session = activeSessions.get(message.sessionId);
        if (session) {
          try {
            // Enviar datos de entrada al PTY
            session.pty.write(message.data);
            
            // Confirmar recepción
            if (ws && ws.readyState === WebSocket.OPEN) {
              const response = {
                type: 'pty_input_received',
                sessionId: message.sessionId,
                success: true,
                timestamp: Date.now()
              };
              ws.send(JSON.stringify(response));
            }
            
          } catch (error) {
            console.error('Error enviando entrada a PTY:', error.message);
            
            if (ws && ws.readyState === WebSocket.OPEN) {
              const errorResponse = {
                type: 'pty_input_error',
                sessionId: message.sessionId,
                success: false,
                error: error.message
              };
              ws.send(JSON.stringify(errorResponse));
            }
          }
        } else {
          console.warn(`Sesión PTY no encontrada: ${message.sessionId}`);
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            const errorResponse = {
              type: 'pty_session_not_found',
              sessionId: message.sessionId,
              success: false,
              error: 'Sesión no encontrada'
            };
            ws.send(JSON.stringify(errorResponse));
          }
        }
        break;
        
      case 'pty_resize':
        console.log('Redimensionando PTY:', {
          sessionId: message.sessionId,
          cols: message.cols,
          rows: message.rows
        });
        
        const resizeSession = activeSessions.get(message.sessionId);
        if (resizeSession) {
          try {
            resizeSession.pty.resize(message.cols || 80, message.rows || 24);
            
            if (ws && ws.readyState === WebSocket.OPEN) {
              const response = {
                type: 'pty_resized',
                sessionId: message.sessionId,
                success: true,
                cols: message.cols,
                rows: message.rows
              };
              ws.send(JSON.stringify(response));
            }
            
          } catch (error) {
            console.error('Error redimensionando PTY:', error.message);
          }
        }
        break;
        
      case 'pty_kill':
        console.log('Terminando sesión PTY:', {
          sessionId: message.sessionId,
          signal: message.signal || 'SIGTERM'
        });
        
        const killSession = activeSessions.get(message.sessionId);
        if (killSession) {
          try {
            killSession.pty.kill(message.signal || 'SIGTERM');
            
            if (ws && ws.readyState === WebSocket.OPEN) {
              const response = {
                type: 'pty_kill_sent',
                sessionId: message.sessionId,
                success: true,
                signal: message.signal || 'SIGTERM'
              };
              ws.send(JSON.stringify(response));
            }
            
          } catch (error) {
            console.error('Error terminando PTY:', error.message);
          }
        }
        break;
        
      case 'pty_list':
        console.log('Listando sesiones PTY activas');
        
        const sessionsList = Array.from(activeSessions.entries()).map(([id, session]) => ({
          sessionId: id,
          requestId: session.requestId,
          command: session.command,
          createdAt: session.createdAt,
          uptime: Date.now() - session.createdAt
        }));
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          const response = {
            type: 'pty_sessions_list',
            sessions: sessionsList,
            total: sessionsList.length,
            timestamp: Date.now()
          };
          ws.send(JSON.stringify(response));
        }
        break;
        
      default:
        console.log('Tipo de mensaje no reconocido:', message.type);
        
        // Notificar a clientes locales de mensaje desconocido
        broadcastToLocalClients({
          type: 'unknown_message',
          original_message: message,
          timestamp: new Date().toISOString()
        });
    }
    
  } catch (parseError) {
    console.error('Error al parsear mensaje:', parseError.message);
    console.log('Mensaje original:', data.toString());
  }
}

// Middleware para parsear JSON
app.use(express.json());

// Servidor HTTP básico
app.get('/', (req, res) => {
  res.send('Cliente WebSocket activo.');
});

// Endpoint para ejecutar comandos localmente (para testing)
app.post('/command', async (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({
      success: false,
      error: 'Comando requerido'
    });
  }
  
  console.log('Comando local recibido:', command);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });
    
    res.json({
      success: true,
      command: command,
      output: stdout || null,
      error: stderr || null,
      exitCode: 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error ejecutando comando local:', error.message);
    
    res.json({
      success: false,
      command: command,
      output: null,
      error: error.message,
      exitCode: error.code || 1,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para iniciar sesiones PTY localmente (para testing)
app.post('/pty/start', async (req, res) => {
  const { command, interactive = true } = req.body;
  
  if (!command) {
    return res.status(400).json({
      success: false,
      error: 'Comando requerido'
    });
  }
  
  console.log('Iniciando sesión PTY local:', command);
  
  try {
    sessionCounter++;
    const sessionId = `local_pty_${Date.now()}_${sessionCounter}`;
    const requestId = `local_req_${Date.now()}`;
    
    // Crear sesión PTY
    const ptyProcess = createPtySession(sessionId, command, requestId);
    
    res.json({
      success: true,
      sessionId: sessionId,
      command: command,
      interactive: interactive,
      timestamp: new Date().toISOString(),
      message: 'Sesión PTY iniciada exitosamente'
    });
    
  } catch (error) {
    console.error('Error iniciando sesión PTY local:', error.message);
    
    res.json({
      success: false,
      command: command,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para enviar entrada a sesión PTY
app.post('/pty/:sessionId/input', (req, res) => {
  const { sessionId } = req.params;
  const { data } = req.body;
  
  if (!data) {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada requeridos'
    });
  }
  
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Sesión no encontrada'
    });
  }
  
  try {
    session.pty.write(data);
    
    res.json({
      success: true,
      sessionId: sessionId,
      message: 'Entrada enviada exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error enviando entrada a PTY:', error.message);
    
    res.json({
      success: false,
      sessionId: sessionId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para listar sesiones PTY activas
app.get('/pty/sessions', (req, res) => {
  const sessionsList = Array.from(activeSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    requestId: session.requestId,
    command: session.command,
    createdAt: new Date(session.createdAt).toISOString(),
    uptime: Date.now() - session.createdAt,
    outputLength: session.output.length
  }));
  
  res.json({
    sessions: sessionsList,
    total: sessionsList.length,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para terminar sesión PTY
app.delete('/pty/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { signal = 'SIGTERM' } = req.body;
  
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Sesión no encontrada'
    });
  }
  
  try {
    session.pty.kill(signal);
    
    res.json({
      success: true,
      sessionId: sessionId,
      signal: signal,
      message: 'Señal enviada exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error terminando PTY:', error.message);
    
    res.json({
      success: false,
      sessionId: sessionId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
});

// Inicializar directorio de descargas
ensureDownloadsDir();

// ================================================================
// SERVIDOR WEBSOCKET LOCAL
// ================================================================
// Servidor WebSocket local para recibir conexiones directas
const localWsServer = new WebSocket.Server({ port: WS_LOCAL_PORT });
const localClients = new Set();

console.log(`Servidor WebSocket local iniciado en puerto: ${WS_LOCAL_PORT}`);

localWsServer.on('connection', (localWs, request) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localClients.add(localWs);
  
  console.log(`Nueva conexión local establecida: ${clientId} desde ${request.socket.remoteAddress}`);
  
  // Enviar mensaje de bienvenida al cliente local
  const welcomeMessage = {
    type: 'welcome',
    message: `Conectado al Bot ${BOT_NAME}`,
    bot: BOT_NAME,
    clientId: clientId,
    timestamp: new Date().toISOString(),
    status: {
      connected_to_coordinator: isConnected,
      downloads_dir: DOWNLOADS_DIR,
      local_clients: localClients.size
    }
  };
  
  localWs.send(JSON.stringify(welcomeMessage));
  
  // Manejar mensajes de clientes locales
  localWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Mensaje de cliente local ${clientId}:`, message);
      
      switch (message.type) {
        case 'ping':
          localWs.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString(),
            clientId: clientId
          }));
          break;
          
        case 'status':
          localWs.send(JSON.stringify({
            type: 'status_response',
            bot: BOT_NAME,
            connected_to_coordinator: isConnected,
            last_welcome: lastWelcome,
            coordinator_url: WS_SERVER_URL,
            downloads_dir: DOWNLOADS_DIR,
            local_clients_count: localClients.size,
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'list_downloads':
          // Listar archivos descargados
          fs.readdir(DOWNLOADS_DIR, { withFileTypes: true })
            .then(async (files) => {
              const fileList = await Promise.all(
                files.map(async (file) => {
                  const filePath = path.join(DOWNLOADS_DIR, file.name);
                  const stats = await fs.stat(filePath);
                  return {
                    name: file.name,
                    type: file.isDirectory() ? 'directory' : 'file',
                    size: stats.size,
                    modified: stats.mtime
                  };
                })
              );
              
              localWs.send(JSON.stringify({
                type: 'downloads_list',
                downloads_directory: DOWNLOADS_DIR,
                files: fileList,
                timestamp: new Date().toISOString()
              }));
            })
            .catch((error) => {
              localWs.send(JSON.stringify({
                type: 'error',
                message: 'Error al listar descargas',
                error: error.message,
                timestamp: new Date().toISOString()
              }));
            });
          break;
          
        case 'pty_start_local':
          // Iniciar sesión PTY desde cliente local
          const { command: ptyCommand, interactive = true } = message;
          
          if (!ptyCommand) {
            localWs.send(JSON.stringify({
              type: 'error',
              message: 'Comando requerido para PTY',
              timestamp: new Date().toISOString()
            }));
            break;
          }
          
          try {
            sessionCounter++;
            const sessionId = `local_ws_pty_${Date.now()}_${sessionCounter}`;
            const requestId = `local_ws_req_${Date.now()}`;
            
            // Crear sesión PTY
            const ptyProcess = createPtySession(sessionId, ptyCommand, requestId);
            
            localWs.send(JSON.stringify({
              type: 'pty_started',
              sessionId: sessionId,
              command: ptyCommand,
              success: true,
              timestamp: new Date().toISOString()
            }));
            
          } catch (error) {
            localWs.send(JSON.stringify({
              type: 'pty_error',
              command: ptyCommand,
              error: error.message,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'pty_input_local':
          // Enviar entrada a sesión PTY desde cliente local
          const inputSession = activeSessions.get(message.sessionId);
          if (inputSession) {
            try {
              inputSession.pty.write(message.data);
              localWs.send(JSON.stringify({
                type: 'pty_input_sent',
                sessionId: message.sessionId,
                success: true,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              localWs.send(JSON.stringify({
                type: 'pty_input_error',
                sessionId: message.sessionId,
                error: error.message,
                timestamp: new Date().toISOString()
              }));
            }
          } else {
            localWs.send(JSON.stringify({
              type: 'pty_session_not_found',
              sessionId: message.sessionId,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'pty_list_local':
          // Listar sesiones PTY activas
          const ptySessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
            sessionId: id,
            requestId: session.requestId,
            command: session.command,
            createdAt: session.createdAt,
            uptime: Date.now() - session.createdAt,
            outputLength: session.output.length
          }));
          
          localWs.send(JSON.stringify({
            type: 'pty_sessions_list',
            sessions: ptySessions,
            total: ptySessions.length,
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'forward_to_coordinator':
          // Reenviar mensaje al coordinador si está conectado
          if (ws && ws.readyState === WebSocket.OPEN) {
            const forwardMessage = {
              ...message.payload,
              forwarded_from: clientId,
              forwarded_by: BOT_NAME
            };
            ws.send(JSON.stringify(forwardMessage));
            console.log('Mensaje reenviado al coordinador:', forwardMessage);
            
            localWs.send(JSON.stringify({
              type: 'forward_result',
              success: true,
              message: 'Mensaje enviado al coordinador',
              timestamp: new Date().toISOString()
            }));
          } else {
            localWs.send(JSON.stringify({
              type: 'forward_result',
              success: false,
              message: 'No hay conexión con el coordinador',
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        default:
          localWs.send(JSON.stringify({
            type: 'error',
            message: 'Tipo de mensaje no reconocido',
            received_type: message.type,
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error(`Error procesando mensaje de cliente ${clientId}:`, error.message);
      localWs.send(JSON.stringify({
        type: 'error',
        message: 'Error al procesar mensaje',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Manejar desconexión de cliente local
  localWs.on('close', () => {
    localClients.delete(localWs);
    console.log(`Cliente local desconectado: ${clientId}. Clientes restantes: ${localClients.size}`);
  });
  
  localWs.on('error', (error) => {
    console.error(`Error en cliente local ${clientId}:`, error.message);
    localClients.delete(localWs);
  });
});

// Función para enviar mensaje a todos los clientes locales
function broadcastToLocalClients(message) {
  const messageStr = JSON.stringify(message);
  localClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Manejar errores del servidor WebSocket local
localWsServer.on('error', (error) => {
  console.error('Error en servidor WebSocket local:', error.message);
});

// ================================================================
// CLIENTE WEBSOCKET (CONEXIÓN AL COORDINADOR)
// ================================================================

let isConnected = false;
let lastWelcome = null;
let ws = null;
let reconnectTimeout = null;
let heartbeatInterval = null;
let botState = 'idle'; // idle, working, error, maintenance, offline
let currentAction = null;
let actionsQueued = 0;

// Función para enviar heartbeat según el protocolo
function sendHeartbeat() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  const heartbeatMessage = {
    type: 'heartbeat',
    timestamp: Date.now(),
    status: {
      state: botState,
      currentAction: currentAction,
      actionsQueued: actionsQueued,
      systemInfo: {
        cpu: Math.round(Math.random() * 100), // Placeholder - aquí iría el uso real de CPU
        memory: Math.round(Math.random() * 100), // Placeholder - aquí iría el uso real de memoria
        uptime: process.uptime() * 1000 // tiempo activo en ms
      }
    }
  };
  
  ws.send(JSON.stringify(heartbeatMessage));
  console.log('Heartbeat enviado:', heartbeatMessage);
}

// Función para iniciar el heartbeat automático
function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  console.log(`Heartbeat iniciado cada ${HEARTBEAT_INTERVAL}ms`);
}

// Función para detener el heartbeat
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('Heartbeat detenido');
  }
}

function connectWS() {
  ws = new WebSocket(WS_SERVER_URL);

  ws.on('open', () => {
    isConnected = true;
    lastWelcome = new Date();
    botState = 'idle';
    console.log('Conectado al servidor WebSocket:', WS_SERVER_URL);
    
    // Iniciar heartbeat automático según el protocolo
    startHeartbeat();
    
    // Notificar a clientes locales de la conexión
    broadcastToLocalClients({
      type: 'coordinator_connected',
      message: 'Conectado al servidor coordinador',
      coordinator_url: WS_SERVER_URL,
      timestamp: new Date().toISOString()
    });
  });

  ws.on('close', () => {
    isConnected = false;
    botState = 'offline';
    console.log('Conexión WebSocket cerrada. Reintentando en', RECONNECT_INTERVAL, 'ms');
    
    // Detener heartbeat
    stopHeartbeat();
    
    // Notificar a clientes locales de la desconexión
    broadcastToLocalClients({
      type: 'coordinator_disconnected',
      message: 'Conexión con coordinador perdida',
      reconnect_in: RECONNECT_INTERVAL,
      timestamp: new Date().toISOString()
    });
    
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    isConnected = false;
    botState = 'error';
    console.error('Error en WebSocket:', err);
    
    // Detener heartbeat
    stopHeartbeat();
    
    // Notificar a clientes locales del error
    broadcastToLocalClients({
      type: 'coordinator_error',
      message: 'Error en conexión con coordinador',
      error: err.message,
      timestamp: new Date().toISOString()
    });
    
    if (ws.readyState !== WebSocket.OPEN) {
      scheduleReconnect();
    }
  });

  ws.on('message', (data) => {
    handleMessage(data);
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    console.log('Intentando reconectar a WebSocket...');
    connectWS();
  }, RECONNECT_INTERVAL);
}

connectWS();

// Endpoint para panel de control: estado del bot soldier
app.get('/status', (req, res) => {
  res.json({
    bot: BOT_NAME,
    username: BOT_USERNAME,
    authenticated: botState !== 'error' && isConnected,
    connected: isConnected,
    lastWelcome: lastWelcome,
    ws_server: WS_SERVER_URL,
    downloads_dir: DOWNLOADS_DIR,
    bot_status: {
      state: botState,
      currentAction: currentAction,
      actionsQueued: actionsQueued,
      uptime: process.uptime() * 1000
    },
    local_websocket: {
      port: WS_LOCAL_PORT,
      connected_clients: localClients.size,
      server_running: localWsServer.readyState === 1
    },
    capabilities: {
      system_commands: true,
      file_extraction: true,
      heartbeat: true,
      pty_terminal: true,
      interactive_commands: true,
      max_command_timeout: 30000, // 30 segundos
      max_output_buffer: 1048576,  // 1MB
      max_pty_sessions: 10,
      pty_session_timeout: 3600000 // 1 hora
    },
    pty_info: {
      active_sessions: activeSessions.size,
      session_counter: sessionCounter,
      cleanup_interval: '30 minutes'
    }
  });
});

// Endpoint para listar archivos descargados
app.get('/downloads', async (req, res) => {
  try {
    const files = await fs.readdir(DOWNLOADS_DIR, { withFileTypes: true });
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(DOWNLOADS_DIR, file.name);
        const stats = await fs.stat(filePath);
        return {
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime
        };
      })
    );
    
    res.json({
      downloads_directory: DOWNLOADS_DIR,
      files: fileList
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al listar archivos',
      message: error.message
    });
  }
});
