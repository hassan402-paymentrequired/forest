const TOOL_NAMES = [
    'run_sql_query',
    'render_chart',
    'render_table',
    'render_list',
    'navigate_to_page',
    'ask_clarifying_question',
];

const TOOL_CALL_START = new RegExp(
    `(?:^|\\n)[ \\t]*(${TOOL_NAMES.join('|')})\\b`,
    'g',
);

export type LeakedToolCall = { name: string; input: unknown };

/**
 * Index just past the JSON object starting at `start`, or -1 when it is not
 * closed yet (the reply is still streaming in).
 */
function endOfJsonObject(text: string, start: number): number {
    let depth = 0;
    let inString = false;

    for (let index = start; index < text.length; index++) {
        const char = text[index];

        if (inString) {
            if (char === '\\') {
                index++;
            } else if (char === '"') {
                inString = false;
            }

            continue;
        }

        if (char === '"') {
            inString = true;
        } else if (char === '{') {
            depth++;
        } else if (char === '}' && --depth === 0) {
            return index + 1;
        }
    }

    return -1;
}

/**
 * A small local model sometimes writes its reasoning or a tool call into the
 * reply as plain text instead of making the call: an orphaned `</think>`,
 * or a line such as `render_list {"title": ...}`. None of it is meant for the
 * user, so it is removed from the text (also while streaming, when the call
 * is only half written). Display calls found this way are handed back so the
 * chart or list can still be drawn. Wording that would expose how the system
 * is built is swapped for something neutral as a backstop to the server-side
 * instructions and topic guard.
 */
export function parseAssistantText(text: string): {
    text: string;
    leakedCalls: LeakedToolCall[];
} {
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');

    // Text before an unmatched closing tag is leaked reasoning.
    const orphan = cleaned.lastIndexOf('</think>');

    if (orphan !== -1) {
        cleaned = cleaned.slice(orphan + '</think>'.length);
    }

    // An opening tag still streaming in: hide it until it closes.
    cleaned = cleaned.replace(/<think>[\s\S]*$/, '');

    const leakedCalls: LeakedToolCall[] = [];
    let output = '';
    let cursor = 0;

    TOOL_CALL_START.lastIndex = 0;

    for (const match of cleaned.matchAll(TOOL_CALL_START)) {
        if (match.index < cursor) {
            continue;
        }

        output += cleaned.slice(cursor, match.index);

        const afterName = match.index + match[0].length;
        const braceAt = cleaned.slice(afterName).search(/\{/);
        const isJsonNext =
            braceAt !== -1 &&
            !/[^\s:(]/.test(cleaned.slice(afterName, afterName + braceAt));

        if (!isJsonNext) {
            // A bare tool name (or one with nothing parseable after it).
            cursor =
                cleaned.indexOf('\n', afterName) === -1
                    ? cleaned.length
                    : cleaned.indexOf('\n', afterName);

            continue;
        }

        const jsonStart = afterName + braceAt;
        const jsonEnd = endOfJsonObject(cleaned, jsonStart);

        if (jsonEnd === -1) {
            cursor = cleaned.length;

            break;
        }

        try {
            leakedCalls.push({
                name: match[1],
                input: JSON.parse(cleaned.slice(jsonStart, jsonEnd)),
            });
        } catch {
            // Not valid JSON: nothing to draw, but still not for the user.
        }

        cursor = jsonEnd;
    }

    output += cleaned.slice(cursor);

    return {
        text: output
            .replace(
                /\b(?:the |our |your )?databases?\b/gi,
                'your school records',
            )
            .replace(/\b(?:sql|schema)\b/gi, 'records')
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
        leakedCalls: leakedCalls.filter(
            (call) => call.name !== 'run_sql_query',
        ),
    };
}

export function cleanAssistantText(text: string): string {
    return parseAssistantText(text).text;
}
