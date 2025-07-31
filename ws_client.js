require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const yauzl = require('yauzl');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const WS_LOCAL_PORT = parseInt(process.env.WS_LOCAL_PORT, 10) || 8081;
const BOT_NAME = process.env.BOT_NAME || 'soldier';
const RECONNECT_INTERVAL = parseInt(process.env.RECONNECT_INTERVAL, 10) || 5000; // ms
const DOWNLOADS_DIR = path.resolve(process.env.DOWNLOADS_DIR || './descargas');

console.log('Conectando a WebSocket en:', WS_SERVER_URL);

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

// Función para manejar mensajes recibidos
async function handleMessage(data) {
  try {
    const message = JSON.parse(data.toString());
    console.log('Mensaje recibido del servidor:', message);
    
    switch (message.type) {
      case 'identify_request':
        console.log('Solicitud de identificación recibida');
        
        // Responder identificándose como bot con el formato correcto
        const identifyResponse = {
          type: 'identify',
          clientType: 'bot',
          botName: BOT_NAME
        };
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(identifyResponse));
          console.log('Identificación enviada:', identifyResponse);
        }
        
        // Notificar a clientes locales
        broadcastToLocalClients({
          type: 'identification_sent',
          clientType: 'bot',
          botName: BOT_NAME,
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'welcome':
        console.log('Mensaje de bienvenida del coordinador:', message.message);
        
        // Notificar a clientes locales
        broadcastToLocalClients({
          type: 'coordinator_welcome',
          message: message.message,
          timestamp: new Date().toISOString()
        });
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

// Servidor HTTP básico
app.get('/', (req, res) => {
  res.send('Cliente WebSocket activo.');
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

function connectWS() {
  ws = new WebSocket(WS_SERVER_URL);

  ws.on('open', () => {
    isConnected = true;
    lastWelcome = new Date();
    console.log('Conectado al servidor WebSocket:', WS_SERVER_URL);
    
    // Enviar mensaje de bienvenida
    const welcomeMsg = JSON.stringify({ type: 'welcome', bot: BOT_NAME, timestamp: lastWelcome });
    ws.send(welcomeMsg);
    console.log('Mensaje de bienvenida enviado:', welcomeMsg);
    
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
    console.log('Conexión WebSocket cerrada. Reintentando en', RECONNECT_INTERVAL, 'ms');
    
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
    console.error('Error en WebSocket:', err);
    
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
    connected: isConnected,
    lastWelcome: lastWelcome,
    ws_server: WS_SERVER_URL,
    downloads_dir: DOWNLOADS_DIR,
    local_websocket: {
      port: WS_LOCAL_PORT,
      connected_clients: localClients.size,
      server_running: localWsServer.readyState === 1
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
