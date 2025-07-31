require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const yauzl = require('yauzl');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
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
      case 'bots':
        console.log('Lista de bots recibida:', message.data);
        break;
        
      case 'unzip':
        console.log('Comando de extracción recibido:', {
          filename: message.filename,
          extractTo: message.extractTo || 'raiz'
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
        }
        break;
        
      default:
        console.log('Tipo de mensaje no reconocido:', message.type);
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
    const welcomeMsg = JSON.stringify({ type: 'welcome', bot: 'soldier', timestamp: lastWelcome });
    ws.send(welcomeMsg);
    console.log('Mensaje de bienvenida enviado:', welcomeMsg);
  });

  ws.on('close', () => {
    isConnected = false;
    console.log('Conexión WebSocket cerrada. Reintentando en', RECONNECT_INTERVAL, 'ms');
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    isConnected = false;
    console.error('Error en WebSocket:', err);
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
    bot: 'soldier',
    connected: isConnected,
    lastWelcome: lastWelcome,
    ws_server: WS_SERVER_URL,
    downloads_dir: DOWNLOADS_DIR
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
