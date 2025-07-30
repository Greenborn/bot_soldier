require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080'; // Cambia el puerto si es necesario
console.log('Conectando a WebSocket en:', WS_SERVER_URL);

// Servidor HTTP básico
app.get('/', (req, res) => {
  res.send('Cliente WebSocket activo.');
});

app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
});

// Cliente WebSocket
const ws = new WebSocket(WS_SERVER_URL);

ws.on('open', () => {
  console.log('Conectado al servidor WebSocket:', WS_SERVER_URL);
});

ws.on('close', () => {
  console.log('Conexión WebSocket cerrada.');
});

ws.on('error', (err) => {
  console.error('Error en WebSocket:', err);
});

ws.on('message', (data) => {
  console.log('Mensaje recibido del servidor:', data.toString());
});
