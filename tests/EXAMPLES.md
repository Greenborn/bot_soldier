# Ejemplos de Uso - Tests Bot Soldier

## Verificación Rápida de Conexión

Antes de ejecutar las pruebas completas, verifica que la configuración sea correcta:

```bash
# Usando npm
npm run verify

# Directamente con node
node tests/verify_connection.js
```

**Salida esperada:**
```
🔍 VERIFICADOR DE CONEXIÓN BOT SOLDIER
=====================================
Server URL: ws://localhost:8080
Bot Username: test1
API Key: CONFIGURADO

⏳ Intentando conectar...
✅ Conexión WebSocket establecida exitosamente
⏳ Probando autenticación...
📝 Servidor solicita identificación
📤 Credenciales enviadas
✅ Autenticación exitosa
🎉 ¡Configuración correcta! El bot puede conectarse.
```

## Pruebas Automáticas

Para ejecutar todas las pruebas sin intervención del usuario:

```bash
# Usando npm (recomendado)
npm test
# o
npm run test:auto

# Directamente con node
node tests/test_auto.js
```

**Salida esperada:**
```
[2025-08-03T10:30:15.123Z] [+0ms] [INFO] Conectando al servidor WebSocket...
[2025-08-03T10:30:15.234Z] [+111ms] [INFO] ✅ Conexión establecida
[2025-08-03T10:30:15.345Z] [+222ms] [INFO] Esperando solicitud de identificación...
[2025-08-03T10:30:15.456Z] [+333ms] [INFO] ✅ Autenticación exitosa
[2025-08-03T10:30:16.567Z] [+1444ms] [INFO] 🧪 Probando mensaje genérico...
[2025-08-03T10:30:16.678Z] [+1555ms] [INFO] ✅ Respuesta a mensaje genérico recibida
[2025-08-03T10:30:17.789Z] [+2666ms] [INFO] 🧪 Probando mensaje broadcast...
[2025-08-03T10:30:17.890Z] [+2767ms] [INFO] ✅ Mensaje broadcast recibido
[2025-08-03T10:30:18.901Z] [+3778ms] [INFO] 🧪 Probando suscripción a eventos...
[2025-08-03T10:30:19.012Z] [+3889ms] [INFO] ✅ Evento recibido

============================================================
RESULTADOS DE PRUEBAS AUTOMÁTICAS
============================================================
Duración total: 4000ms

Conexión                : ✅ EXITOSA
Autenticación           : ✅ EXITOSA
Mensaje Genérico        : ✅ EXITOSA
Mensaje Broadcast       : ✅ EXITOSA
Eventos                 : ✅ EXITOSA

Resumen: 5/5 pruebas exitosas
============================================================
🎉 ¡Todas las pruebas pasaron exitosamente!
```

## Pruebas Interactivas

Para pruebas manuales con menú interactivo:

```bash
# Usando npm
npm run test:interactive

# Directamente con node
node tests/test_generic_messaging.js
```

**Menú de opciones:**
```
============================================================
MENÚ DE PRUEBAS - MENSAJERÍA GENÉRICA
============================================================
1. Probar mensaje genérico
2. Probar mensaje broadcast
3. Suscribirse a eventos
4. Simular evento
5. Mostrar estado de pruebas
6. Ejecutar todas las pruebas
7. Cerrar conexión y salir
============================================================
Selecciona una opción (1-7): 
```

### Ejemplo de Sesión Interactiva

