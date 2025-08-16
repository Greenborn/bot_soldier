# Tipos de Mensajes WebSocket

### Extracción de Archivos ZIP

#### Solicitud de Extracción de ZIP (Servidor → Bot)
```json
{
  "type": "receive_zip",
  "filename": "archivo.zip",
  "base64": "UEsDBBQAAAAIA...", // contenido ZIP en base64
  "extractTo": "subcarpeta" // opcional, destino dentro de descargas
}
```

#### Respuesta de Extracción (Bot → Servidor)
```json
{
  "type": "receive_zip_result",
  "success": true,
  "message": "Archivo extraído exitosamente",
  "extractedTo": "/ruta/descargas/subcarpeta",
  "files": ["file1.txt", "folder/file2.txt"]
}
```

#### Notificaciones de Proceso (Bot → Servidor y clientes locales)
```json
{
  "type": "extraction_started",
  "filename": "archivo.zip",
  "extractTo": "subcarpeta",
  "timestamp": "2025-08-03T12:34:56.789Z"
}
```
```json
{
  "type": "extraction_completed",
  "success": true,
  "filename": "archivo.zip",
  "extractedTo": "/ruta/descargas/subcarpeta",
  "files": ["file1.txt", "folder/file2.txt"],
  "timestamp": "2025-08-03T12:35:01.123Z"
}
```
```json
{
  "type": "extraction_failed",
  "success": false,
  "filename": "archivo.zip",
  "error": "Error al extraer el archivo",
  "timestamp": "2025-08-03T12:35:01.123Z"
}
```

Los mensajes WebSocket se intercambian después de la autenticación HTTP inicial.

### 1. Identificación de Cliente

#### 1.1 Solicitud de Identificación (Servidor → Cliente)
```json
{
  "type": "identify_request",
  "message": "Por favor identifícate como 'bot' o 'panel'",
  "clientId": "generated_client_id"
}
```

#### 1.2 Respuesta de Identificación (Cliente → Servidor)

**Para Paneles:**
```json
{
  "type": "identify",
  "clientType": "panel"
}
```

**Para Bots (con autenticación):**
```json
{
  "type": "identify",
  "clientType": "bot",
  "username": "WebCrawler01",  // nombre de usuario del bot registrado
  "apiKey": "bot_webcrawler01_abc123...", // API key generada
  "botName": "Web Crawler v1.0" // nombre descriptivo opcional
}
```

#### 1.3 Mensaje de Bienvenida (Servidor → Cliente)

**Para Paneles:**
```json
{
  "type": "welcome",
  "message": "¡Panel de control conectado!"
}
```

**Para Bots Autenticados:**
```json
{
  "type": "welcome",
  "message": "¡Bienvenido, Web Crawler v1.0!",
  "authenticated": true
}
```

#### 1.4 Error de Autenticación (Servidor → Bot)
```json
{
  "type": "error",
  "code": "INVALID_CREDENTIALS",
  "message": "Autenticación fallida: API key inválida"
}
```

Códigos de error de autenticación:
- `MISSING_CREDENTIALS`: Falta username o apiKey
- `INVALID_CREDENTIALS`: Credenciales incorrectas
- `BOT_NOT_REGISTERED`: Bot no está registrado
- `BOT_DEACTIVATED`: Bot está desactivado

### 2. Heartbeat y Estado

#### 2.1 Heartbeat Básico (Bot → Servidor)
```json
{
  "type": "heartbeat",
  "timestamp": 1640995200000
}
```

#### 2.2 Heartbeat con Estado (Bot → Servidor)
```json
{
  "type": "heartbeat",
  "timestamp": 1640995200000,
  "status": {
    "state": "idle", // idle, working, error, maintenance, offline
    "currentAction": null, // o nombre de acción en ejecución
    "actionsQueued": 0,
    "systemInfo": {
      "cpu": 45.2, // porcentaje de uso de CPU
      "memory": 68.1, // porcentaje de uso de memoria
      "diskFree": 1234567890, // espacio libre en disco en bytes (opcional)
      "uptime": 86400000 // tiempo activo en ms
    }
  }
}
```

#### 2.3 Confirmación de Heartbeat (Servidor → Bot)
```json
{
  "type": "heartbeat_ack"
}
```

### 3. Descubrimiento de Acciones

#### 3.1 Solicitud de Acciones (Panel → Bot vía Servidor)
```json
{
  "type": "get_actions",
  "targetBot": "bot_id_123",
  "requestId": "unique_request_id"
}
```

