# Supabase SQL Editor — Complete Beginner's Guide

## What Is Supabase?

Supabase is a **backend service** that provides:
- A **database** (PostgreSQL) to store your data
- An **API** to read/write that data from your app
- **Authentication** to manage user logins
- **Storage** to save files (images, documents)

Think of it as the "engine" behind your app. Your Next.js frontend talks to Supabase to save and retrieve data.

---

## What Is SQL?

SQL (Structured Query Language) is the language databases understand. When you want to:
- Create a table → `CREATE TABLE`
- Add a column → `ALTER TABLE ... ADD COLUMN`
- Insert data → `INSERT INTO`
- Update data → `UPDATE ... SET`
- Delete data → `DELETE FROM`

You write these commands in SQL, and the database executes them.

---

## What Is Supabase SQL Editor?

The SQL Editor is a **web-based tool** inside your Supabase dashboard where you can type SQL commands and run them directly against your database. It's like a text editor, but for database commands.

---

## How To Access It

1. Open your browser
2. Go to **https://app.supabase.com**
3. Log in with your Supabase account
4. Click on your project (ClockHost)
5. Look at the left sidebar
6. Click **SQL Editor**
7. You'll see a blank text area — that's where you paste your SQL

---

## How To Run a Migration

### Step 1: Open the SQL File

In your code editor (VS Code), find the migration file:
```
supabase/migration-phase1.sql
```

### Step 2: Copy Everything

Press `Ctrl+A` (Windows) or `Cmd+A` (Mac) to select all text
Press `Ctrl+C` (Windows) or `Cmd+C` (Mac) to copy

### Step 3: Paste Into Supabase

Click inside the SQL Editor text area
Press `Ctrl+V` (Windows) or `Cmd+V` (Mac) to paste

### Step 4: Run

Click the **Run** button (usually a green play button)
Or press `Ctrl+Enter` (Windows) or `Cmd+Enter` (Mac)

### Step 5: Wait

You'll see a spinner. When it finishes:
- **Green "Success"** = Everything worked
- **Red error** = Something went wrong (read the error message)

---

## What Does "Run" Actually Do?

When you click Run, Supabase:
1. Takes your SQL text
2. Sends it to the PostgreSQL database
3. The database executes each command, one by one
4. Results come back to your browser

If ANY command fails, PostgreSQL undoes everything (because we wrapped it in `BEGIN;...COMMIT;`).

---

## Understanding Transactions (BEGIN/COMMIT)

Every migration starts with `BEGIN;` and ends with `COMMIT;`.

**BEGIN** = "Start a new transaction. Remember everything I do from now on."

**COMMIT** = "I'm done. Save everything permanently."

**What if something fails?** PostgreSQL automatically undoes everything since `BEGIN`. It's like pressing "Undo" on all your changes.

**Why?** Prevents "half-done" migrations. You either get ALL changes or NONE.

---

## Common Errors Explained

| Error Message | What It Means | What To Do |
|---------------|---------------|------------|
| `relation "X" already exists` | A table was already created | Safe to ignore — our migrations use `IF NOT EXISTS` |
| `column "X" already exists` | A column was already added | Safe to ignore — our migrations use `ADD COLUMN IF NOT EXISTS` |
| `constraint "X" already exists` | A rule was already created | Safe to ignore — our migrations handle this |
| `permission denied for table X` | You're not logged in as admin | Make sure you're the project owner |
| `syntax error at or near "X"` | Typo in the SQL | Check the line number in the error message |

---

## After Running Migrations

### Verify in Supabase

1. Go to **Table Editor** (left sidebar)
2. You should see your tables listed
3. Click on a table to see its columns
4. Check that new columns exist

### Verify in Your App

1. Open your app at http://localhost:3000
2. Try the features that use the new columns
3. Check the browser console for errors

---

## What If Something Goes Wrong?

### Before Running
- Take a backup: Supabase Dashboard → Database → Backups → Create Backup

### After Running
- If your app breaks: Check the error message
- If you need to undo: Restore from backup
- If you're stuck: Ask for help with the specific error message
