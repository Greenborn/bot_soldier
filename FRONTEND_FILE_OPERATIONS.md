# Documentación de Operaciones sobre Archivos en DOWNLOADS_DIR vía WebSocket

Esta guía describe cómo implementar en el frontend las operaciones para listar, agregar, descargar y eliminar archivos/directorios en el bot soldier usando el protocolo WebSocket definido en el proyecto.

## 1. Listar archivos y directorios

### Solicitud
```json
{
  "type": "system_command",
  "command": "ls -la <ruta_relativa>",
  "from": "panel",
  "requestId": "cmd_<timestamp>_<id>"
}
```
- `<ruta_relativa>`: Ruta relativa dentro de `DOWNLOADS_DIR` (ejemplo: `subcarpeta/`).

### Respuesta
```json
{
  "type": "system_command_response",
  "requestId": "cmd_<timestamp>_<id>",
  "command": "ls -la <ruta_relativa>",
  "success": true,
  "output": "...listado en formato texto...",
  "error": null,
  "exitCode": 0
}
```

## 2. Agregar archivo nuevo (subir ZIP)

### Solicitud
```json
{
  "type": "receive_zip",
  "filename": "archivo.zip",
  "base64": "<contenido_base64>",
  "extractTo": "subcarpeta" // opcional
}
```
- `base64`: Contenido del archivo ZIP codificado en base64.
- `extractTo`: Subdirectorio dentro de `DOWNLOADS_DIR` donde extraer.

### Respuesta
```json
{
  "type": "receive_zip_result",
  "success": true,
  "message": "Archivo extraído exitosamente",
  "extractedTo": "/ruta/descargas/subcarpeta",
  "files": ["file1.txt", "folder/file2.txt"]
}
```

## 3. Descargar archivo (obtener base64)

### Solicitud
```json
{
  "type": "system_command",
  "command": "read_file_base64",
  "parameters": { "path": "subcarpeta/archivo.txt" },
  "from": "panel",
  "requestId": "cmd_<timestamp>_<id>"
}
```

### Respuesta
```json
{
  "type": "system_command_response",
  "requestId": "cmd_<timestamp>_<id>",
  "command": "read_file_base64",
  "success": true,
  "output": "<contenido_base64>",
  "error": null,
  "exitCode": 0
}
```

## 4. Eliminar archivo/directorio

### Solicitud
```json
{
  "type": "system_command",
  "command": "delete_file",
  "parameters": { "path": "subcarpeta/archivo.txt" },
  "from": "panel",
  "requestId": "cmd_<timestamp>_<id>"
}
```

### Respuesta
```json
{
  "type": "system_command_response",
  "requestId": "cmd_<timestamp>_<id>",
  "command": "delete_file",
  "success": true,
  "output": "Archivo eliminado",
  "error": null,
  "exitCode": 0
}
```

## 5. Notificaciones de proceso

El bot puede enviar notificaciones automáticas sobre el estado de las operaciones:
- Extracción iniciada:
  ```json
  {
    "type": "extraction_started",
    "filename": "archivo.zip",
    "extractTo": "subcarpeta",
    "timestamp": "2025-08-03T12:34:56.789Z"
  }
  ```
- Extracción completada:
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
- Extracción fallida:
  ```json
  {
    "type": "extraction_failed",
    "success": false,
    "filename": "archivo.zip",
    "error": "Error al extraer el archivo",
    "timestamp": "2025-08-03T12:35:01.123Z"
  }
  ```

## 6. Consideraciones
- Todas las rutas deben ser relativas a `DOWNLOADS_DIR`.
- El frontend debe generar un `requestId` único para cada operación.
- Los mensajes de error incluyen el campo `error` y `exitCode`.
- El bot puede enviar notificaciones automáticas sobre el estado de las operaciones.

---

**Referencia:**
- `protocol/websocket_messages.md`
- `PROTOCOL.md`
- `README.md`

Esta documentación cubre los mensajes y flujos necesarios para implementar la gestión de archivos en el frontend del panel de control.