#### 3.2 Respuesta de Acciones (Bot → Panel vía Servidor)
```json
{
  "type": "actions_list",
  "requestId": "unique_request_id",
  "actions": [
    {
      "name": "take_screenshot",
      "description": "Captura una screenshot de la pantalla",
      "category": "capture", // opcional: capture, navigation, system, etc.
      "parameters": [
        {
          "name": "quality",
          "type": "number",
          "required": false,
          "default": 80,
          "min": 1,
          "max": 100,
          "description": "Calidad de la imagen (1-100)"
        },
        {
          "name": "format",
          "type": "string",
          "required": false,
          "default": "png",
          "options": ["png", "jpg", "webp"],
          "description": "Formato de la imagen"
        },
        {
          "name": "region",
          "type": "object",
          "required": false,
          "description": "Región específica a capturar",
          "properties": {
            "x": { "type": "number", "description": "Coordenada X" },
            "y": { "type": "number", "description": "Coordenada Y" },
            "width": { "type": "number", "description": "Ancho" },
            "height": { "type": "number", "description": "Alto" }
          }
        }
      ]
    }
  ]
}
```

### 4. Ejecución de Acciones

#### 4.1 Ejecutar Acción (Panel → Bot vía Servidor)
```json
{
  "type": "execute_action",
  "targetBot": "bot_id_123",
  "actionId": "unique_action_id",
  "action": {
    "name": "take_screenshot",
    "parameters": {
      "quality": 90,
      "format": "png",
      "region": {
        "x": 0,
        "y": 0,
        "width": 1920,
        "height": 1080
      }
    }
  },
  "timeout": 30000, // opcional, timeout en ms
  "priority": "normal" // opcional: low, normal, high
}
```

#### 4.2 Acción Iniciada (Bot → Panel vía Servidor)
```json
{
  "type": "action_started",
  "actionId": "unique_action_id",
  "action": "take_screenshot",
  "timestamp": 1640995200000,
  "estimatedDuration": 5000, // estimación en ms
  "priority": "normal"
}
```

#### 4.3 Progreso de Acción (Bot → Panel vía Servidor)
```json
{
  "type": "action_progress",
  "actionId": "unique_action_id",
  "action": "take_screenshot",
  "progress": 50, // porcentaje 0-100
  "message": "Capturando pantalla...", // mensaje descriptivo
  "timestamp": 1640995202500,
  "data": {} // datos adicionales opcionales
}
```

#### 4.4 Acción Completada (Bot → Panel vía Servidor)
```json
{
  "type": "action_completed",
  "actionId": "unique_action_id",
  "action": "take_screenshot",
  "success": true,
  "result": {
    "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "size": {
      "width": 1920,
      "height": 1080
    },
    "format": "png",
    "quality": 90,
    "fileSize": 245760, // tamaño en bytes
    "metadata": {
      "captureTime": 1640995204500,
      "devicePixelRatio": 1
    }
  },
  "duration": 4500, // duración real en ms
  "timestamp": 1640995204500
}
```

#### 4.5 Acción Fallida (Bot → Panel vía Servidor)
```json
{
  "type": "action_failed",
  "actionId": "unique_action_id",
  "action": "take_screenshot",
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "No se tienen permisos para capturar pantalla",
    "details": "Error al acceder al display :0",
    "recoverable": false, // si se puede reintentar
    "retryAfter": null // tiempo en ms antes de reintentar
  },
  "duration": 1200,
  "timestamp": 1640995201200
}
```

### 5. Comandos Directos (Sistema Legacy)

#### 5.1 Comando Directo (Panel → Bot vía Servidor)
```json
{
  "type": "command",
  "targetBot": "bot_id_123",
  "command": "restart",
  "parameters": {},
  "from": "panel"
}
```

#### 5.2 Resultado de Comando (Bot → Panel vía Servidor)
```json
{
  "type": "command_result",
  "command": "restart",
  "result": "Bot reiniciado exitosamente",
  "success": true,
  "timestamp": 1640995200000
}
```

### 6. Comandos del Sistema

#### 6.1 Comando del Sistema (Panel → Bot vía Servidor)
```json
{
  "type": "system_command",
  "targetBot": "bot_id_123",
  "command": "ls -la /home/user",
  "from": "panel",
  "requestId": "cmd_1640995204500_abc123def"
}
```

#### 6.2 Respuesta de Comando del Sistema (Bot → Panel vía Servidor)
```json
{
  "type": "system_command_response",
  "requestId": "cmd_1640995204500_abc123def",
  "command": "ls -la /home/user",
  "success": true,
  "output": "total 24\ndrwxr-xr-x 3 user user 4096 Jan 1 12:00 .\ndrwxr-xr-x 3 root root 4096 Jan 1 11:00 ..\n-rw-r--r-- 1 user user  220 Jan 1 11:00 .bashrc\n",
  "error": null,
  "exitCode": 0
}
```

