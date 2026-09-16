# School Portal — Module Plan

## Context

The School portal (`school_users` accounts, sidebar layout, root-level routes) is being built module by module, each one finished end-to-end (migrations → models → relationships → controllers → pages → tests) before the next starts. This doc is the running reference for what modules exist, how they relate, and decisions made about scope — updated as we go, not written once and frozen.

**Build order so far:**
1. ✅ Ministry invite → School accept-invitation → `school_users` login (done)
2. ✅ Teachers (done)
3. ✅ Classes (done — built ahead of Students since Students has a required FK to it)
4. ✅ Students (done)
5. ✅ Guardians (done)
6. 🔜 **Attendance** (next)
7. Academics
8. Finance & Expenses
9. Reports — scope TBD when we get there (see below)
10. Dashboard — last, since it's a summary view over everything else

Order past Teachers/Students isn't locked — later modules may need to slot in earlier if a dependency turns out tighter than expected (e.g. if Attendance needs Academic Terms before it can work).

## Modules and how they relate

Everything hangs off `School` (the tenant, already built in the Ministry module). Nothing here is an independent silo — each module is a node with real foreign-key edges to the others:

- **Teachers** — belong to a School. **Not** linking Teachers to Classes yet (see Standing decisions) — for now Teachers stands alone. (`App\Models\Teacher`, `/teachers`)
- **Classes** — belong to a School. Have many Students. **Not** linking to Teachers yet (see Standing decisions). Modeled as `App\Models\SchoolClass` / table `school_classes` since `Class` is a reserved word in PHP; routes and UI still say "Classes" (`/classes`).
- **Students** — belong to a School and to a Class (`class_id`, required — a school user picks from their existing classes when adding a student; the exists-rule is scoped to their own school's classes to prevent cross-tenant assignment). Carry their own nullable `email`/`phone` (confirmed: students get contact fields independently of Guardians, not instead of them — Guardians will get their own contact info too when that module is built) and a nullable `admission_date`. Have one or more Guardians (many-to-many — siblings share a guardian, a guardian can have multiple children at the school). Have Attendance records and Academic records. **Not** linking to Guardians yet — that's the next module. Supports CSV export/import via `maatwebsite/excel` (`App\Exports\StudentsExport`, `App\Imports\StudentsImport`) — import matches the `class` column to an existing class by name (case-insensitive) within the acting school and silently skips rows that don't match, rather than creating classes on the fly. (`App\Models\Student`, `/students`, `/students/export`, `/students/import`)
- **Guardians** — linked to Students many-to-many via `guardian_student` pivot (not a login account — see below). Pivot carries `relationship` (father/mother/guardian/other) and `is_primary`. **Simplification**: a guardian's relationship type and primary-contact flag are uniform across all of their linked children in one save (the edit form does a full `sync()`, not per-child editing) — a guardian who is "Mother" to one child and something else to another isn't supported yet. Only one guardian can be primary per student — marking a new guardian primary for a student automatically unmarks any other guardian's primary flag for that same student. Supports CSV export/import like Students (`App\Exports\GuardiansExport`, `App\Imports\GuardiansImport`) — import resolves a `Children` column formatted as `Name (AdmissionNumber); Name (AdmissionNumber)` against the school's students by admission number, skipping rows where nothing resolves. Both Students and Guardians exports cross-reference each other (Student export lists guardians with relationship; Guardian export lists children with admission number). (`App\Models\Guardian`, `/guardians`, `/guardians/export`, `/guardians/import`)
- **Attendance** — join point between a Student, a Class, and a date (and likely an Academic Term once that exists).
- **Academics** — grades/subjects, tied to Student + Class + Teacher (+ Term).
- **Finance & Expenses** — belongs to School only. **Confirmed scope: outgoing costs only** (these are public schools — no tuition/fees collected from families, so no student/guardian billing). Leaving room in the design to add an income/fees side later if that ever changes, but not building it now.
- **Reports** — scope not decided yet. Could mean academic report cards (per student/term) or Ministry-facing analytics (what the AI assistant queries), or both — these are different consumers of the same underlying data, not necessarily one module. Deciding when we get there, same as Dashboard.
- **Dashboard** — last. A summary view over whichever modules exist by the time we build it.

## Standing decisions

- **`school_users` vs. Teacher/Guardian records — kept separate** (established in the accept-invitation work): `school_users` are platform *login accounts*. Teachers and Guardians are *data records* the school manages — most will never have a login. If a teacher or guardian ever needs portal access themselves, that's a distinct future decision, not the default.
- **No student billing** — Finance & Expenses is expense-tracking only, per public-school context above.
- **Teacher ↔ Class assignment deferred** — which teacher teaches which class changes every academic term, and modeling that properly depends on Academic Terms existing first. Building Teachers and Classes as standalone modules now, without a relation between them, rather than guessing at a shape that will just get replaced once Terms exists.

## Open questions (revisit before building)

- Academic Terms/Sessions as their own concept (e.g. "2025/2026, Term 2") — Attendance, Academics, and Finance likely all want to scope by term. Not yet decided whether/when this becomes its own module vs. a simple column.
- Reports scope (see above).
- Whether non-teaching staff (bursar, admin) need tracking alongside Teachers, or if Teachers covers all staff for now.
