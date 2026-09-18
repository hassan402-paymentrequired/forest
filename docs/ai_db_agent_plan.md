# Implementation Plan — AI Database Query Agent (Laravel + Postgres)

## Goal
Let the AI assistant answer arbitrary questions about school data by writing
its own SELECT queries, instead of hardcoding a function per possible
question. The AI decides what to query and how to present it (chart, table,
list, or a clarifying question back to the user).

## Architecture

```
User asks question
   -> AI has schema context (curated, not raw DB dump)
   -> AI calls run_sql_query(sql)
        -> validate: must be SELECT only (parsed, not just prefix-checked)
        -> reject DDL/DML keywords (INSERT/UPDATE/DELETE/DROP/ALTER/etc.)
        -> execute via READ-ONLY Postgres role
        -> tenant isolation enforced by Postgres Row-Level Security
           (not trusted to the AI-generated SQL)
        -> row limit + query timeout applied
   -> AI receives result rows
   -> AI calls a render tool: render_chart / render_table / render_list
      / ask_clarifying_question
   -> Frontend (Next.js) renders based on which tool was called
```

## 1. Database: Row-Level Security (Postgres)

Tenant isolation must happen at the DB layer, not be left to the AI to
remember in its generated SQL. Sketch for the `users` table (schools are
rows in `users`, per existing convention) and any child tables
(students, teachers, curriculum, records):

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Policy: a school can only see its own rows.
-- current_setting('app.current_school_id') is set per DB session/request
-- by the Laravel app right after auth, before any AI query runs.
CREATE POLICY tenant_isolation ON students
  USING (school_id = current_setting('app.current_school_id')::int);

CREATE POLICY tenant_isolation ON teachers
  USING (school_id = current_setting('app.current_school_id')::int);

-- Ministry (super-admin) role: separate policy or bypass RLS entirely
-- via a dedicated ministry DB role, since they need cross-school access.
CREATE POLICY ministry_full_access ON students
  FOR SELECT TO ministry_readonly_role
  USING (true);
```

**Laravel side:** on each authenticated request, before invoking the AI
agent, run `SET app.current_school_id = ?` on the DB connection for that
request (scoped to the transaction/session), using the logged-in school's
ID. Ministry users get the DB connection made under `ministry_readonly_role`
instead.

## 2. Read-only DB role for the AI

Separate from the app's normal DB user — this one only has SELECT grants,
so even if validation is somehow bypassed, writes are impossible at the
DB level.

```sql
CREATE ROLE ai_readonly_role LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE schooldb TO ai_readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly_role;
-- Explicitly revoke access to sensitive tables
REVOKE ALL ON auth_tokens, password_resets FROM ai_readonly_role;
```

## 3. Tools for the AI agent (Laravel AI SDK)

| Tool | Purpose |
|---|---|
| `get_schema()` | Returns curated table/column descriptions (not raw schema dump; excludes sensitive tables entirely) |
| `run_sql_query(sql)` | Validates (SELECT-only, parsed), executes under `ai_readonly_role` with RLS applied, row limit + timeout, returns rows |
| `render_chart(data, chart_type)` | Renders a chart in the frontend |
| `render_table(data)` | Renders a data table |
| `render_list(data)` | Renders a simple list |
| `ask_clarifying_question(text)` | AI asks the user for missing info instead of guessing |

## 4. Validation layer for `run_sql_query`

- Parse the SQL (use a proper SQL parser, not string matching) and reject
  anything whose top-level statement isn't `SELECT`
- Blocklist keywords even inside subqueries: `INSERT`, `UPDATE`, `DELETE`,
  `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `--`, `;` (multiple statements)
- Enforce `LIMIT` (inject one if the AI didn't add it)
- Set a query timeout (e.g. 5s) at the connection level

## Open decisions for Claude Code to flag back
- Confirm which tables need RLS (students, teachers, curriculum, records —
  any others holding per-school data)
- Decide where `app.current_school_id` gets set in the Laravel request
  lifecycle (middleware, right after auth)
- Confirm the Ministry role's access model: full read across all schools,
  or scoped to specific fields/aggregates only
