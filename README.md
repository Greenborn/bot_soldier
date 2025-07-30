# ws_client.js

## Descripción
Cliente Node.js con Express que se conecta a un servidor WebSocket y mantiene la conexión activa.

## Configuración
1. Crea un archivo `.env` con el siguiente contenido (ajusta la URL y el puerto si es necesario):

```
WS_SERVER_URL=ws://localhost:8080
PORT=3000
```

2. Instala las dependencias:

```
npm install express ws dotenv
```

3. Ejecuta el cliente:

```
node ws_client.js
```

El cliente intentará conectarse al WebSocket especificado y mostrará mensajes de conexión y mensajes recibidos.
