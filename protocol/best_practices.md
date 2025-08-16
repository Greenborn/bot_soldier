# Mejores Prácticas

### Para Bots
1. **Registro**: Registrarse usando el script de gestión antes de conectar
2. **Credenciales**: Guardar de forma segura username y API key
3. **Identificación**: Incluir username y apiKey al conectar
4. **Heartbeat**: Enviar heartbeat cada 30 segundos con estado actualizado
5. **Acciones**: Validar parámetros antes de ejecutar acciones
6. **Estados**: Mantener estado consistente y reportar cambios
7. **Errores**: Usar códigos de error estándar y proporcionar mensajes descriptivos
8. **Mensajería genérica**: Procesar mensajes según categoría y prioridad
9. **Suscripciones**: Manejar eventos suscritos de forma eficiente
10. **Respuestas**: Responder a mensajes que expectResponse=true

### Para Paneles
1. **Autenticación**: Autenticarse via HTTP antes de usar WebSocket
2. **Identificación**: Identificarse como `panel` al conectar
3. **IDs únicos**: Usar IDs únicos para `requestId` y `actionId`
4. **Timeouts**: Implementar timeouts para acciones de larga duración
5. **Manejo de errores**: Manejar todos los tipos de respuesta (éxito, error, timeout)
6. **Token Management**: Renovar tokens antes de que expiren (24h)
7. **Mensajería**: Usar categorías apropiadas para mensajes genéricos
8. **Filtros**: Aplicar filtros eficientes en suscripciones
9. **Prioridades**: Usar prioridades adecuadas según urgencia
10. **Cleanup**: Cancelar suscripciones no utilizadas

### Para el Servidor
1. **Autenticación**: Validar tokens JWT para paneles y API keys para bots
2. **Registro de bots**: Mantener archivo seguro de credenciales de bots
3. **Routing**: Enrutar mensajes según `targetBot` cuando sea necesario
4. **Validación**: Validar estructura de mensajes antes de procesar
5. **Estado**: Mantener estado actualizado de todos los clientes
6. **Broadcast**: Enviar actualizaciones solo a clientes relevantes
7. **Rate Limiting**: Aplicar límites de velocidad en endpoints críticos
8. **Logs de seguridad**: Registrar intentos de autenticación fallidos
9. **Gestión de eventos**: Mantener registro eficiente de suscripciones
10. **Cleanup**: Limpiar suscripciones de clientes desconectados
11. **Priorización**: Procesar mensajes según prioridad
12. **Filtrado**: Aplicar filtros de eventos correctamente
