<?php

namespace App\Ai\Tools;

use App\Ai\Query\QueryScope;
use App\Ai\Query\SchemaCatalog;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetSchema implements Tool
{
    public function __construct(private QueryScope $scope, private SchemaCatalog $catalog) {}

    public function name(): string
    {
        return 'get_schema';
    }

    public function description(): Stringable|string
    {
        return 'Get the tables and columns you can query with run_sql_query. Call this before writing SQL '
            .'if you are unsure of a table or column name.';
    }

    public function handle(Request $request): Stringable|string
    {
        return $this->catalog->describe($this->scope);
    }

    /**
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
