# Plan Maestro de Pruebas - Portal Vanguardia Juvenil Backend

**Preparado por:** Equipo de Desarrollo - Portal Vanguardia Juvenil  
**Fecha:** 31 de Julio de 2025  
**Versión:** 1.0

---

## Introducción

Este plan maestro de pruebas define el alcance, estrategias y criterios para la validación del backend del Portal Vanguardia Juvenil. El plan incluye pruebas unitarias, de integración, funcionales y de rendimiento para garantizar la calidad del sistema educativo. Las pruebas se enfocan en validar las funcionalidades críticas de gestión de usuarios, cursos, pagos, calificaciones y mensajería.

**Riesgos identificados:**
- Dependencias de base de datos pueden afectar la ejecución de pruebas
- Middleware de autenticación puede requerir configuración especial para testing
- Concurrencia en el acceso a datos compartidos

**Suposiciones:**
- El entorno de desarrollo tiene acceso a una base de datos PostgreSQL configurada
- Los controladores y rutas están implementados según especificaciones
- Las dependencias de Node.js están correctamente instaladas

---

## Tabla de Recursos

| Tester | % de participación |
|--------|-------------------|
| Felipe Aguilar | 100% |

---

## Alcance

Las pruebas incluyen:
- **Funcionalidades de autenticación y autorización** - Validación de tokens JWT y roles de usuario
- **Gestión de usuarios** - CRUD completo para todos los tipos de usuarios del sistema
- **Gestión de cursos** - Creación, actualización y consulta de cursos académicos
- **Sistema de pagos** - Procesamiento y consulta de pagos estudiantiles
- **Gestión de calificaciones** - Registro y consulta de notas por curso y tarea
- **Sistema de mensajería** - Comunicación entre usuarios del sistema
- **Validación de datos** - Verificación de integridad y formato de datos
- **Manejo de errores** - Respuestas apropiadas ante escenarios de falla
- **Pruebas de rendimiento básicas** - Tiempo de respuesta de endpoints críticos

---

## Fuera del Alcance

- Pruebas de interfaz de usuario (Frontend)
- Pruebas de seguridad penetrativa avanzada
- Pruebas de carga con múltiples usuarios concurrentes
- Validación de configuración de infraestructura Docker
- Pruebas de migración de base de datos
- Pruebas de compatibilidad entre navegadores

---

## Características a probar

**Período de pruebas:** Del 31 de Julio al 15 de Agosto de 2025

### Pruebas de Funcionalidad:

| ID Caso Prueba | Escenario | Endpoint | Método | Resultado esperado |
|---------------|-----------|----------|--------|-------------------|
| TC-001 | Obtener todos los usuarios | `/api/users` | GET | Lista de usuarios ordenada por rol |
| TC-002 | Crear usuario válido | `/api/users` | POST | Usuario creado exitosamente (201) |
| TC-003 | Crear usuario con datos inválidos | `/api/users` | POST | Error de validación (400) |
| TC-004 | Obtener cursos disponibles | `/api/courses` | GET | Lista de cursos con información completa |
| TC-005 | Crear curso nuevo | `/api/courses` | POST | Curso creado con validaciones (201) |
| TC-006 | Actualizar curso existente | `/api/courses/:id` | PUT | Curso actualizado exitosamente (200) |
| TC-007 | Obtener historial de pagos | `/api/payments` | GET | Lista de pagos ordenada por fecha |
| TC-008 | Registrar nuevo pago | `/api/payments` | POST | Pago registrado correctamente (201) |
| TC-009 | Validar campos obligatorios de pago | `/api/payments` | POST | Error por campos faltantes (400) |
| TC-010 | Obtener calificaciones por tarea | `/api/grades/:courseId/:taskId` | GET | Calificaciones de estudiantes |
| TC-011 | Actualizar calificación | `/api/grades/:courseId/:taskId/:studentId` | PUT | Calificación actualizada (200) |
| TC-012 | Acceso sin autenticación | Endpoints protegidos | ANY | Error de autorización (401) |

### Pruebas de Carga:

| Identificador | Parte de la aplicación | Condición | Resultado Esperado | Método/Herramienta |
|--------------|------------------------|-----------|-------------------|-------------------|
| PL-001 | Endpoint de usuarios | 50 peticiones concurrentes | Tiempo respuesta < 2s | Jest + Supertest |
| PL-002 | Creación de pagos | 25 pagos simultáneos | Sin pérdida de datos | Jest + Mocks |
| PL-003 | Consulta de calificaciones | 100 consultas/minuto | Respuesta consistente | Jest + Timers |

### Pruebas de Seguridad:

