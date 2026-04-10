# Overleaf Community Edition — Setup con soporte para español

Una instancia auto-hospedada de [Overleaf Community Edition](https://github.com/overleaf/overleaf) extendida con un conjunto de paquetes LaTeX preinstalados, incluyendo soporte completo para el idioma español y paquetes comunes para documentos académicos e ingeniería.

## Qué agrega este fork

Este repositorio extiende la imagen Docker oficial `sharelatex/sharelatex` con los siguientes paquetes de TeX Live preinstalados:

| Paquete / Colección | Descripción |
|---|---|
| `collection-bibtexextra` | Estilos y herramientas extendidas de BibTeX |
| `collection-fontsextra` | Colección amplia de fuentes adicionales |
| `collection-langspanish` | Soporte completo de español: separación silábica e idioma |
| `collection-latexextra` | Gran colección de paquetes LaTeX adicionales |
| `collection-latexrecommended` | Paquetes LaTeX recomendados |
| `palatino` | Familia de fuentes Palatino |
| `helvetic` | Familia de fuentes Helvetica |
| `apacite` | Estilo de citas APA |
| `ieeetran` | Clase de documento para IEEE Transactions |
| `cite` | Manejo mejorado de citas |
| `float` | Interfaz mejorada para objetos flotantes |
| `multirow` | Celdas de tabla que abarcan múltiples filas |
| `pdfpages` | Inclusión de documentos PDF completos |
| `setspace` | Control del interlineado |
| `times` | Familia de fuentes Times |
| `xcolor` | Soporte extendido de colores |
| `xurl` | Mejoras en el salto de línea de URLs |
| `transparent` | Soporte de transparencia |
| `pgf` | Portable Graphics Format (base de TikZ) |
| `svg` | Inclusión de figuras SVG |
| `algorithms` | Entornos para algoritmos y pseudocódigo |

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/CtpN3m01/overleaf.git
cd overleaf
```

### 2. Configurar la URL del sitio

Abrir `docker-compose.yml` y establecer `OVERLEAF_SITE_URL` con tu dominio o IP:

```yaml
OVERLEAF_SITE_URL: http://localhost          # para uso local
# OVERLEAF_SITE_URL: https://tu-dominio.com  # para un servidor público
```

### 3. Construir la imagen Docker personalizada

Este paso instala todos los paquetes LaTeX listados arriba. Puede tardar **10–20 minutos** en la primera construcción dependiendo de la conexión a internet.

```bash
docker compose build
```

### 4. Iniciar los servicios

```bash
docker compose up -d
```

Esto inicia tres contenedores:
- `sharelatex` — la aplicación Overleaf (puerto 80)
- `mongo` — MongoDB 8.0 con replica set
- `redis` — Redis 6.2

### 5. Crear la primera cuenta de administrador

Una vez que los contenedores estén corriendo, abrir el navegador y acceder a:

```
http://localhost/launchpad
```

Seguir las instrucciones en pantalla para crear la cuenta de administrador.

### 6. Acceder a Overleaf

Navegar a `http://localhost` (o la URL configurada) e iniciar sesión.

## Persistencia de datos

Todos los datos se almacenan en directorios locales montados como volúmenes Docker:

| Directorio | Contenido |
|---|---|
| `./sharelatex_data_v2/` | Proyectos y archivos de usuarios de Overleaf |
| `./mongo_data_v2/` | Base de datos MongoDB |
| `./redis_data_v2/` | Datos de Redis |

Estos directorios se crean automáticamente en el primer arranque y están en `.gitignore`, por lo que nunca se commitean.

## Comandos útiles

```bash
# Detener todos los servicios
docker compose down

# Ver logs en tiempo real
docker compose logs -f sharelatex

# Reiniciar un servicio
docker compose restart sharelatex

# Reconstruir la imagen tras cambios en Dockerfile.sharelatex
docker compose build --no-cache
docker compose up -d
```

## Configuración adicional

Las opciones adicionales se configuran en `docker-compose.yml` bajo la sección `environment` del servicio `sharelatex`. Opciones comunes:

```yaml
OVERLEAF_APP_NAME: Overleaf Community Edition
EMAIL_CONFIRMATION_DISABLED: "true"
OVERLEAF_ADMIN_EMAIL: admin@ejemplo.com
```

## Configuración de correo (SMTP)

Por defecto, la confirmación de correo está desactivada (`EMAIL_CONFIRMATION_DISABLED: "true"`). Para habilitar el envío de correos (invitaciones, recuperación de contraseña, notificaciones), seguir estos pasos:

### 1. Descomentar y completar las variables en `docker-compose.yml`

```yaml
EMAIL_CONFIRMATION_DISABLED: "false"

OVERLEAF_EMAIL_FROM_ADDRESS: "no-reply@tu-dominio.com"
OVERLEAF_ADMIN_EMAIL: "admin@tu-dominio.com"

OVERLEAF_EMAIL_SMTP_HOST: smtp.tu-proveedor.com
OVERLEAF_EMAIL_SMTP_PORT: 587
OVERLEAF_EMAIL_SMTP_SECURE: false
OVERLEAF_EMAIL_SMTP_USER: tu-usuario@tu-dominio.com
OVERLEAF_EMAIL_SMTP_PASS: tu-contraseña
OVERLEAF_EMAIL_SMTP_TLS_REJECT_UNAUTH: true
OVERLEAF_EMAIL_SMTP_IGNORE_TLS: false
```

### 2. Valores según proveedor

**Gmail** (requiere [contraseña de aplicación](https://myaccount.google.com/apppasswords)):
```yaml
OVERLEAF_EMAIL_SMTP_HOST: smtp.gmail.com
OVERLEAF_EMAIL_SMTP_PORT: 587
OVERLEAF_EMAIL_SMTP_SECURE: false
OVERLEAF_EMAIL_SMTP_USER: tu-cuenta@gmail.com
OVERLEAF_EMAIL_SMTP_PASS: xxxx-xxxx-xxxx-xxxx  # contraseña de aplicación
```

**Outlook / Office 365:**
```yaml
OVERLEAF_EMAIL_SMTP_HOST: smtp.office365.com
OVERLEAF_EMAIL_SMTP_PORT: 587
OVERLEAF_EMAIL_SMTP_SECURE: false
OVERLEAF_EMAIL_SMTP_USER: tu-cuenta@outlook.com
OVERLEAF_EMAIL_SMTP_PASS: tu-contraseña
```

**Servidor SMTP propio (ej. Postfix):**
```yaml
OVERLEAF_EMAIL_SMTP_HOST: mail.tu-dominio.com
OVERLEAF_EMAIL_SMTP_PORT: 587
OVERLEAF_EMAIL_SMTP_SECURE: false
OVERLEAF_EMAIL_SMTP_USER: no-reply@tu-dominio.com
OVERLEAF_EMAIL_SMTP_PASS: tu-contraseña
```

### 3. Aplicar los cambios

```bash
docker compose down
docker compose up -d
```

> **Nota:** Las credenciales SMTP quedan en texto plano en `docker-compose.yml`. Si vas a subir el repositorio a GitHub, usá un archivo `.env` para los valores sensibles y referencialo desde el compose así:
> ```yaml
> OVERLEAF_EMAIL_SMTP_PASS: ${SMTP_PASS}
> ```
> El archivo `.env` ya está en `.gitignore` por defecto.

## Licencia

Este proyecto está basado en [Overleaf](https://github.com/overleaf/overleaf), publicado bajo la [GNU AGPL v3](LICENSE).
