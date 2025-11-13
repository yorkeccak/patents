# Supabase Database Setup

This directory contains SQL scripts for setting up the Patents database in Supabase.

## Quick Start (One-Click Setup)

### Option 1: Run Everything at Once (Recommended)
Copy and paste `setup-complete.sql` into your Supabase SQL Editor and run it. This single file contains everything needed to set up the entire database from scratch.

### Option 2: Run Scripts Individually
Run these scripts in order in your Supabase SQL Editor:

### 1. Create Tables (schema.sql)
```sql
-- Copy and paste the contents of schema.sql
-- This creates all tables: users, chat_sessions, chat_messages, charts, csvs, etc.
```

### 2. Set Up Row Level Security (policies.sql)
```sql
-- Copy and paste the contents of policies.sql
-- This sets up RLS policies for data security
```

### 3. Create Auth Triggers (triggers.sql)
```sql
-- Copy and paste the contents of triggers.sql
-- This creates triggers to sync auth.users with public.users automatically
```

## What Each Script Does

### schema.sql
- Creates the core database tables
- Sets up foreign key relationships
- Creates indexes for performance
- Tables: users, chat_sessions, chat_messages, charts, csvs, rate_limits, collections, patent_cache

### policies.sql
- Enables Row Level Security (RLS)
- Creates policies so users can only access their own data
- Ensures data privacy and security

### triggers.sql
- **Critical for user signup to work properly!**
- Automatically creates a record in `public.users` when someone signs up
- Keeps `auth.users` and `public.users` in sync
- Handles user updates and deletions
- Includes cleanup function for expired patent cache entries

## Troubleshooting

### "No user found in database" after signup
- You forgot to run `triggers.sql`
- Run `triggers.sql` first, then `backfill-users.sql` to fix existing users

### Foreign key constraint errors
- Run scripts in order: schema.sql → policies.sql → triggers.sql
- Don't skip any scripts

### RLS policy blocking access
- Make sure policies.sql was run
- Check that the user is authenticated (has valid JWT)
- Verify the user exists in public.users table

## Verifying Setup

Run this query to verify everything is set up correctly:

```sql
-- Check that triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'on_auth_user_%';

-- Check user sync
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Expected results:
- 3 triggers: `on_auth_user_created`, `on_auth_user_updated`, `on_auth_user_deleted`
- auth_users count should equal public_users count
- All tables should have `rowsecurity = true`

## Patent Cache System

The `patent_cache` table stores full patent content to reduce context usage by 95%:

### How It Works
1. **patentSearch** returns only abstracts (saves context)
2. Patents are cached in `patent_cache` with 1-hour TTL
3. **readFullPatent** retrieves full content from cache by index
4. Only most recent search indices are valid (cleared before new searches)

### Key Features
- **UNIQUE constraint**: `(session_id, patent_number)` - stores all unique patents across searches
- **Index invalidation**: `patent_index` set to -1 before new searches to mark old results
- **Auto-expiry**: Patents expire after 1 hour (`expires_at`)
- **Performance indexes**: On `session_id`, `expires_at`, and `created_at`

### RLS Policies
- **SELECT/UPDATE/DELETE**: Users can only access patents from their own chat sessions
- **INSERT**: Any authenticated user can cache patents (session ownership validated)

### Maintenance
Expired patents are automatically cleaned up every hour via Vercel Cron (configured in `vercel.json`).
The cron job calls `/api/cron/cleanup-patents` which handles cleanup for both SQLite (dev) and Supabase (prod).