| Identificador | Condición | Elemento a probar | Resultado esperado |
|--------------|-----------|-------------------|-------------------|
| PS-001 | Sin token JWT | Endpoints protegidos | Acceso denegado (401) |
| PS-002 | Token JWT inválido | Middleware de autenticación | Rechazo y error apropiado |
| PS-003 | Rol insuficiente | Endpoints administrativos | Acceso denegado (403) |
| PS-004 | Inyección SQL | Parámetros de entrada | Datos sanitizados correctamente |
| PS-005 | Validación de entrada | Campos de formulario | Rechazo de datos maliciosos |

---

## Criterios de aceptación o fallo

| Id criterio | Descripción | Aprobación | Fallo |
|------------|-------------|------------|-------|
| CA-001 | Cobertura de código | ≥ 80% de cobertura en controladores críticos | < 80% cobertura - Escribir pruebas adicionales |
| CA-002 | Pruebas unitarias | 100% de pruebas unitarias pasan | > 5% fallos - Revisar y corregir código |
| CA-003 | Tiempo de respuesta | APIs responden en < 2 segundos | > 2s respuesta - Optimizar consultas DB |
| CA-004 | Validación de datos | 100% de validaciones funcionan | Falla validación - Implementar controles faltantes |
| CA-005 | Manejo de errores | Todos los errores retornan códigos HTTP apropiados | Códigos incorrectos - Corregir responses |
| CA-006 | Autenticación | 100% de endpoints protegidos requieren autenticación | Acceso no autorizado - Agregar middleware |

---

## Criterios de suspensión y reanudación

| Criterio de suspensión | Criterio de reanudación |
|----------------------|------------------------|
| > 20% de pruebas fallan continuamente | Corrección de errores críticos y nueva versión |
| Base de datos no disponible | Restauración del servicio de base de datos |
| Dependencias críticas fallan | Actualización de dependencias y configuración |
| Errores de configuración Jest | Corrección de archivos de configuración |
| Memoria insuficiente para pruebas | Optimización de recursos o upgrade de hardware |

---

## Infraestructura

**Entorno de desarrollo:**
- **Lenguaje:** Node.js 18+
- **Framework:** Express.js 4.18.2
- **Base de datos:** PostgreSQL
- **Herramientas de testing:** Jest 30.0.5, Supertest 7.1.4
- **Gestión de dependencias:** npm
- **Control de versiones:** Git

**Frameworks y librerías:**
- bcrypt (hashing de contraseñas)
- jsonwebtoken (autenticación JWT)
- cors (manejo de CORS)
- dotenv (variables de entorno)

**Herramientas externas:**
- Docker (contenerización)
- PostgreSQL (base de datos)
- Nodemon (desarrollo)

---

## Suposiciones

1. Las migraciones de base de datos han sido ejecutadas correctamente
2. Las variables de entorno están configuradas apropiadamente
3. Los endpoints de autenticación funcionan correctamente para testing
4. Los datos de prueba están disponibles en la base de datos de testing
5. El servidor de desarrollo está operativo durante las pruebas
6. Los mocks de base de datos reflejan el comportamiento real del sistema

---

## Riesgos

| No. | Riesgos | Probabilidad (1-5) | Impacto (1-5) | Severidad (Prob*Impct) | Plan de Mitigación |
|-----|---------|-------------------|---------------|----------------------|-------------------|
| 1 | Middleware de autenticación bloquea pruebas automatizadas | 4 | 4 | 16 | Implementar bypass para testing o mocks específicos |
| 2 | Base de datos no disponible durante testing | 3 | 5 | 15 | Usar mocks completos y base de datos en memoria |
| 3 | Dependencias desactualizadas causan conflictos | 2 | 3 | 6 | Mantener package.json actualizado y usar npm audit |
| 4 | Pruebas lentas por consultas complejas de DB | 3 | 2 | 6 | Optimizar queries y usar datos de prueba mínimos |
| 5 | Conflictos de concurrencia en pruebas paralelas | 3 | 3 | 9 | Ejecutar pruebas secuencialmente o aislar datos |
| 6 | Cobertura de código insuficiente | 2 | 4 | 8 | Implementar pruebas adicionales para casos edge |
| 7 | Configuración Jest incompatible con ES6 modules | 2 | 3 | 6 | Ajustar babel config y jest.config.js |

---

## Notas de implementación

**Estado actual de las pruebas:**
- Se han implementado 3 conjuntos principales de pruebas: User, Course y Payment Controllers
- Se requiere configuración adicional para el middleware de autenticación en el entorno de testing
- Las pruebas están configuradas para usar mocks de base de datos para independencia de datos externos

**Próximos pasos:**
1. Configurar bypass de autenticación para testing
2. Implementar pruebas de integración completas
3. Agregar pruebas de rendimiento con métricas específicas
4. Configurar pipeline de CI/CD para ejecución automática de pruebas

---

**Documento preparado por:** Equipo de Desarrollo Portal VJ  
**Aprobado por:** [Pendiente]  
**Fecha de última actualización:** 31 de Julio de 2025
