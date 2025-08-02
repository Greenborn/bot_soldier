# Protocolo WebSocket y API HTTP - Bot Commander

Documentación completa del protocolo de comunicación WebSocket y endpoints HTTP para Bot Commander.

## Visión General

Bot Commander utiliza:
- **WebSockets**: Para comunicación bidireccional en tiempo real entre bots y paneles
- **HTTP REST API**: Para autenticación y operaciones administrativas

### Componentes
- **Bots**: Clientes automatizados que ejecutan acciones
- **Paneles**: Interfaces de usuario para control y monitoreo
- **Servidor**: Coordinador central de comunicaciones

## API HTTP Endpoints

### Autenticación

#### POST /api/login
Autentica un usuario y devuelve un token JWT.

**Request:**
```json
{
  "username": "admin",
  "password": "contraseña"
}
```

**Response### 10. Manejo de Errores

#### 10.1 Error General (Servidor → Cliente)xito):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login exitoso"
}
```

**Response (Error):**
```json
{
  "error": "Credenciales inválidas"
}
```

**Rate Limiting:**
- Máximo 5 intentos por IP cada 15 minutos
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

#### GET /api/verify-token
Verifica la validez de un token JWT.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (Válido):**
```json
{
  "valid": true,
  "username": "admin"
}
```

**Response (Inválido):**
```json
{
  "error": "Token inválido"
}
```

### Datos del Sistema

#### GET /api/bots
Obtiene información de bots conectados (requiere autenticación).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "bots": [
    {
      "id": "bot_id_123",
      "botName": "WebCrawler-01",
      "connectedAt": 1640995200000,
      "lastActivity": 1640995500000,
      "type": "bot"
    }
  ],
  "panels": [
    {
      "id": "panel_id_456",
      "connectedAt": 1640995300000,
      "type": "panel"
    }
  ],
  "stats": {
    "totalBots": 1,
    "totalPanels": 1,
    "totalClients": 2
  }
}
```

### Códigos de Estado HTTP

| Código | Descripción | Contexto |
|--------|-------------|----------|
| `200` | OK | Operación exitosa |
| `400` | Bad Request | Datos de entrada inválidos |
| `401` | Unauthorized | Credenciales inválidas o token faltante |
| `403` | Forbidden | Token inválido o expirado |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Internal Server Error | Error del servidor |

## Tipos de Mensajes WebSocket

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

### 9. Mensajería Genérica y Eventos

#### 9.1 Mensaje Genérico (Cliente/Panel → Servidor → Bot)
```json
{
  "type": "generic_message",
  "targetBot": "bot_id_123",
  "category": "monitoring",
  "priority": "normal",
  "expectResponse": true,
  "requestId": "req_1640995204500_abc123",
  "payload": {
    "action": "get_system_metrics",
    "parameters": {
      "include": ["cpu", "memory", "disk"],
      "interval": "5m"
    }
  },
  "metadata": {
    "source": "admin_panel",
    "userId": "admin",
    "timestamp": 1640995204500
  }
}
```

#### 9.2 Respuesta a Mensaje Genérico (Bot → Servidor → Cliente)
```json
{
  "type": "generic_message_response",
  "requestId": "req_1640995204500_abc123",
  "success": true,
  "payload": {
    "system_metrics": {
      "cpu": 45.2,
      "memory": 68.1,
      "disk": 75.3
    },
    "collected_at": 1640995204500,
    "interval": "5m"
  },
  "timestamp": 1640995205000
}
```

#### 9.3 Mensaje Broadcast (Servidor → Múltiples Bots)
```json
{
  "type": "broadcast_message",
  "targets": ["soldier", "scout", "guardian"],
  "category": "system_update",
  "priority": "high",
  "requestId": "broadcast_1640995204500_xyz789",
  "payload": {
    "action": "update_configuration",
    "config": {
      "log_level": "debug",
      "heartbeat_interval": 15000
    },
    "apply_immediately": true
  },
  "metadata": {
    "source": "server_admin",
    "timestamp": 1640995204500
  }
}
```

#### 9.4 Confirmación de Broadcast (Bot → Servidor)
```json
{
  "type": "broadcast_ack",
  "requestId": "broadcast_1640995204500_xyz789",
  "botName": "soldier",
  "received": true,
  "processed": true,
  "timestamp": 1640995204600
}
```

#### 9.5 Suscripción a Eventos (Cliente → Servidor)
```json
{
  "type": "subscribe_events",
  "events": ["system_alerts", "bot_status_change", "file_operations"],
  "filter": {
    "severity": ["high", "critical"],
    "bots": ["soldier", "scout"],
    "exclude_sources": ["test_client"]
  },
  "requestId": "sub_1640995204500_def456"
}
```

