# Adding an admin

There are two ways to grant admin privileges:

## 1. Create a pending admin (Recommended)

This method creates a pending admin record that will automatically grant admin privileges when the user first logs in. It also ensures the user is whitelisted.

```
docker compose -p "kiwi" exec app npx ts-node --logError prisma/createPendingAdmin.ts <email>
```

Benefits:
- User doesn't need to exist in the system yet
- Automatically whitelists the user
- Admin privileges are granted on first login
- Prevents lockouts

## 2. Grant admin to existing user

This method updates an existing user to have admin privileges immediately.

```
docker compose -p "kiwi" exec app npx ts-node --logError prisma/addAdmin.ts <email>
```

Requirements:
- User must already exist in the system
- User must have logged in at least once
