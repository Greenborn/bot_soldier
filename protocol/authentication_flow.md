# Flujo de Autenticación Completo

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
