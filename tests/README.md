# Tests - Bot Soldier

Este directorio contiene scripts de prueba para verificar la funcionalidad de mensajería genérica del bot soldier.

## Archivos

### `test_generic_messaging.js`
Script interactivo para probar manualmente todas las funcionalidades de mensajería genérica:
- Conexión WebSocket al coordinador
- Autenticación con credenciales
- Envío de mensajes genéricos
- Recepción de mensajes broadcast
- Suscripción y notificación de eventos

**Uso:**
```bash
cd /home/debian/Lab/bot_soldier
node tests/test_generic_messaging.js
```

**Características:**
- Menú interactivo con opciones numeradas
- Logging detallado con timestamps
- Manejo de errores y reconexión
- Heartbeat automático
- Estado de pruebas en tiempo real

### `test_auto.js`
Script automatizado para ejecutar todas las pruebas sin intervención del usuario:
- Ideal para CI/CD y validación rápida
- Timeout automático de 30 segundos
- Reporte de resultados al final
- Código de salida según éxito/fallo

**Uso:**
```bash
cd /home/debian/Lab/bot_soldier
node tests/test_auto.js
```

**Salida:**
- Código 0: Todas las pruebas exitosas
- Código 1: Alguna prueba falló
- Código 130: Interrumpido por usuario

## Configuración Requerida

Los scripts utilizan la configuración del archivo `.env` del proyecto principal:

```env
WS_SERVER_URL=ws://localhost:8080
BOT_NAME=soldier
BOT_USERNAME=test1
BOT_API_KEY=bot_test1_mdtpqbez_a5ca3b6d10d761d5d08ae2e4d044a824
HEARTBEAT_INTERVAL=30000
```

### Variables Críticas

- `BOT_USERNAME`: Nombre de usuario del bot registrado
- `BOT_API_KEY`: Clave API generada para el bot
- `WS_SERVER_URL`: URL del servidor coordinador

## Pruebas Incluidas

### 1. Conexión WebSocket
- Establece conexión con el servidor coordinador
- Verifica que el protocolo WebSocket funciona correctamente

### 2. Autenticación
- Envía credenciales al servidor
- Verifica que el bot puede autenticarse correctamente
- Maneja errores de credenciales inválidas

### 3. Mensaje Genérico
- Envía un mensaje genérico al coordinador
- Espera y verifica la respuesta
- Prueba el protocolo de mensajería bidireccional

### 4. Mensaje Broadcast
- Simula recepción de mensajes broadcast
- Envía confirmaciones de recepción
- Verifica el manejo de mensajes a múltiples destinos

### 5. Eventos y Suscripciones
- Se suscribe a eventos del sistema
- Simula eventos y verifica su recepción
- Prueba el sistema de notificaciones

## Resultados de Prueba

Los scripts muestran el estado de cada prueba:

```
Conexión                : ✅ EXITOSA
Autenticación           : ✅ EXITOSA
Mensaje Genérico        : ✅ EXITOSA
Mensaje Broadcast       : ✅ EXITOSA
Eventos                 : ✅ EXITOSA

Resumen: 5/5 pruebas exitosas
```

## Solución de Problemas

### Error de Conexión
- Verificar que el servidor coordinador esté ejecutándose
- Comprobar la URL en `WS_SERVER_URL`
- Revisar firewall y conectividad de red

### Error de Autenticación
- Verificar que `BOT_USERNAME` y `BOT_API_KEY` estén configurados
- Comprobar que el bot esté registrado en el servidor
- Verificar que las credenciales sean válidas y no hayan expirado

### Timeout en Pruebas
- Incrementar el timeout en `test_auto.js` si es necesario
- Verificar la latencia de red al servidor
- Comprobar que el servidor responde a los mensajes

## Desarrollo y Extensión

### Agregar Nueva Prueba

Para agregar una nueva prueba al script interactivo:

1. Crear función de prueba:
```javascript
async function testNewFeature() {
  log('🧪 Probando nueva funcionalidad...');
  // Implementar prueba
}
```

2. Agregar al menú:
```javascript
function showMenu() {
  // ...existente...
  console.log('8. Probar nueva funcionalidad');
}
```

3. Manejar en `handleUserInput`:
```javascript
case '8':
  testNewFeature();
  break;
```

### Modificar Script Automático

Para el script automático, agregar la prueba a `runAllTests()`:

```javascript
await this.testNewFeature();
await new Promise(resolve => setTimeout(resolve, 1000));
```

## Logs y Debugging

Los scripts generan logs detallados con timestamps:

```
[2025-08-03T10:30:15.123Z] [+1000ms] [INFO] Conectando al servidor WebSocket...
[2025-08-03T10:30:15.234Z] [+1111ms] [SUCCESS] ✅ Conexión establecida
```

Para más detalle, modificar el nivel de logging en los scripts.

## Integración con CI/CD

El script automático puede usarse en pipelines de CI/CD:

```yaml
test:
  script:
    - cd bot_soldier
    - node tests/test_auto.js
  allow_failure: false
```

## Limitaciones

- Los scripts requieren un servidor coordinador activo
- Las pruebas de broadcast y eventos se simulan parcialmente
- No incluye pruebas de carga o estrés
- Requiere credenciales válidas configuradas

## Contribuir

Para contribuir con nuevas pruebas:

1. Seguir el patrón de logging existente
2. Manejar errores apropiadamente
3. Agregar timeouts para evitar bloqueos
4. Documentar nuevas funcionalidades en este README
