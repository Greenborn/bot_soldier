# Manejo de Errores

### Error General (Servidor → Cliente)
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
