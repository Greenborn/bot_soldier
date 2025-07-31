# 🤖 Bot Soldier - WebSocket Client

## 📋 Descripción
Bot Soldier es un cliente Node.js robusto que se conecta a un servidor WebSocket y mantiene una conexió## 📡 Protocolo de Comunicación persistente con reconexión automática. Inclu```

## 📊 Monitoreo

### Logs del sistema servidor Express para monitoreo y control del estado del bot, así como funcionalidades de extracción de archivos ZIP.

## ✨ Características
- 🔄 **Reconexión automática** cuando se pierde la conexión
- 🌐 **Servidor HTTP integrado** para endpoints de estado
- 📝 **Logging detallado** de conexiones y mensajes
- ⚙️ **Configuración flexible** mediante variables de entorno
- 🛡️ **Manejo robusto de errores** WebSocket
- 📦 **Extracción de archivos ZIP** desde base64
- 📁 **Directorio de descargas configurable**

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm o yarn

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

O crea el archivo `.env` manualmente con el siguiente contenido:

```env
# URL del servidor WebSocket
WS_SERVER_URL=ws://localhost:8080

# Puerto del servidor Express local
PORT=3000

# Intervalo de reconexión en milisegundos
RECONNECT_INTERVAL=5000

# Directorio de descargas (relativo o absoluto)
DOWNLOADS_DIR=./descargas
```

### 3. Ejecutar el cliente
```bash
npm start
# o directamente:
node ws_client.js
```

## 🛠️ Uso

### Iniciar el bot
```bash
node ws_client.js
```

El bot automáticamente:
1. Se conectará al servidor WebSocket especificado
2. Enviará un mensaje de bienvenida
3. Iniciará el servidor HTTP en el puerto configurado
4. Mostrará logs de conexión y mensajes recibidos

### Endpoints HTTP disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Estado básico del cliente |
| `/status` | GET | Estado detallado del bot soldier |
| `/downloads` | GET | Lista de archivos extraídos |

#### Ejemplo de respuesta `/status`:
```json
{
  "bot": "soldier",
  "connected": true,
  "lastWelcome": "2025-07-31T10:30:00.000Z",
  "ws_server": "ws://localhost:8080",
  "downloads_dir": "/absolute/path/to/descargas"
}
```

#### Ejemplo de respuesta `/downloads`:
```json
{
  "downloads_directory": "/path/to/bot_soldier/descargas",
  "files": [
    {
      "name": "proyecto_001",
      "type": "directory",
      "size": 4096,
      "modified": "2025-07-31T10:35:00.000Z"
    },
    {
      "name": "archivo.txt",
      "type": "file", 
      "size": 1024,
      "modified": "2025-07-31T10:30:00.000Z"
    }
  ]
}
```

## ⚙️ Configuración

### Variables de entorno

| Variable | Tipo | Por defecto | Descripción |
|----------|------|-------------|-------------|
| `WS_SERVER_URL` | string | `ws://localhost:8080` | URL del servidor WebSocket |
| `PORT` | number | `3000` | Puerto del servidor Express |
| `RECONNECT_INTERVAL` | number | `5000` | Intervalo de reconexión (ms) |
| `DOWNLOADS_DIR` | string | `./descargas` | Directorio para archivos extraídos |

### Configuración del directorio de descargas

El directorio de descargas se puede configurar de las siguientes formas:

- **Ruta relativa**: `./descargas`, `../shared`, `files/extracted`
- **Ruta absoluta**: `/home/user/downloads`, `/var/app/files`
- **Directorio actual**: `.` (no recomendado)

**Importante**: 
- El directorio se creará automáticamente si no existe
- Para rutas absolutas, asegúrate de que tengas permisos de escritura
- Para rutas relativas, serán resueltas desde el directorio del proyecto

### Ejemplos de configuración

#### Desarrollo local
```env
WS_SERVER_URL=ws://localhost:8080
PORT=3000
RECONNECT_INTERVAL=5000
DOWNLOADS_DIR=./descargas
```

#### Producción
```env
WS_SERVER_URL=wss://mi-servidor.com:8080
PORT=8000
RECONNECT_INTERVAL=10000
DOWNLOADS_DIR=/var/app/downloads
```

#### Configuración personalizada
```env
WS_SERVER_URL=ws://192.168.1.100:8080
PORT=4000
RECONNECT_INTERVAL=3000
DOWNLOADS_DIR=../shared/extractions
```

## � Protocolo de Comunicación

