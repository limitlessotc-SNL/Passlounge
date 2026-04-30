# Adding a Coach Account

Coaches sign in at `/coach/login` and need both a Supabase Auth user **and** a
matching row in the `coaches` table. There is no self-signup flow — accounts
are provisioned manually by a super admin.

## 1. Create the Supabase Auth user

1. Open Supabase Dashboard → **Authentication → Users**
2. Click **Invite user**
3. Enter the coach's email address and send the invite
4. The coach accepts the invite and sets their password

## 2. Get the auth user's UUID

After the coach accepts the invite, copy their `id` from the
**Authentication → Users** table — that's the `auth_id` you'll need below.

## 3. Insert the coach row

In **SQL Editor**, run:

```sql
INSERT INTO coaches (school_id, auth_id, name, email, role)
VALUES (
  (SELECT id FROM schools LIMIT 1),    -- 'SNL' default school
  'AUTH-UUID-HERE',                     -- replace
  'Coach Name',                         -- replace
  'coach@email.com',                    -- replace, must match auth user's email
  'super_admin'                         -- or 'school_admin' / 'faculty'
);
```

Roles:

| role           | scope                                                       |
| -------------- | ----------------------------------------------------------- |
| `super_admin`  | Full read across all schools (reserved for SNL staff)       |
| `school_admin` | Read/write across cohorts in their own school               |
| `faculty`      | Default — manage their own cohorts only                     |

## 4. Verify

The coach can now sign in at `/coach/login`. After signing in:
- They land on `/coach` (CoachDashboard)
- The "+ New cohort" button creates a cohort with an auto-generated 6-char code
- That code is what students enter on the Profile tab to join

## 5. Deactivating a coach

Don't delete — flip the flag so audit history is preserved:

```sql
UPDATE coaches SET is_active = false WHERE email = 'coach@email.com';
```

`CoachGuard` redirects deactivated coaches back to `/coach/login` with an
"Account deactivated" message on their next route change.
