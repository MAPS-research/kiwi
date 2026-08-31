# Adding new entries

Adjust `schema.prisma`.

Run the following code to add a migration, this is similar to adding a commit.
```bash
npx prisma migrate dev --name "your message"
```

Run the following command the first time initializing the repo.
```bash
npx prisma db push
```

Run the following command when receiving updates.
```bash
npx prisma migrate dev
```

## Resetting your local DB (seed system)

If `npx prisma migrate dev` complains about drift, the fastest recovery is a full reset. To make that painless without losing your local dev data (admin user, test classes, uploaded documents, embeddings), this project uses a capture/replay seed system.

**One-time setup, once your dev DB is in a good state:**

```bash
npx ts-node prisma/seed-capture.ts
```

This writes `prisma/seed-data.json` (gitignored, per-developer) containing a snapshot of the tables that matter for local dev: users, whitelist, classes, materials, documents, embeddings, etc.

**Resetting the DB:**

```bash
npx prisma migrate reset --force
```

Prisma will wipe the DB, re-apply all migrations, and automatically run `prisma/seed.ts`, which replays your snapshot. If `prisma/seed-data.json` does not exist (e.g., fresh clone), the seed falls back to a minimal baseline of three users, one class, and one material so the app can still boot.

**Refreshing the snapshot:**

Run `seed-capture.ts` again any time your baseline changes (new test class, new uploaded document, etc.). It overwrites `prisma/seed-data.json`.

**Raw pg_dump fallback:**

For a belt-and-suspenders backup that survives even broken Prisma migrations, take a physical dump directly from the `db` container:

```bash
docker exec -i kiwi-db-1 pg_dump -U kiwi -d kiwi --format=custom > prisma/seed-data.backup.dump
```

Restore with:

```bash
docker exec -i kiwi-db-1 pg_restore --clean --if-exists -U kiwi -d kiwi < prisma/seed-data.backup.dump
```

Both `prisma/seed-data.json` and `prisma/seed-data.backup.dump` are gitignored.

**What's not in the snapshot** (intentionally skipped — rebuilt by normal app use): sessions, user interactions, discussions, upvotes, webhook deliveries, email audit logs, competitions.

```mermaid
erDiagram
User ||--o{ Session : has
User ||--o{ UserInteraction : has
User ||--o{ Enrollment : has

Session ||--o{ UserInteraction : has

Class ||--o{ ClassMaterial : has
Class ||--o{ Enrollment : has

Enrollment }|--|| User : has
Enrollment }|--|| Class : has

ClassMaterial }|--|| Class : belongs_to

User {
    String id PK
    String email UNIQUE
    String oauthId UNIQUE
    Boolean oauth
    Boolean? consent
}

Session {
    String id PK
    String userId FK
    DateTime sessionStartTime
    DateTime? sessionEndTime
}

UserInteraction {
    String id PK
    String userId FK
    String sessionId FK
    String? totalWatchTime
    Json actions
}

Class {
    String id PK
    Json classMetadata
    DateTime createdDate
}

Enrollment {
    String classId PK
    String userId PK
    String role
}

ClassMaterial {
    String id PK
    String classId FK
    String materialType
    Json materialMetadata
    String materialContent
    String status
    DateTime uploadedDate
}
```