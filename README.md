# Inventario

Este proyecto es una aplicación de inventario construida con Django y FastAPI.

## Instalación

1. Crea un entorno virtual y actívalo.
2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Ejecuta las migraciones y crea un superusuario:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

## Ejecución

Para iniciar el servidor usando ASGI con FastAPI y Django:

```bash
uvicorn configuracion.asgi:application --reload
```

Los endpoints de la API están disponibles en:

- `/api/productos/`
- `/api/movimientos/`

## Asignar grupos de usuarios

En el panel de administración de Django puedes crear grupos y asignarlos a los usuarios. Usa la etiqueta `has_group` incluida en los *template tags* para restringir funcionalidades en las plantillas.

## Cargar productos desde Excel

En la sección "Cargar productos" del menú se puede subir un archivo Excel. Primero se muestra una vista previa y luego se confirma la importación.

## Generar reportes

- **Reporte de inventario**: acceder a `/inventario/reporte/` y usar el botón "Exportar a Excel" para obtener el archivo.
- **Balance**: desde `/balance/` se puede generar y exportar el balance mensual en Excel o PDF.