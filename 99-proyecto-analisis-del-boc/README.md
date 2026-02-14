# Análisis del Boletín Oficial de Canarias (BOC)

Proyecto de análisis de datos del Boletín Oficial de Canarias utilizando Kestra para la orquestación de flujos de trabajo y dbt para el modelado y transformación de datos.

## Descripción

Este proyecto descarga, procesa y analiza los artículos publicados en el Boletín Oficial de Canarias (BOC), proporcionando herramientas para:

- Extracción automatizada de artículos del BOC
- Almacenamiento estructurado en PostgreSQL
- Transformación y modelado de datos con dbt
- Orquestación de pipelines con Kestra
- Visualización y consulta de datos

## Requisitos Previos

- Docker y Docker Compose instalados
- Al menos 4GB de RAM disponible
- Conexión a internet para descargar imágenes y datos

## Configuración

### 1. Configurar Variables de Entorno

El proyecto incluye un archivo `env.template` con las variables de entorno necesarias. Para configurar tu entorno:

```bash
# Copiar el template
cp env.template .env

# Editar el archivo .env con tus valores
nano .env  # o usa tu editor preferido
```

#### Variables Disponibles

El archivo `env.template` contiene las siguientes variables:

```bash
# PostgreSQL - Base de datos principal
POSTGRES_DATA_USER=root
POSTGRES_DATA_PASSWORD=password

# Kestra - Orquestador
KESTRA_PORT=8080
KESTRA_USER=admin@domain.local
KESTRA_PASSWORD=Admin1234!
```

**Notas importantes:**
- `KESTRA_USER` debe ser una dirección de email válida
- `KESTRA_PASSWORD` debe tener al menos 8 caracteres, incluir una mayúscula y un número
- Cambia estos valores por defecto en entornos de producción

### 2. Iniciar los Servicios

Una vez configurado el archivo `.env`, inicia todos los servicios con Docker Compose:

```bash
# Iniciar todos los servicios en segundo plano
docker-compose up -d

# Ver los logs de todos los servicios
docker-compose logs -f

# Ver el estado de los servicios
docker-compose ps
```

### 3. Verificar que los Servicios están Activos

El proyecto incluye los siguientes servicios:

| Servicio | Puerto | URL | Descripción |
|----------|--------|-----|-------------|
| **Kestra** | 8080 | http://localhost:8080 | Orquestador de flujos de trabajo |
| **pgAdmin** | 8085 | http://localhost:8085 | Interfaz web para PostgreSQL |
| **PostgreSQL (datos)** | 5432 | localhost:5432 | Base de datos principal |
| **PostgreSQL (Kestra)** | - | interno | Base de datos para Kestra |

#### Acceder a Kestra

1. Abre tu navegador en http://localhost:8080
2. Inicia sesión con las credenciales configuradas en `.env`:
   - Usuario: valor de `KESTRA_USER`
   - Contraseña: valor de `KESTRA_PASSWORD`

#### Acceder a pgAdmin

1. Abre tu navegador en http://localhost:8085
2. Inicia sesión con:
   - Email: `admin@admin.com` (por defecto)
   - Contraseña: `root` (por defecto)

Para conectar pgAdmin a PostgreSQL:
- Host: `postgres`
- Puerto: `5432`
- Database: `boc`
- Usuario: valor de `POSTGRES_DATA_USER`
- Contraseña: valor de `POSTGRES_DATA_PASSWORD`

## Arquitectura del Proyecto

```
┌─────────────┐
│   Kestra    │  ← Orquestación de pipelines
└──────┬──────┘
       │
       ├─→ Descarga datos del BOC
       │
       ├─→ Carga en PostgreSQL
       │
       └─→ Ejecuta transformaciones dbt
              │
              ↓
       ┌──────────────┐
       │  PostgreSQL  │  ← Almacenamiento de datos
       └──────────────┘
              │
              ↓
       ┌──────────────┐
       │     dbt      │  ← Transformaciones y modelos
       └──────────────┘
```

## Uso

### Detener los Servicios

```bash
# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (¡CUIDADO: elimina todos los datos!)
docker-compose down -v
```

### Reiniciar un Servicio Específico

```bash
# Reiniciar Kestra
docker-compose restart kestra

# Ver logs de un servicio específico
docker-compose logs -f kestra
```

### Acceder a la Base de Datos

```bash
# Conectar a PostgreSQL desde la línea de comandos
docker-compose exec postgres psql -U root -d boc

# Exportar la contraseña para facilitar la conexión
export PGPASSWORD=$(grep POSTGRES_DATA_PASSWORD .env | cut -d'=' -f2)
```

## Estructura del Proyecto

```
.
├── docker-compose.yml    # Definición de servicios
├── env.template          # Template de variables de entorno
├── .env                  # Variables de entorno (no en git)
├── .gitignore            # Archivos ignorados por git
└── README.md             # Este archivo
```

## Desarrollo

### Próximos Pasos

1. Configurar flows de Kestra para extracción de datos del BOC
2. Implementar proyecto dbt para transformaciones
3. Crear modelos de datos y análisis
4. Configurar tests y validaciones
5. Implementar visualizaciones

## Solución de Problemas

### Los servicios no inician

```bash
# Verificar logs
docker-compose logs

# Verificar que no hay conflictos de puertos
netstat -tlnp | grep -E '8080|8085|5432'
```

### Error de permisos en Kestra

Kestra necesita acceso al socket de Docker. Asegúrate de que tu usuario tiene permisos:

```bash
sudo usermod -aG docker $USER
# Cerrar sesión y volver a iniciar
```

### Limpiar y reiniciar desde cero

```bash
# Detener todos los servicios y eliminar volúmenes
docker-compose down -v

# Eliminar imágenes (opcional)
docker-compose down --rmi all

# Volver a iniciar
docker-compose up -d
```

## Contribuir

Este proyecto es parte del curso de Data Engineering Zoomcamp. Las contribuciones son bienvenidas a través de pull requests.

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## Recursos

- [Kestra Documentation](https://kestra.io/docs)
- [dbt Documentation](https://docs.getdbt.com/)
- [Boletín Oficial de Canarias](https://www.gobiernodecanarias.org/boc/)
