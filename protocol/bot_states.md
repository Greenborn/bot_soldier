# Estados de Bot

| Estado | Descripción | Transiciones Permitidas |
|--------|-------------|------------------------|
| `idle` | Bot inactivo, listo para recibir comandos | → working, maintenance, error |
| `working` | Bot ejecutando una o más acciones | → idle, error |
| `error` | Bot en estado de error | → idle, maintenance, offline |
| `maintenance` | Bot en mantenimiento programado | → idle, offline |
| `offline` | Bot desconectado | → idle (al reconectar) |
