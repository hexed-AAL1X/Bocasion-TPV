# Documentos del proyecto

## Informe de planificación

| Archivo | Uso |
|---------|-----|
| [Informe-Proyecto-BocaSoft.pdf](Informe-Proyecto-BocaSoft.pdf) | Versión PDF lista para entregar (8 páginas, A4) |
| [Informe-Proyecto-BocaSoft.html](Informe-Proyecto-BocaSoft.html) | Fuente editable; abrir en navegador si necesitas cambios |

Para regenerar el PDF tras editar el HTML:

```bash
chromium --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=docs/Informe-Proyecto-BocaSoft.pdf \
  "file://$(pwd)/docs/Informe-Proyecto-BocaSoft.html"
```

Incluye portada Bocasión S.A.C., proyecto Intranet Ventas, cronograma, sprints, equipo, arquitectura, ciberseguridad y presupuesto.
