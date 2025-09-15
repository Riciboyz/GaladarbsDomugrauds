# Database Setup Options

Jums ir 3 iespējas datubāzes iestatīšanai:

## 1. 🚀 **SQLite (Ieteicams - bez instalācijas)**

SQLite darbojas bez papildu instalācijām un ir ideāls izstrādei.

### Iestatīšana:
```bash
# Instalēt SQLite atkarību
npm install

# Izveidot SQLite datubāzi
npm run db:sqlite
```

**Priekšrocības:**
- ✅ Nav nepieciešama PostgreSQL instalācija
- ✅ Darbojas uzreiz pēc `npm install`
- ✅ Vienkārša faila datubāze
- ✅ Ideāls izstrādei un testēšanai

## 2. 🐘 **PostgreSQL (Produkcijai)**

PostgreSQL ir pilnīgāks datubāzes risinājums produkcijas videi.

### Iestatīšana:
```bash
# Instalēt PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Izveidot datubāzi
createdb threads_app

# Iestatīt .env.local failu
cp env.example .env.local

# Palaist migrācijas
npm run db:migrate
```

## 3. 📝 **Mock dati (Pašlaik aktīvs)**

Lietotne pašlaik izmanto mock datus un darbojas bez datubāzes.

### Kā darbojas:
- ✅ Visi dati tiek glabāti atmiņā
- ✅ Dati pazūd pēc lapas atsvaidzināšanas
- ✅ Ideāls prototipēšanai un testēšanai
- ✅ Nav nepieciešama datubāze

## Kā pārslēgties uz datubāzi

### SQLite (vienkāršākais):
```bash
npm install sqlite3
npm run db:sqlite
```

### PostgreSQL (pilnīgāks):
```bash
# Instalēt PostgreSQL
npm run db:migrate
```

## Failu struktūra

```
database/
├── sqlite-config.js      # SQLite konfigurācija
├── sqlite-schema.sql     # SQLite shēma
├── sqlite-sample-data.sql # SQLite testa dati
├── sqlite-migrate.js     # SQLite migrācijas
├── config.js             # PostgreSQL konfigurācija
├── schema.sql            # PostgreSQL shēma
├── queries.js            # Datubāzes vaicājumi
└── migrate.js            # PostgreSQL migrācijas
```

## Ieteikumi

- **Izstrādei**: Izmantojiet SQLite (`npm run db:sqlite`)
- **Produkcijai**: Izmantojiet PostgreSQL
- **Prototipēšanai**: Atstājiet mock datus

SQLite ir visvienkāršākais risinājums, kas darbojas bez papildu instalācijām! 🎉
