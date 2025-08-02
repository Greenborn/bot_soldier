# Sistema de Mensajería Genérica - Bot Soldier

El bot soldier implementa un sistema robusto de mensajería genérica que permite comunicación bidireccional flexible con el servidor coordinador y otros clientes.

## Características

- ✅ **Mensajes genéricos**: Comunicación estructurada con categorías y prioridades
- ✅ **Broadcast**: Envío a múltiples bots simultáneamente  
- ✅ **Suscripciones**: Sistema de eventos pub/sub
- ✅ **Múltiples interfaces**: WebSocket local, HTTP REST y WebSocket coordinador
- ✅ **Metadata automática**: Enriquecimiento de mensajes con información contextual
- ✅ **Respuestas opcionales**: Mensajes que esperan confirmación
- ✅ **Filtrado avanzado**: Filtros por severidad, origen, categoría, etc.

## WebSocket Local (Puerto 8081)

### Mensaje Genérico

```json
{
  "type": "generic_message",
  "category": "monitoring",
  "priority": "normal",
  "expectResponse": true,
  "requestId": "req_123",
  "payload": {
    "action": "get_cpu_usage",
    "interval": "1m"
  }
}
```

**Respuesta:**
```json
{
  "type": "generic_message_sent",
  "success": true,
  "requestId": "req_123",
  "category": "monitoring",
  "message": "Mensaje genérico enviado al coordinador",
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

### Mensaje Broadcast

```json
{
  "type": "broadcast_message",
  "targets": ["soldier", "scout", "guardian"],
  "category": "system_update",
  "priority": "high",
  "payload": {
    "action": "restart_service",
    "service": "monitoring"
  }
}
```

### Suscripción a Eventos

```json
{
  "type": "subscribe_events",
  "events": ["system_alerts", "file_operations"],
  "filter": {
    "severity": ["high", "critical"],
    "exclude_sources": ["test"]
  }
}
```

### Cancelar Suscripción

```json
{
  "type": "unsubscribe_events",
  "events": ["system_alerts"]
}
```

## API HTTP (Puerto 3000)

### Enviar Mensaje Genérico

```bash
curl -X POST http://localhost:3000/message/generic \
  -H "Content-Type: application/json" \
  -d '{
    "category": "monitoring",
    "priority": "normal",
    "expectResponse": true,
    "payload": {
      "action": "get_system_status",
      "details": true
    }
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "requestId": "http_req_1640995200000_abc123",
  "category": "monitoring",
  "priority": "normal",
  "expectResponse": true,
  "message": "Mensaje genérico enviado al coordinador",
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

### Enviar Broadcast

```bash
curl -X POST http://localhost:3000/message/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "targets": ["soldier", "scout"],
    "category": "command",
    "priority": "high",
    "payload": {
      "action": "update_config",
      "config": {"debug": true}
    }
  }'
```

### Suscribirse a Eventos

```bash
curl -X POST http://localhost:3000/subscription/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "events": ["system_alerts", "performance_warnings"],
    "filter": {
      "severity": ["high", "critical"],
      "bots": ["soldier"]
    }
  }'
```

### Cancelar Suscripción

```bash
curl -X POST http://localhost:3000/subscription/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{
    "events": ["system_alerts"]
  }'
```

## Categorías de Mensajes

### System
```json
{
  "category": "system",
  "payload": {
    "action": "update_configuration",
    "config": {
      "log_level": "debug",
      "heartbeat_interval": 15000
    }
  }
}
```

### Monitoring
```json
{
  "category": "monitoring",
  "payload": {
    "action": "collect_metrics",
    "metrics": ["cpu", "memory", "disk"],
    "interval": "5m"
  }
}
```

### Data
```json
{
  "category": "data",
  "payload": {
    "action": "transfer_file",
    "source": "/tmp/data.json",
    "destination": "s3://bucket/data.json"
  }
}
```

### Notification
```json
{
  "category": "notification",
  "payload": {
    "action": "send_alert",
    "level": "warning",
    "message": "High CPU usage detected",
    "recipients": ["admin@example.com"]
  }
}
```

### Command
```json
{
  "category": "command",
  "payload": {
    "action": "execute_custom_script",
    "script": "/scripts/maintenance.sh",
    "parameters": ["--force", "--verbose"]
  }
}
```

### Custom
```json
{
  "category": "custom",
  "payload": {
    "action": "process_webhook",
    "webhook_data": {
      "event": "deployment_complete",
      "environment": "production"
    }
  }
}
```

## Prioridades

### Low (Baja)
- Procesamiento cuando hay recursos disponibles
- TTL: 24 horas
- Ejemplos: informes periódicos, limpieza de archivos

### Normal (Normal)
- Procesamiento estándar FIFO
- TTL: 8 horas  
- Ejemplos: backups, sincronización de datos

### High (Alta)
- Procesamiento preferente
- TTL: 2 horas
- Ejemplos: alertas importantes, actualizaciones críticas

