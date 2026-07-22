# 🗄️ Database

Esta carpeta contiene el backup completo de la base de datos PostgreSQL del proyecto.

## Archivos

| Archivo | Contenido |
|---------|-----------|
| `full_backup.sql` | Esquema completo + todos los datos (tablas, índices, relaciones, registros) |
| `schema.sql` | Solo el esquema (sin datos) — útil para entender la estructura |
| `data.sql` | Solo los datos (INSERT statements) — sin estructura |

---

## ▶️ Cómo restaurar la base de datos

### 1. Crear la base de datos (si no existe)

```bash
# En Windows — abre SQL Shell (psql) desde el menú inicio
# En Mac/Linux:
psql -U postgres

# Dentro de psql:
CREATE DATABASE investment_erp;
\q
```

### 2. Restaurar desde el backup completo

**Windows (PowerShell):**
```powershell
$env:PGPASSWORD = "TU_CONTRASEÑA"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d investment_erp -f database\full_backup.sql
```

**Mac / Linux:**
```bash
psql -U postgres -h localhost -d investment_erp -f database/full_backup.sql
```

> 💡 Reemplaza `TU_CONTRASEÑA` con la contraseña de tu usuario `postgres`.

### 3. Verificar que se restauró bien

```bash
psql -U postgres -d investment_erp -c "\dt"
# Debe listar: Asset, Holding, Operation, Portfolio, PriceAlert, PriceHistory, RiskSnapshot, User, WatchlistItem, AiInsight
```

---

## 🔄 Cómo generar un nuevo backup

Si haces cambios en la BD y quieres actualizar el backup:

**Windows (PowerShell):**
```powershell
$env:PGPASSWORD = "TU_CONTRASEÑA"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost --no-owner --no-acl --inserts investment_erp -f database\full_backup.sql
```

**Mac / Linux:**
```bash
pg_dump -U postgres -h localhost --no-owner --no-acl --inserts investment_erp -f database/full_backup.sql
```

---

## ⚠️ Notas importantes

- Las **contraseñas de usuarios** están hasheadas con bcrypt — no son texto plano.
- Este backup es para **desarrollo/demo**. En producción usa un servicio gestionado (Supabase, Railway, Neon).
- **Nunca subas tu archivo `.env`** a Git — las credenciales van solo ahí.
