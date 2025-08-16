# Categorías de Mensajes Genéricos

| Categoría | Descripción | Ejemplos de Uso |
|-----------|-------------|-----------------|
| `system` | Operaciones del sistema | Configuración, actualizaciones, mantenimiento |
| `monitoring` | Monitoreo y métricas | CPU, memoria, disco, espacio libre, estado de servicios |
| `data` | Intercambio de datos | Transferencia de archivos, base de datos |
| `notification` | Notificaciones | Alertas, avisos, recordatorios |
| `command` | Comandos especiales | Operaciones personalizadas |
| `custom` | Mensajes personalizados | Casos específicos de uso |

## Prioridades de Mensajes

| Prioridad | Descripción | Procesamiento | TTL |
|-----------|-------------|---------------|-----|
| `low` | Baja prioridad | Cuando recursos disponibles | 24h |
| `normal` | Prioridad normal | Orden FIFO estándar | 8h |
| `high` | Alta prioridad | Procesamiento preferente | 2h |
| `urgent` | Crítico | Procesamiento inmediato | 30m |