### Urgent (Urgente)
- Procesamiento inmediato
- TTL: 30 minutos
- Ejemplos: fallos de seguridad, errores críticos

## Filtros de Eventos

### Por Severidad
```json
{
  "filter": {
    "severity": ["high", "critical"]
  }
}
```

### Por Bots
```json
{
  "filter": {
    "bots": ["soldier", "scout"],
    "exclude_bots": ["test_bot"]
  }
}
```

### Por Origen
```json
{
  "filter": {
    "sources": ["monitoring_system"],
    "exclude_sources": ["test_client"]
  }
}
```

### Por Categoría
```json
{
  "filter": {
    "categories": ["system", "monitoring"],
    "exclude_categories": ["test"]
  }
}
```

### Filtro Combinado
```json
{
  "filter": {
    "severity": ["high", "critical"],
    "bots": ["soldier"],
    "categories": ["system", "monitoring"],
    "exclude_sources": ["test"],
    "time_range": {
      "start": 1640995200000,
      "end": 1640998800000
    }
  }
}
```

## Eventos del Coordinador

Los clientes pueden suscribirse a estos eventos desde el servidor coordinador:

### system_alerts
- Alertas del sistema
- Fallos de servicios
- Problemas de recursos

### bot_status_change
- Cambios de estado de bots
- Conexiones/desconexiones
- Errores de bots

### file_operations
- Operaciones de archivos
- Transferencias completadas
- Errores de archivos

### performance_warnings
- Advertencias de rendimiento
- Uso alto de recursos
- Latencia elevada

### security_events
- Eventos de seguridad
- Intentos de acceso fallidos
- Cambios de permisos

### configuration_changes
- Cambios de configuración
- Actualizaciones de sistema
- Modificaciones de políticas

## Metadata Automática

El bot agrega automáticamente metadata a todos los mensajes:

```json
{
  "metadata": {
    "source": "http_api",
    "botName": "soldier",
    "timestamp": 1640995204500,
    "version": "1.0.0",
    "host": "server-01",
    "environment": "production"
  }
}
```

## Ejemplos Prácticos

### 1. Monitoreo de Sistema

```bash
# Solicitar métricas del sistema
curl -X POST http://localhost:3000/message/generic \
  -H "Content-Type: application/json" \
  -d '{
    "category": "monitoring",
    "priority": "normal",
    "expectResponse": true,
    "payload": {
      "action": "get_system_metrics",
      "metrics": ["cpu", "memory", "disk", "network"],
      "format": "json"
    }
  }'
```

### 2. Actualización de Configuración

```bash
# Broadcast de actualización a todos los bots
curl -X POST http://localhost:3000/message/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "targets": ["all"],
    "category": "system",
    "priority": "high",
    "payload": {
      "action": "update_config",
      "config": {
        "log_level": "info",
        "max_connections": 100
      },
      "restart_required": false
    }
  }'
```

### 3. Suscripción a Alertas

```bash
# Suscribirse a alertas críticas
curl -X POST http://localhost:3000/subscription/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "events": ["system_alerts", "security_events"],
    "filter": {
      "severity": ["critical"],
      "categories": ["security", "system"]
    }
  }'
```

### 4. Notificación Personalizada

```javascript
// Desde cliente WebSocket local
const ws = new WebSocket('ws://localhost:8081');

ws.send(JSON.stringify({
  type: 'generic_message',
  category: 'notification',
  priority: 'urgent',
  expectResponse: false,
  payload: {
    action: 'send_notification',
    type: 'email',
    recipients: ['admin@company.com'],
    subject: 'Sistema crítico caído',
    message: 'El servidor de base de datos principal no responde',
    attachments: ['/logs/error.log']
  }
}));
```

## Estado y Monitoreo

El endpoint `/status` incluye información sobre mensajería:

```json
{
  "messaging": {
    "generic_messages_supported": true,
    "broadcast_messages_supported": true,
    "event_subscriptions_supported": true,
    "supported_categories": ["system", "monitoring", "data", "notification", "command", "custom"],
    "supported_priorities": ["low", "normal", "high", "urgent"]
  }
}
```

## Limitaciones

1. **Tamaño de payload**: Máximo 1MB por mensaje
2. **Rate limiting**: 100 mensajes/minuto por cliente
3. **Suscripciones**: Máximo 50 suscripciones activas por cliente
4. **TTL**: Los mensajes expiran según prioridad
5. **Filtros**: Máximo 10 filtros por suscripción

## Troubleshooting

### Mensaje no entregado
- Verificar conexión con coordinador
- Comprobar que el bot objetivo existe
- Validar formato del payload

### Evento no recibido
- Verificar suscripción activa
- Comprobar filtros aplicados
- Validar conexión WebSocket

### Error de prioridad
- Usar prioridades válidas: low, normal, high, urgent
- Los mensajes urgent tienen precedencia

### Timeout de respuesta
- Incrementar timeout en cliente
- Verificar que expectResponse=true
- El bot objetivo debe estar conectado
