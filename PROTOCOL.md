# Protocolo WebSocket - Bot Commander

Documentación completa del protocolo de comunicación WebSocket para Bot Commander.

## Visión General

Bot Commander utiliza WebSockets para comunicación bidireccional en tiempo real entre:
- **Bots**: Clientes automatizados que ejecutan acciones
- **Paneles**: Interfaces de usuario para control y monitoreo
- **Servidor**: Coordinador central de comunicaciones

## Tipos de Mensajes

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
```json
{
  "type": "identify",
  "clientType": "bot", // o "panel"
  "botName": "WebCrawler-01" // solo para bots, opcional
}
```

#### 1.3 Mensaje de Bienvenida (Servidor → Cliente)
```json
{
  "type": "welcome",
  "message": "¡Bienvenido, WebCrawler-01!" // o "¡Panel de control conectado!"
}
```

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

### 6. Comandos Específicos del Bot

#### 6.1 Extracción de Archivos ZIP (Coordinador → Bot)
```json
{
  "type": "unzip",
  "filename": "archivo.zip",
  "base64": "UEsDBBQAAAAIAL+RUkwAAAAA...",
  "extractTo": "proyecto_001"
}
```

**Parámetros:**
- `filename`: Nombre del archivo ZIP original
- `base64`: Contenido del archivo ZIP codificado en base64
- `extractTo`: (Opcional) Subdirectorio donde extraer los archivos

#### 6.2 Resultado de Extracción (Bot → Coordinador)
```json
{
  "type": "unzip_result",
  "success": true,
  "message": "Archivo extraído exitosamente",
  "extractedTo": "/path/to/downloads/proyecto_001",
  "files": ["file1.txt", "file2.js", "subfolder/file3.json"]
}
```

En caso de error:
```json
{
  "type": "unzip_result", 
  "success": false,
  "error": "Error al decodificar base64",
  "message": "El archivo base64 no es válido"
}
```

### 7. Actualizaciones de Estado del Sistema

#### 7.1 Actualización de Clientes (Servidor → Paneles)
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

### 8. Manejo de Errores

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
1. **Identificación**: Siempre responder al `identify_request` con información precisa
2. **Heartbeat**: Enviar heartbeat cada 30 segundos con estado actualizado
3. **Acciones**: Validar parámetros antes de ejecutar acciones
4. **Estados**: Mantener estado consistente y reportar cambios
5. **Errores**: Usar códigos de error estándar y proporcionar mensajes descriptivos

### Para Paneles
1. **Identificación**: Identificarse como `panel` al conectar
2. **IDs únicos**: Usar IDs únicos para `requestId` y `actionId`
3. **Timeouts**: Implementar timeouts para acciones de larga duración
4. **Manejo de errores**: Manejar todos los tipos de respuesta (éxito, error, timeout)

### Para el Servidor
1. **Routing**: Enrutar mensajes según `targetBot` cuando sea necesario
2. **Validación**: Validar estructura de mensajes antes de procesar
3. **Estado**: Mantener estado actualizado de todos los clientes
4. **Broadcast**: Enviar actualizaciones solo a clientes relevantes

## Versionado

- **Versión actual**: 1.0
- **Compatibilidad**: Hacia atrás compatible
- **Extensiones**: Nuevos tipos de mensaje no rompen clientes existentes

## Ejemplos de Implementación

Ver archivos de ejemplo:
- `examples/bot-client.js` - Cliente bot completo
- `examples/panel-client.js` - Cliente panel básico
- `examples/server-handlers.js` - Manejadores del servidor