**En caso de error:**
```json
{
  "type": "system_command_response",
  "requestId": "cmd_1640995204500_abc123def",
  "command": "ls /nonexistent",
  "success": false,
  "output": null,
  "error": "ls: cannot access '/nonexistent': No such file or directory\n",
  "exitCode": 2
}
```

#### 6.3 Respuesta de Comando Procesada (Servidor → Panel)
```json
{
  "type": "command_response",
  "success": true,
  "output": "total 24\ndrwxr-xr-x 3 user user 4096 Jan 1 12:00 .\ndrwxr-xr-x 3 root root 4096 Jan 1 11:00 ..\n-rw-r--r-- 1 user user  220 Jan 1 11:00 .bashrc\n",
  "error": null,
  "command": "ls -la /home/user",
  "botId": "bot_id_123",
  "requestId": "cmd_1640995204500_abc123def"
}
```

### 7. Terminal Interactivo PTY

#### 7.1 Iniciar Sesión PTY (Panel → Bot vía Servidor)
```json
{
  "type": "pty_start",
  "targetBot": "bot_id_123",
  "requestId": "pty_req_1640995204500_abc123",
  "command": "nano /etc/hosts",
  "interactive": true,
  "cols": 80,
  "rows": 24
}
```

#### 7.2 Sesión PTY Iniciada (Bot → Panel vía Servidor)
```json
{
  "type": "pty_started",
  "requestId": "pty_req_1640995204500_abc123",
  "sessionId": "pty_1640995204500_1",
  "command": "nano /etc/hosts",
  "success": true,
  "timestamp": 1640995204500
}
```

#### 7.3 Salida PTY en Tiempo Real (Bot → Panel vía Servidor)
```json
{
  "type": "pty_output",
  "sessionId": "pty_1640995204500_1",
  "requestId": "pty_req_1640995204500_abc123",
  "data": "\u001b[H\u001b[2JGNU nano 6.2                File: /etc/hosts",
  "timestamp": 1640995204600
}
```

#### 7.4 Enviar Entrada a PTY (Panel → Bot vía Servidor)
```json
{
  "type": "pty_input",
  "sessionId": "pty_1640995204500_1",
  "data": "127.0.0.1\tlocalhost\r"
}
```

#### 7.5 Redimensionar Terminal PTY (Panel → Bot vía Servidor)
```json
{
  "type": "pty_resize",
  "sessionId": "pty_1640995204500_1",
  "cols": 120,
  "rows": 30
}
```

#### 7.6 Terminar Sesión PTY (Panel → Bot vía Servidor)
```json
{
  "type": "pty_kill",
  "sessionId": "pty_1640995204500_1",
  "signal": "SIGTERM"
}
```

#### 7.7 Sesión PTY Terminada (Bot → Panel vía Servidor)
```json
{
  "type": "pty_session_ended",
  "sessionId": "pty_1640995204500_1",
  "requestId": "pty_req_1640995204500_abc123",
  "command": "nano /etc/hosts",
  "success": true,
  "output": "contenido_completo_de_la_sesion...",
  "exitCode": 0,
  "signal": null,
  "duration": 45000
}
```

#### 7.8 Listar Sesiones PTY (Panel → Bot vía Servidor)
```json
{
  "type": "pty_list",
  "targetBot": "bot_id_123"
}
```

#### 7.9 Lista de Sesiones PTY (Bot → Panel vía Servidor)
```json
{
  "type": "pty_sessions_list",
  "sessions": [
    {
      "sessionId": "pty_1640995204500_1",
      "requestId": "pty_req_1640995204500_abc123",
      "command": "nano /etc/hosts",
      "createdAt": 1640995204500,
      "uptime": 45000
    }
  ],
  "total": 1,
  "timestamp": 1640995250000
}
```

### 8. Actualizaciones de Estado del Sistema

#### 8.1 Actualización de Clientes (Servidor → Paneles)
```json
{
  "type": "clients_update",
  "bots": [
    {
      "id": "bot_id_123",
      "botName": "WebCrawler-01",
      "connectedAt": 1640995000000,
      "lastActivity": 1640995200000,
      "type": "bot",
      "status": {
        "state": "working",
        "currentAction": "take_screenshot"
      }
    }
  ],
  "panels": [
    {
      "id": "panel_id_456",
      "connectedAt": 1640995100000,
      "type": "panel"
    }
  ],
  "stats": {
    "totalBots": 1,
    "totalPanels": 1
  }
}
```
