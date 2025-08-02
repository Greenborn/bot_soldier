# Terminal Interactivo PTY - Bot Soldier

El bot soldier ahora soporta comandos interactivos mediante PTY (Pseudo Terminal), lo que permite ejecutar comandos como `nano`, `vim`, `htop`, `top`, `less`, etc.

## Características

- ✅ **Comandos interactivos**: nano, vim, htop, top, less, man, etc.
- ✅ **Control TTY completo**: colores, secuencias de escape
- ✅ **Interacción bidireccional**: envío de entrada en tiempo real
- ✅ **Múltiples sesiones**: manejo de varias terminales simultáneas
- ✅ **Redimensionamiento**: soporte para cambio de tamaño de terminal
- ✅ **Señales**: envío de Ctrl+C, Ctrl+Z, SIGTERM, etc.
- ✅ **Limpieza automática**: cierre de sesiones inactivas (1 hora)

## Protocolo WebSocket

### 1. Iniciar Sesión PTY

**Mensaje del servidor al bot:**
```json
{
  "type": "pty_start",
  "requestId": "req_123456",
  "command": "nano /etc/hosts",
  "interactive": true
}
```

**Respuesta del bot:**
```json
{
  "type": "pty_started",
  "sessionId": "pty_1640995200000_1",
  "requestId": "req_123456",
  "command": "nano /etc/hosts",
  "success": true,
  "timestamp": 1640995200000
}
```

### 2. Enviar Entrada a PTY

**Mensaje del servidor al bot:**
```json
{
  "type": "pty_input",
  "sessionId": "pty_1640995200000_1",
  "data": "Hello World\r"
}
```

### 3. Recibir Salida de PTY

**Mensaje del bot al servidor (automático):**
```json
{
  "type": "pty_output",
  "sessionId": "pty_1640995200000_1",
  "requestId": "req_123456",
  "data": "\u001b[H\u001b[2JGNU nano 6.2",
  "timestamp": 1640995200100
}
```

### 4. Redimensionar Terminal

**Mensaje del servidor al bot:**
```json
{
  "type": "pty_resize",
  "sessionId": "pty_1640995200000_1",
  "cols": 120,
  "rows": 30
}
```

### 5. Terminar Sesión

**Mensaje del servidor al bot:**
```json
{
  "type": "pty_kill",
  "sessionId": "pty_1640995200000_1",
  "signal": "SIGTERM"
}
```

### 6. Listar Sesiones Activas

**Mensaje del servidor al bot:**
```json
{
  "type": "pty_list"
}
```

**Respuesta del bot:**
```json
{
  "type": "pty_sessions_list",
  "sessions": [
    {
      "sessionId": "pty_1640995200000_1",
      "requestId": "req_123456",
      "command": "nano /etc/hosts",
      "createdAt": 1640995200000,
      "uptime": 30000
    }
  ],
  "total": 1,
  "timestamp": 1640995230000
}
```

## API HTTP Local

### Iniciar Sesión PTY Local

```bash
curl -X POST http://localhost:3000/pty/start \
  -H "Content-Type: application/json" \
  -d '{"command": "htop", "interactive": true}'
```

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "local_pty_1640995200000_1",
  "command": "htop",
  "interactive": true,
  "timestamp": "2023-12-31T12:00:00.000Z",
  "message": "Sesión PTY iniciada exitosamente"
}
```

### Enviar Entrada a Sesión

```bash
curl -X POST http://localhost:3000/pty/local_pty_1640995200000_1/input \
  -H "Content-Type: application/json" \
  -d '{"data": "q"}'
```

### Listar Sesiones Activas

```bash
curl http://localhost:3000/pty/sessions
```

**Respuesta:**
```json
{
  "sessions": [
    {
      "sessionId": "local_pty_1640995200000_1",
      "requestId": "local_req_1640995200000",
      "command": "htop",
      "createdAt": "2023-12-31T12:00:00.000Z",
      "uptime": 30000,
      "outputLength": 2048
    }
  ],
  "total": 1,
  "timestamp": "2023-12-31T12:00:30.000Z"
}
```

### Terminar Sesión

```bash
curl -X DELETE http://localhost:3000/pty/local_pty_1640995200000_1 \
  -H "Content-Type: application/json" \
  -d '{"signal": "SIGTERM"}'
