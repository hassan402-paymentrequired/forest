<?php

namespace App\Ai\Query;

/**
 * First line of defence for AI-written SQL: only a single read-only SELECT
 * (optionally with CTEs) gets through. This is deliberately conservative
 * and is NOT what keeps data safe — the read-only Postgres roles and
 * row-level security are. It exists to fail fast with a message the model
 * can act on, and to shut the few SELECT-shaped escape hatches (such as
 * `set_config`, which could otherwise change the tenant setting RLS reads).
 */
class SqlGuard
{
    private const MAX_LENGTH = 4000;

    private const FORBIDDEN_KEYWORDS = [
        'insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create',
        'grant', 'revoke', 'copy', 'call', 'do', 'execute', 'prepare', 'deallocate',
        'declare', 'fetch', 'listen', 'notify', 'lock', 'vacuum', 'analyze', 'explain',
        'set', 'reset', 'show', 'into', 'begin', 'commit', 'rollback', 'savepoint',
    ];

    private const FORBIDDEN_PATTERNS = [
        '/\bpg_\w*/' => 'PostgreSQL system functions and catalogs',
        '/\bset_config\b/' => 'set_config',
        '/\bcurrent_setting\b/' => 'current_setting',
        '/\binformation_schema\b/' => 'information_schema',
        '/\blo_\w+/' => 'large object functions',
        '/\bdblink\w*/' => 'dblink',
        '/\b(query|table|cursor|schema|database)_to_xml\w*/' => 'XML export functions',
    ];

    /**
     * Validate the SQL and return it with any trailing semicolon removed.
     *
     * @throws UnsafeQueryException
     */
    public function validate(string $sql): string
    {
        $sql = trim($sql);
        $sql = trim(rtrim($sql, ';'));

        if ($sql === '') {
            throw new UnsafeQueryException('The query is empty.');
        }

        if (strlen($sql) > self::MAX_LENGTH) {
            throw new UnsafeQueryException('The query is too long. Write a simpler query.');
        }

        $skeleton = strtolower($this->skeleton($sql));

        if (str_contains($skeleton, ';')) {
            throw new UnsafeQueryException('Only a single statement is allowed. Remove the semicolon.');
        }

        if (! preg_match('/^\s*\(*\s*(select|with)\b/', $skeleton)) {
            throw new UnsafeQueryException('Only SELECT queries are allowed.');
        }

        foreach (self::FORBIDDEN_KEYWORDS as $keyword) {
            if (preg_match('/\b'.$keyword.'\b/', $skeleton)) {
                throw new UnsafeQueryException("Only read-only SELECT queries are allowed; \"{$keyword}\" is not permitted.");
            }
        }

        if (preg_match('/academic_session_id\s*=\s*(?:\w+\.)?academic_term_id|academic_term_id\s*=\s*(?:\w+\.)?academic_session_id/', $skeleton)) {
            throw new UnsafeQueryException(
                'academic_session_id and academic_term_id are different kinds of id and can never be equal, so this join returns nothing. '
                .'grades and attendances already have school_class_id, student_id and academic_term_id: filter them directly and remove the enrollments join.'
            );
        }

        foreach (self::FORBIDDEN_PATTERNS as $pattern => $label) {
            if (preg_match($pattern, $skeleton)) {
                throw new UnsafeQueryException("Queries may not use {$label}.");
            }
        }

        return $sql;
    }

    /**
     * Reduce the SQL to its structural tokens: string literal contents are
     * dropped (so a value like 'drop' is fine) while quoted identifiers keep
     * their text (so "pg_sleep"() can't hide from the keyword checks).
     *
     * @throws UnsafeQueryException
     */
    private function skeleton(string $sql): string
    {
        $skeleton = '';
        $length = strlen($sql);

        for ($i = 0; $i < $length; $i++) {
            $char = $sql[$i];
            $next = $sql[$i + 1] ?? '';

            if ($char === '-' && $next === '-' || $char === '/' && $next === '*') {
                throw new UnsafeQueryException('SQL comments are not allowed.');
            }

            if ($char === '$' && preg_match('/^\$[A-Za-z_0-9]*\$/', substr($sql, $i, 64))) {
                throw new UnsafeQueryException('Dollar-quoted strings are not allowed.');
            }

            if ($char === "'") {
                if (preg_match('/(?:^|[^A-Za-z0-9_])(?:e|u&)$/i', substr($sql, max(0, $i - 3), min($i, 3)))) {
                    throw new UnsafeQueryException('Escape string literals (E\'...\') are not allowed.');
                }

                $i = $this->skipQuoted($sql, $i, "'");
                $skeleton .= "''";

                continue;
            }

            if ($char === '"') {
                $end = $this->skipQuoted($sql, $i, '"');
                $skeleton .= ' '.str_replace('""', '"', substr($sql, $i + 1, $end - $i - 1)).' ';
                $i = $end;

                continue;
            }

            $skeleton .= $char;
        }

        return $skeleton;
    }

    /**
     * Return the index of the closing quote, honouring doubled-quote escapes.
     *
     * @throws UnsafeQueryException
     */
    private function skipQuoted(string $sql, int $start, string $quote): int
    {
        $length = strlen($sql);

        for ($i = $start + 1; $i < $length; $i++) {
            if ($sql[$i] !== $quote) {
                continue;
            }

            if (($sql[$i + 1] ?? '') === $quote) {
                $i++;

                continue;
            }

            return $i;
        }

        throw new UnsafeQueryException('The query has an unterminated quote.');
    }
}