```
$ npm run test:interactive

======================================================================
SCRIPT DE PRUEBA - FUNCIONALIDAD GENÉRICA DE MENSAJERÍA
======================================================================
Bot Name: soldier
Bot Username: test1
Server URL: ws://localhost:8080
Heartbeat Interval: 30000ms
======================================================================

[2025-08-03T10:30:15.123Z] [INFO] Conectando a ws://localhost:8080...
[2025-08-03T10:30:15.234Z] [INFO] Conexión WebSocket establecida
[2025-08-03T10:30:15.345Z] [SUCCESS] ✅ Conexión establecida
[2025-08-03T10:30:15.456Z] [INFO] Esperando solicitud de identificación...
[2025-08-03T10:30:15.567Z] [INFO] Enviando credenciales de autenticación...
[2025-08-03T10:30:15.678Z] [SUCCESS] ✅ Autenticación exitosa
[2025-08-03T10:30:15.789Z] [SUCCESS] ✅ Autenticación completada

============================================================
MENÚ DE PRUEBAS - MENSAJERÍA GENÉRICA
============================================================
1. Probar mensaje genérico
2. Probar mensaje broadcast
3. Suscribirse a eventos
4. Simular evento
5. Mostrar estado de pruebas
6. Ejecutar todas las pruebas
7. Cerrar conexión y salir
============================================================
Selecciona una opción (1-7): 1

[2025-08-03T10:30:20.123Z] [INFO] 🧪 Probando mensaje genérico...
[2025-08-03T10:30:20.234Z] [INFO] Mensaje genérico enviado con ID: test_1640995204500_abc123
[2025-08-03T10:30:20.345Z] [SUCCESS] ✅ Respuesta a mensaje genérico recibida: test_1640995204500_abc123
[2025-08-03T10:30:20.456Z] [INFO] Payload de respuesta: {"message":"Mensaje genérico recibido correctamente","botStatus":{"state":"idle"},"processed":true}

============================================================
MENÚ DE PRUEBAS - MENSAJERÍA GENÉRICA
============================================================
...
Selecciona una opción (1-7): 5

============================================================
ESTADO DE LAS PRUEBAS
============================================================
Conexión: ✅ EXITOSA
Autenticación: ✅ EXITOSA
Mensaje Genérico: ✅ EXITOSA
Mensaje Broadcast: ❌ FALLIDA
Eventos: ❌ FALLIDA
============================================================
Resumen: 3/5 pruebas exitosas
```

## Solución de Problemas Comunes

### Error de Conexión

```bash
$ npm run verify
❌ ERROR: No se pudo conectar en 10 segundos
   Verifica que el servidor esté ejecutándose en: ws://localhost:8080
```

**Solución:**
1. Verificar que el servidor coordinador esté ejecutándose
2. Comprobar la URL en `WS_SERVER_URL` en el archivo `.env`
3. Verificar conectividad de red

### Error de Autenticación

```bash
$ npm run verify
❌ Error de autenticación: Credenciales inválidas
   Verifica BOT_USERNAME y BOT_API_KEY en .env
```

**Solución:**
1. Verificar que `BOT_USERNAME` y `BOT_API_KEY` estén configurados en `.env`
2. Comprobar que el bot esté registrado en el servidor coordinador
3. Generar nuevas credenciales si es necesario

### Credenciales Faltantes

```bash
$ npm test
❌ ERROR: BOT_USERNAME y BOT_API_KEY son requeridos
   Configura estas variables en tu archivo .env
```

**Solución:**
Agregar al archivo `.env`:
```env
BOT_USERNAME=tu_username_aqui
BOT_API_KEY=tu_api_key_aqui
```

## Integración en CI/CD

### GitHub Actions

```yaml
name: Test Bot Soldier
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
        env:
          BOT_USERNAME: ${{ secrets.BOT_USERNAME }}
          BOT_API_KEY: ${{ secrets.BOT_API_KEY }}
          WS_SERVER_URL: ${{ secrets.WS_SERVER_URL }}
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "test"]
```

## Personalización

### Modificar Timeout

En `test_auto.js`, cambiar la constante:
```javascript
const TEST_TIMEOUT = 60000; // 60 segundos en lugar de 30
```

### Agregar Nuevas Pruebas

1. En `test_generic_messaging.js`, agregar función:
```javascript
async function testNewFeature() {
  log('🧪 Probando nueva funcionalidad...');
  // Implementación aquí
}
```

2. Agregar al menú y al manejador de entrada

3. En `test_auto.js`, agregar a `runAllTests()`:
```javascript
await this.testNewFeature();
```

### Configurar Logs Detallados

Modificar función `log()` para incluir más información:
```javascript
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const elapsed = Date.now() - this.testStartTime;
  const memory = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[${timestamp}] [+${elapsed}ms] [${memory.toFixed(1)}MB] [${type}] ${message}`);
}
```
