// ─────────────────────────────────────────────────────────────────────────────
// Cliente global de Prisma ORM.
// Se crea una única instancia y se comparte en todo el backend para evitar
// abrir múltiples conexiones a la base de datos PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
