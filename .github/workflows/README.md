# Backend CI/CD Pipeline

Pipeline de CI/CD específico para el backend de PortalVJ utilizando GitHub Actions.

## Configuración General

### Triggers
- **Push**: Se ejecuta en las ramas `main`, `develop`, `master`
- **Pull Request**: Se ejecuta contra las ramas `main`, `master`

## Jobs Configurados

### 1. backend-test
**Propósito**: Ejecuta tests unitarios y linting del código backend.

**Servicios**:
- PostgreSQL 16 (puerto 5432)
- Health checks configurados con reintentos

**Pasos**:
1. Checkout del código
2. Configuración de Node.js 18.x con cache npm
3. Instalación de dependencias (`npm ci`)
4. Ejecución de ESLint (`npm run lint`)
5. Configuración de base de datos de prueba
   - Ejecuta `01_schema.sql`, `02_updates.sql`, `03_data.sql`
6. Ejecución de tests con variables de entorno específicas
7. Subida de cobertura de tests como artefacto

**Variables de Entorno para Tests**:
- `NODE_ENV=test`
- Configuración completa de base de datos
- `JWT_SECRET=test-jwt-secret-for-ci`

### 2. backend-security
**Propósito**: Auditoría de seguridad y calidad del código.

**Dependencias**: Requiere que `backend-test` sea exitoso.

**Pasos**:
1. Checkout del código
2. Configuración de Node.js con cache
3. Instalación de dependencias
4. Auditoría de seguridad (`npm audit --audit-level=moderate`)
5. Verificación de paquetes desactualizados (`npm outdated`)

### 3. backend-docker
**Propósito**: Construcción y publicación de imágenes Docker.

**Condiciones**: Solo se ejecuta en ramas `main`, `master`, `develop`.

**Dependencias**: Requiere que `backend-test` sea exitoso.

**Configuración**:
- Docker Buildx para builds multiplataforma
- Cache de GitHub Actions para optimización
- Plataforma objetivo: `linux/amd64`

**Comportamiento por Rama**:
- **develop**: Build local sin push
- **main/master**: Build y push a Docker Hub con múltiples tags

**Tags de Producción**:
- `latest`
- SHA del commit específico
- Metadatos OpenContainer estándar

### 4. deploy-staging
**Propósito**: Despliegue automático al entorno de staging.

**Condiciones**: Solo en rama `develop`.

**Dependencias**: Requiere `backend-test` y `backend-security` exitosos.

**Entorno**: `staging`

**Pasos**:
1. Checkout del código
2. Ejecución del deployment (configuración específica del proveedor)
3. Smoke tests básicos con espera de 30 segundos
4. Notificación de deployment exitoso

**Proveedores Soportados** (comentados):
- Heroku
- Railway
- DigitalOcean App Platform
- AWS ECS/Fargate

### 5. deploy-production
**Propósito**: Despliegue al entorno de producción.

**Condiciones**: Solo en ramas `main` o `master`.

**Dependencias**: Requiere `backend-test`, `backend-security` y `backend-docker` exitosos.

**Entorno**: `production`

**Pasos**:
1. Checkout del código
2. Deployment a producción
3. Smoke tests exhaustivos
4. Notificación de deployment (con integración opcional a Slack/Discord/Teams)

### 6. integration-tests
**Propósito**: Tests de integración para Pull Requests.

**Condiciones**: Solo en eventos de Pull Request.

**Dependencias**: Requiere que `backend-test` sea exitoso.

**Servicios**: Misma configuración de PostgreSQL que `backend-test`.

**Pasos**:
1. Configuración completa del entorno
2. Setup de base de datos de integración
3. Ejecución de tests de integración
4. Subida de resultados como artefactos

## Características Técnicas

### Optimizaciones
- **Cache de npm**: Utiliza el cache de GitHub Actions para `package-lock.json`
- **Cache de Docker**: Implementa cache de layers para builds más rápidos
- **Health checks**: PostgreSQL con verificación de estado antes de tests

### Seguridad
- **Secrets**: Utiliza GitHub Secrets para credenciales de Docker Hub
- **Auditoría**: Verificación automática de vulnerabilidades en dependencias
- **Entornos protegidos**: Staging y production requieren aprobación

### Artefactos
- **Cobertura de tests**: Se conserva para análisis posterior
- **Resultados de integración**: Disponibles para debugging

## Configuración Requerida

### GitHub Secrets
- `DOCKER_USERNAME`: Usuario de Docker Hub
- `DOCKER_PASSWORD`: Token de acceso de Docker Hub

### GitHub Environments
- `staging`: Configurado para rama develop
- `production`: Configurado para ramas main/master

### Archivos de Base de Datos
- `./DB/sql/01_schema.sql`: Esquema de base de datos
- `./DB/sql/02_updates.sql`: Actualizaciones de esquema
- `./DB/sql/03_data.sql`: Datos de prueba

## Scripts npm Requeridos
- `npm run lint`: Ejecución de ESLint
- `npm test`: Tests unitarios
- `npm run test:integration`: Tests de integración (opcional)
