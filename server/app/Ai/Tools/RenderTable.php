<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class RenderTable implements Tool
{
    public function name(): string
    {
        return 'render_table';
    }

    public function description(): Stringable|string
    {
        return 'Show the user a table. Use it for records with several attributes, e.g. students with their class and status. '
            .'Every row must have exactly one cell per column, all as text.';
    }

    public function handle(Request $request): Stringable|string
    {
        $columnCount = count($request->array('columns'));

        foreach ($request->array('rows') as $row) {
            if (! is_array($row) || count($row) !== $columnCount) {
                return 'Error: every row must have exactly one cell per column.';
            }
        }

        return 'The table is now displayed to the user. Do not repeat its rows; add one short sentence of insight.';
    }

    /**
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->required(),
            'columns' => $schema->array()->items($schema->string())
                ->description('Column headings.')->required(),
            'rows' => $schema->array()->items($schema->array()->items($schema->string()))
                ->description('Rows, each an array of cell text in column order.')->required(),
        ];
    }
}
