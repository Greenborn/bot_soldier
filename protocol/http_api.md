# API HTTP Endpoints

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

**Response (Éxito):**
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