#### 9.6 Confirmación de Suscripción (Servidor → Cliente)
```json
{
  "type": "subscription_confirmed",
  "requestId": "sub_1640995204500_def456",
  "events": ["system_alerts", "bot_status_change", "file_operations"],
  "subscriptionId": "sub_active_789",
  "timestamp": 1640995204500
}
```

#### 9.7 Notificación de Evento (Servidor → Suscriptores)
```json
{
  "type": "event_notification",
  "event": "system_alert",
  "category": "monitoring",
  "severity": "high",
  "data": {
    "alert_type": "high_cpu_usage",
    "bot": "soldier",
    "cpu_usage": 95.2,
    "threshold": 90.0,
    "duration": 300000
  },
  "timestamp": 1640995204500,
  "subscriptionId": "sub_active_789"
}
```

#### 9.8 Cancelar Suscripción (Cliente → Servidor)
```json
{
  "type": "unsubscribe_events",
  "events": ["system_alerts"],
  "subscriptionId": "sub_active_789",
  "requestId": "unsub_1640995204500_ghi789"
}
```

#### 9.9 Confirmación de Cancelación (Servidor → Cliente)
```json
{
  "type": "unsubscription_confirmed",
  "requestId": "unsub_1640995204500_ghi789",
  "events": ["system_alerts"],
  "subscriptionId": "sub_active_789",
  "timestamp": 1640995204500
}
```

### 10. Manejo de Errores

#### 8.1 Error General (Servidor → Cliente)
```json
{
  "type": "error",
  "code": "INVALID_MESSAGE",
  "message": "Formato de mensaje no válido",
  "details": "El campo 'type' es requerido",
  "timestamp": 1640995200000
}
```

## Códigos de Error Estándar

| Código | Descripción | Contexto | Recuperable |
|--------|-------------|----------|-------------|
| `ACTION_NOT_FOUND` | Acción no encontrada | La acción solicitada no existe en el bot | No |
| `INVALID_PARAMETERS` | Parámetros inválidos | Parámetros faltantes, incorrectos o fuera de rango | Sí |
| `PERMISSION_DENIED` | Permisos insuficientes | El bot no tiene permisos para ejecutar la acción | No |
| `RESOURCE_BUSY` | Recurso ocupado | El recurso necesario está siendo usado | Sí |
| `TIMEOUT` | Tiempo agotado | La acción excedió el tiempo límite | Sí |
| `NETWORK_ERROR` | Error de red | Problema de conectividad externa | Sí |
| `SYSTEM_ERROR` | Error del sistema | Error interno del bot o sistema operativo | Variable |
| `EXECUTION_ERROR` | Error de ejecución | Error durante la ejecución de la acción | Variable |
| `INVALID_MESSAGE` | Mensaje inválido | Formato o estructura de mensaje incorrecta | No |
| `BOT_NOT_FOUND` | Bot no encontrado | El bot objetivo no está conectado | Sí |
| `RATE_LIMITED` | Límite de velocidad | Demasiadas solicitudes en poco tiempo | Sí |
| `MESSAGE_TOO_LARGE` | Mensaje muy grande | El payload excede el límite de tamaño | No |
| `INVALID_CATEGORY` | Categoría inválida | Categoría de mensaje no reconocida | No |
| `SUBSCRIPTION_LIMIT` | Límite de suscripciones | Máximo número de suscripciones alcanzado | Sí |
| `EVENT_NOT_FOUND` | Evento no encontrado | El evento solicitado no existe | No |
| `INSUFFICIENT_PERMISSIONS` | Permisos insuficientes | No autorizado para la operación | No |

## Categorías de Mensajes Genéricos

| Categoría | Descripción | Ejemplos de Uso |
|-----------|-------------|-----------------|
| `system` | Operaciones del sistema | Configuración, actualizaciones, mantenimiento |
| `monitoring` | Monitoreo y métricas | CPU, memoria, estado de servicios |
| `data` | Intercambio de datos | Transferencia de archivos, base de datos |
| `notification` | Notificaciones | Alertas, avisos, recordatorios |
| `command` | Comandos especiales | Operaciones personalizadas |
| `custom` | Mensajes personalizados | Casos específicos de uso |

## Prioridades de Mensajes

| Prioridad | Descripción | Procesamiento | TTL |
|-----------|-------------|---------------|-----|
| `low` | Baja prioridad | Cuando recursos disponibles | 24h |
| `normal` | Prioridad normal | Orden FIFO estándar | 8h |
| `high` | Alta prioridad | Procesamiento preferente | 2h |
| `urgent` | Crítico | Procesamiento inmediato | 30m |

## Estados de Bot

