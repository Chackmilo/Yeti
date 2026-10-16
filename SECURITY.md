# 🔒 Política de Seguridad — Otter Escape: Yeti Chase

La seguridad, integridad y estabilidad de la suite de videojuegos **Otter Escape: Yeti Chase** son de suma importancia.

## Versiones Soportadas

Actualmente se proporciona soporte activo de parches y revisiones de seguridad en las siguientes versiones:

| Versión | Soportada |
| :--- | :---: |
| `4.5.x` | :white_check_mark: |
| `< 4.5.0` | :x: |

## Notificación de Vulnerabilidades

Si descubres una posible vulnerabilidad de seguridad en cualquier componente de la suite (servidor Nginx, Dockerfile, WebSocket bridge, o dependencias de cliente), te agradecemos que nos lo notifiques de forma responsable.

1. **No abras un Issue público** para reportar fallos de seguridad críticos.
2. Envía un correo con los detalles del reporte, vector de ataque o prueba de concepto (PoC).
3. El equipo acusará recibo en menos de 48 horas y coordinará la publicación de un parche de mitigación antes de la divulgación pública.

## Pautas de Seguridad del Motor

* **Sin almacenamiento de datos confidenciales:** La suite no recopila información personal identificable (PII). Todos los récords se almacenan localmente en el navegador mediante `localStorage` con fallback en memoria.
* **Cabeceras HTTP estrictas:** La configuración de Nginx (`nginx.conf`) aplica cabeceras de endurecimiento (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`).
* **Aislamiento de Docker:** El contenedor de producción corre sobre Nginx Alpine sin privilegios innecesarios y con healthcheck activo.
