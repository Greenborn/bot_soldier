require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const RECONNECT_INTERVAL = parseInt(process.env.RECONNECT_INTERVAL, 10) || 5000; // ms
console.log('Conectando a WebSocket en:', WS_SERVER_URL);

// Servidor HTTP básico
app.get('/', (req, res) => {
  res.send('Cliente WebSocket activo.');
});

app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
});




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
    console.log('Mensaje recibido del servidor:', data.toString());
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
    ws_server: WS_SERVER_URL
  });
});