```

## WebSocket Local

Los clientes que se conecten al WebSocket local (puerto 8081) pueden usar estos mensajes:

### Iniciar PTY Local

```json
{
  "type": "pty_start_local",
  "command": "nano test.txt",
  "interactive": true
}
```

### Enviar Entrada

```json
{
  "type": "pty_input_local",
  "sessionId": "local_ws_pty_1640995200000_1",
  "data": "Hello World\r"
}
```

### Listar Sesiones

```json
{
  "type": "pty_list_local"
}
```

## Ejemplos Prácticos

### 1. Editar Archivo con Nano

```bash
# Iniciar nano
curl -X POST http://localhost:3000/pty/start \
  -H "Content-Type: application/json" \
  -d '{"command": "nano test.txt"}'

# Escribir contenido
curl -X POST http://localhost:3000/pty/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -d '{"data": "Hello World\n"}'

# Guardar y salir (Ctrl+X, Y, Enter)
curl -X POST http://localhost:3000/pty/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -d '{"data": "\u0018"}'  # Ctrl+X

curl -X POST http://localhost:3000/pty/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -d '{"data": "y"}'       # Y

curl -X POST http://localhost:3000/pty/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -d '{"data": "\r"}'      # Enter
```

### 2. Monitorear Sistema con htop

```bash
# Iniciar htop
curl -X POST http://localhost:3000/pty/start \
  -H "Content-Type: application/json" \
  -d '{"command": "htop"}'

# Salir de htop
curl -X POST http://localhost:3000/pty/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -d '{"data": "q"}'
```

### 3. Navegar con Less

```bash
# Ver archivo con less
curl -X POST http://localhost:3000/pty/start \
  -H "Content-Type: application/json" \
  -d '{"command": "less /var/log/syslog"}'

# Navegar hacia abajo
curl -X POST http://localhost:3000/pty/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -d '{"data": " "}'       # Espacio (página abajo)

# Salir
curl -X POST http://localhost:3000/pty/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -d '{"data": "q"}'
```

## Secuencias de Control Útiles

| Secuencia | Descripción | JSON |
|-----------|-------------|------|
| `Ctrl+C` | Interrupción | `{"data": "\u0003"}` |
| `Ctrl+Z` | Suspender | `{"data": "\u001A"}` |
| `Ctrl+D` | EOF | `{"data": "\u0004"}` |
| `Ctrl+L` | Limpiar pantalla | `{"data": "\u000C"}` |
| `Enter` | Nueva línea | `{"data": "\r"}` |
| `Tab` | Tabulación | `{"data": "\t"}` |
| `Escape` | Escape | `{"data": "\u001B"}` |
| `Flecha arriba` | ↑ | `{"data": "\u001B[A"}` |
| `Flecha abajo` | ↓ | `{"data": "\u001B[B"}` |
| `Flecha derecha` | → | `{"data": "\u001B[C"}` |
| `Flecha izquierda` | ← | `{"data": "\u001B[D"}` |

## Estado y Monitoreo

El endpoint `/status` incluye información sobre PTY:

```json
{
  "capabilities": {
    "pty_terminal": true,
    "interactive_commands": true,
    "max_pty_sessions": 10,
    "pty_session_timeout": 3600000
  },
  "pty_info": {
    "active_sessions": 2,
    "session_counter": 15,
    "cleanup_interval": "30 minutes"
  }
}
```

## Limitaciones y Consideraciones

1. **Límite de sesiones**: Máximo 10 sesiones PTY simultáneas
2. **Timeout automático**: Sesiones inactivas se cierran después de 1 hora
3. **Buffer de salida**: Se almacena toda la salida en memoria
4. **Tamaño de terminal**: Por defecto 80x24, redimensionable
5. **Codificación**: UTF-8 por defecto
6. **Plataforma**: Funciona en Linux/macOS, limitado en Windows

## Troubleshooting

### Problema: Sesión no responde

```bash
# Verificar sesiones activas
curl http://localhost:3000/pty/sessions

# Terminar sesión problemática
curl -X DELETE http://localhost:3000/pty/SESSION_ID
```

### Problema: Caracteres extraños en salida

Esto es normal para aplicaciones que usan secuencias de escape ANSI (colores, posicionamiento del cursor). Un cliente terminal real interpretaría estas secuencias correctamente.

### Problema: Comando no termina

```bash
# Enviar Ctrl+C
curl -X POST http://localhost:3000/pty/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -d '{"data": "\u0003"}'

# O forzar terminación
curl -X DELETE http://localhost:3000/pty/SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{"signal": "SIGKILL"}'
```
