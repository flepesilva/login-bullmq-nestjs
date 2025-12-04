# Authentication System

Sistema de autenticación completo con JWT, OAuth, y gestión de usuarios.

---

## 📋 Descripción

Sistema backend de autenticación con soporte para registro, login, recuperación de contraseña, Google OAuth y gestión de archivos.

### Características

- 🔐 Autenticación JWT (access + refresh tokens en HTTP-only cookies)
- 🔑 Google OAuth 2.0
- 📧 Sistema de emails con colas (BullMQ + Redis)
- 🔄 Recuperación de contraseña con tokens
- ☁️ Almacenamiento de archivos (AWS S3 / Cloudflare R2)
- 🛡️ Rate limiting y validación global
- 👤 Gestión de usuarios con roles

---

## 🛠️ Tech Stack

```
Backend:        NestJS 11.x + TypeScript 5.x
Database:       PostgreSQL + TypeORM 0.3.x
Authentication: JWT + Passport.js
                - Access tokens: 15min (HTTP-only cookies)
                - Refresh tokens: 7 días (argon2 hashed)
                - Google OAuth 2.0
Queue:          BullMQ + Redis
Email:          Mailjet
Storage:        AWS S3 / Cloudflare R2
Security:       bcrypt, argon2, class-validator
```

---

## 🚀 Instalación

### Requisitos

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Mailjet account
- AWS S3 o Cloudflare R2 (opcional)

### Setup

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar en desarrollo
npm run start:dev
```

La API estará disponible en `http://localhost:3000`

---

## 📚 API Endpoints

### Authentication (Público)
```
POST   /auth/register              - Registrar nuevo usuario
POST   /auth/login                 - Login con email/password
POST   /auth/logout                - Logout (limpia cookies)
POST   /auth/refresh               - Refrescar access token
POST   /auth/forgot-password       - Solicitar reset de contraseña
POST   /auth/reset-password        - Resetear contraseña con token
GET    /auth/google                - Iniciar Google OAuth
GET    /auth/google/callback       - Callback de Google OAuth
```

### User (Protegido - Requiere JWT)
```
GET    /auth/profile               - Obtener perfil del usuario actual
GET    /auth/test                  - Test endpoint (requiere rol USER)
```

### Storage (Protegido)
```
POST   /storage/upload             - Subir archivo a S3/R2
GET    /storage/avatar/:key        - Obtener URL presignada de avatar
GET    /storage/private/:key       - Streaming de archivo privado
```

---

## 🔧 Comandos

```bash
# Desarrollo
npm run start:dev

# Build
npm run build

# Producción
npm run start:prod

# Tests
npm run test
npm run test:e2e
npm run test:cov
```

---

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt (10 rounds)
- Refresh tokens hasheados con argon2
- Access tokens: 15 minutos de expiración
- Refresh tokens: 7 días de expiración
- Tokens en HTTP-only cookies (protección XSS)
- Rate limiting en endpoints públicos
- Validación global con class-validator

---

## 📝 License

Proprietary and confidential.

---

**Version**: 0.1.0
