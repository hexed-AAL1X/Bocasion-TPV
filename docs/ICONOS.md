# Iconos de la cinta (ribbon)

Los iconos de la pestaña **Inicio** provienen de packs **Vista** coherentes entre sí (estilo skeuomórfico 3D, sin recortes de capturas).

## Ver y elegir iconos

Todos los candidatos y los iconos **en uso** están en una sola carpeta:

| Ruta | Uso |
|------|-----|
| `public/images/iconos/` | Catálogo completo (PNG + `index.html`) |
| `public/images/ribbon/` | Solo los 13 iconos activos de la cinta |

Con el servidor de desarrollo:

```text
http://localhost:5173/images/iconos/
```

Ahí verás una galería por función (Inbox, Clientes, Menú, etc.). Los que llevan prefijo `activo-` son los que usa la app hoy. Elige otro archivo (ej. `inbox-shell32-27.png`) y dime el nombre para cambiarlo en la cinta.

## Fuentes

| Pack | Uso | Licencia / notas |
|------|-----|------------------|
| **Windows Vista `shell32.dll` / `imageres.dll`** | Inbox, productos, notas, clientes, boleta, menú, etc. | Iconos del sistema Windows Vista (extraídos vía [windows-ui-assets](https://github.com/bartekl1/windows-ui-assets)). Uso en UI de escritorio; son activos de Microsoft. |
| **Vista Business Icons (demo AWIcons / Lokas)** | Cobranzas | Demo gratuito: [vistabusinessiconsdemo.zip](https://www.awicons.com/download/vistabusinessiconsdemo.zip). Pack comercial completo en [awicons.com](https://www.awicons.com/stock-icons/vista-business/). |

## Mapeo (cinta activa)

| Archivo | Función | Origen |
|---------|---------|--------|
| `inbox.png` | Actualizar Inbox | `imageres` #184 |
| `productos.png` | Padrón de productos | `shell32` #171 |
| `orden-compra.png` | Orden compra | Documento `imageres` #102 + insignia **OC** |
| `notas-ingreso.png` | Notas ingreso | Documento + insignia **NI** |
| `notas-salida.png` | Notas salida | Documento + insignia **NS** |
| `mostrador.png` | Mostrador ventas | `imageres` #178 |
| `menu.png` | Definir menú | `imageres` #121 |
| `remision.png` | G/Remisión | Documento + insignia **G** |
| `boleta.png` | Boleta vta. | Documento + insignia **B** |
| `factura.png` | Factura | Documento + insignia **F** |
| `nota-vta.png` | Nota vta. | Documento + insignia **NV** |
| `clientes.png` | Clientes | `imageres` #130 |
| `cobranzas.png` | Cobranzas | Vista Business `650600-coin-box` |

Convención en el catálogo: `{función}-{dll}-{índice}.png` (ej. `clientes-imageres-130.png`).

## Regenerar

Con el clon sparse de `windows-ui-assets` en `/tmp/wua` y el ZIP demo extraído en `public/images/ribbon/_vendor/vista-business-demo/`:

```bash
python3 scripts/build-ribbon-icons.py
```

Regenera la cinta (`ribbon/`) y el catálogo completo (`iconos/` + galería HTML).

Variables opcionales: `WUA_ICONS`, `VB_DEMO`.

## Pack completo (opcional)

Para más iconos del mismo estilo (documentos, caja fuerte, calendario, etc.) está el pack comercial **Vista Business Icons** (~1 329 iconos, PNG/ICO 16–256 px). El demo incluye solo 3 iconos; el resto de la cinta usa iconos del sistema Vista anteriores.