| Estado | Descripción | Transiciones Permitidas |
|--------|-------------|------------------------|
| `idle` | Bot inactivo, listo para recibir comandos | → working, maintenance, error |
| `working` | Bot ejecutando una o más acciones | → idle, error |
| `error` | Bot en estado de error | → idle, maintenance, offline |
| `maintenance` | Bot en mantenimiento programado | → idle, offline |
| `offline` | Bot desconectado | → idle (al reconectar) |

## Tipos de Datos

### Tipos Primitivos
- `string`: Cadena de texto
- `number`: Número entero o decimal
- `boolean`: Verdadero o falso
- `object`: Objeto JSON
- `array`: Array de elementos

### Tipos Especiales
- `timestamp`: Número entero representando milisegundos desde epoch Unix
- `duration`: Número entero representando milisegundos
- `percentage`: Número decimal entre 0 y 100
- `base64`: Cadena codificada en Base64
- `url`: Cadena con formato de URL válida

## Mejores Prácticas

### Para Bots
1. **Registro**: Registrarse usando el script de gestión antes de conectar
2. **Credenciales**: Guardar de forma segura username y API key
3. **Identificación**: Incluir username y apiKey al conectar
4. **Heartbeat**: Enviar heartbeat cada 30 segundos con estado actualizado
5. **Acciones**: Validar parámetros antes de ejecutar acciones
6. **Estados**: Mantener estado consistente y reportar cambios
7. **Errores**: Usar códigos de error estándar y proporcionar mensajes descriptivos
8. **Mensajería genérica**: Procesar mensajes según categoría y prioridad
9. **Suscripciones**: Manejar eventos suscritos de forma eficiente
10. **Respuestas**: Responder a mensajes que expectResponse=true

### Para Paneles
1. **Autenticación**: Autenticarse via HTTP antes de usar WebSocket
2. **Identificación**: Identificarse como `panel` al conectar
3. **IDs únicos**: Usar IDs únicos para `requestId` y `actionId`
4. **Timeouts**: Implementar timeouts para acciones de larga duración
5. **Manejo de errores**: Manejar todos los tipos de respuesta (éxito, error, timeout)
6. **Token Management**: Renovar tokens antes de que expiren (24h)
7. **Mensajería**: Usar categorías apropiadas para mensajes genéricos
8. **Filtros**: Aplicar filtros eficientes en suscripciones
9. **Prioridades**: Usar prioridades adecuadas según urgencia
10. **Cleanup**: Cancelar suscripciones no utilizadas

### Para el Servidor
1. **Autenticación**: Validar tokens JWT para paneles y API keys para bots
2. **Registro de bots**: Mantener archivo seguro de credenciales de bots
3. **Routing**: Enrutar mensajes según `targetBot` cuando sea necesario
4. **Validación**: Validar estructura de mensajes antes de procesar
5. **Estado**: Mantener estado actualizado de todos los clientes
6. **Broadcast**: Enviar actualizaciones solo a clientes relevantes
7. **Rate Limiting**: Aplicar límites de velocidad en endpoints críticos
8. **Logs de seguridad**: Registrar intentos de autenticación fallidos
9. **Gestión de eventos**: Mantener registro eficiente de suscripciones
10. **Cleanup**: Limpiar suscripciones de clientes desconectados
11. **Priorización**: Procesar mensajes según prioridad
12. **Filtrado**: Aplicar filtros de eventos correctamente

## Flujo de Autenticación Completo

### 1. Autenticación del Panel
```
1. Panel → POST /api/login (username, password)
2. Servidor ← 200 OK (token JWT)
3. Panel guarda token en localStorage
4. Panel → WebSocket con credentials válidos
5. Panel ← identify_request
6. Panel → identify (type: "panel")
7. Panel ← welcome message
```

### 2. Conexión de Bot (con autenticación)
```
1. Bot → WebSocket (conexión inicial)
2. Bot ← identify_request  
3. Bot → identify (type: "bot", username, apiKey, botName)
4. Servidor valida credenciales
5. Bot ← welcome message (si es válido) o error (si es inválido)
6. Bot inicia heartbeat loop (solo si autenticado)
```

### 3. Gestión de API Keys
```bash
# Registrar nuevo bot
npm run register-bot WebCrawler01

# Listar bots registrados  
npm run list-bots

# Desactivar bot
npm run deactivate-bot WebCrawler01

# Reactivar bot
npm run reactivate-bot WebCrawler01

# Eliminar bot
npm run delete-bot WebCrawler01
```

## Versionado

- **Versión actual**: 1.0
- **Compatibilidad**: Hacia atrás compatible
- **Extensiones**: Nuevos tipos de mensaje no rompen clientes existentes

## Ejemplos de Implementación

Ver archivos de ejemplo:
- `examples/bot-client.js` - Cliente bot completo
- `examples/panel-client.js` - Cliente panel básico
- `examples/server-handlers.js` - Manejadores del servidor