### Mensajes enviados al servidor coordinador

#### Mensaje de bienvenida (`welcome`)
Se envía automáticamente al establecer la conexión:

```json
{
  "type": "welcome",
  "bot": "soldier",
  "timestamp": "2025-07-31T10:30:00.000Z"
}
```

### Mensajes recibidos del servidor coordinador

#### Lista de bots disponibles (`bots`)
El servidor puede enviar la lista de bots conectados:

```json
{
  "type": "bots",
  "data": [
    {
      "id": "soldier_001",
      "type": "soldier",
      "status": "connected",
      "lastSeen": "2025-07-31T10:30:00.000Z"
    },
    {
      "id": "worker_001", 
      "type": "worker",
      "status": "busy",
      "lastSeen": "2025-07-31T10:29:45.000Z"
    }
  ]
}
```

#### Extracción de archivos (`unzip`)
Comando para extraer archivos ZIP recibidos en base64:

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
- `extractTo`: (Opcional) Subdirectorio dentro de `descargas/` donde extraer

**Respuesta del bot:**
```json
{
  "type": "unzip_result",
  "success": true,
  "message": "Archivo extraído exitosamente",
  "extractedTo": "/path/to/descargas/proyecto_001",
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

## �📊 Monitoreo

### Logs del sistema
El bot genera logs detallados que incluyen:
- ✅ Conexiones exitosas
- ❌ Errores de conexión
- 🔄 Intentos de reconexión
- 📨 Mensajes enviados y recibidos
- 📁 Operaciones de extracción de archivos

### Verificar estado
```bash
# Verificar si el bot está ejecutándose
curl http://localhost:3000/status

# Ver logs en tiempo real
tail -f logs/bot-soldier.log  # si tienes logging a archivo
```

## 🔧 Desarrollo

### Estructura del proyecto
```
bot_soldier/
├── ws_client.js      # Archivo principal del cliente
├── package.json      # Dependencias y scripts
├── .env             # Variables de entorno (no subir a git)
├── .env.example     # Plantilla de variables de entorno
├── descargas/       # Directorio para archivos extraídos (creado automáticamente)
└── README.md        # Este archivo
```

### Scripts disponibles
```bash
npm start          # Iniciar el bot
npm run dev        # Modo desarrollo (con nodemon)
npm test           # Ejecutar tests (si están configurados)
```

## 🐛 Solución de problemas

### Problemas comunes

#### ❌ Error: ECONNREFUSED
```
Error en WebSocket: Error: connect ECONNREFUSED 127.0.0.1:8080
```
**Solución**: Verificar que el servidor WebSocket esté ejecutándose en la URL configurada.

#### ❌ Error: EADDRINUSE
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solución**: Cambiar el puerto en `.env` o detener el proceso que usa el puerto 3000.

#### 🔄 Reconexión continua
Si el bot se reconecta constantemente, verificar:
- La estabilidad del servidor WebSocket
- La configuración de `RECONNECT_INTERVAL`
- Los logs del servidor WebSocket

#### 🔄 Reconexión continua
Si el bot se reconecta constantemente, verificar:
- La estabilidad del servidor WebSocket
- La configuración de `RECONNECT_INTERVAL`
- Los logs del servidor WebSocket

#### 📁 Error en extracción de archivos
```
Error en extracción: Error al abrir ZIP: invalid signature
```
**Solución**: Verificar que el base64 esté correctamente codificado y sea un archivo ZIP válido.

#### 💾 Error de permisos en directorio descargas
```
Error: EACCES: permission denied, mkdir '/path/to/descargas'
```
**Solución**: Verificar permisos de escritura en el directorio del proyecto:
```bash
chmod 755 /path/to/bot_soldier
```

#### 📂 Directorio de descargas no encontrado
```
Error: ENOENT: no such file or directory
```
**Soluciones**:
1. Verificar que la ruta en `DOWNLOADS_DIR` sea correcta
2. Para rutas relativas, verificar que estén relacionadas al directorio del proyecto
3. Para rutas absolutas, verificar que el directorio padre exista:
```bash
# Crear directorio padre si no existe
mkdir -p /ruta/completa/al/directorio/padre
```

### Debug
Para obtener más información de debug:
```bash
DEBUG=* node ws_client.js
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

- 🐛 **Issues**: [GitHub Issues](https://github.com/Greenborn/bot_soldier/issues)
- 📧 **Email**: [tu-email@ejemplo.com]
- 💬 **Slack/Discord**: [enlace al canal]
