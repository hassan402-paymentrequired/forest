import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

/** One hue for one series: identity comes from the chart's title, not colour. */
const SERIES = 'var(--chart-1)';
const AXIS_TEXT = { fill: 'var(--muted-foreground)', fontSize: 12 };

export type Point = { label: string; value: number };

/**
 * Horizontal bars for comparing categories: the value sits at the bar's tip
 * and the same figures are plain text, so nothing depends on colour or hover.
 * Bars are thin, square at the baseline and rounded at the data end.
 */
export function BarList({
    rows,
    max,
    format = (value) => value.toLocaleString(),
    emptyLabel = 'Nothing recorded yet.',
    className,
}: {
    rows: { label: string; value: number; note?: string }[];
    /** The value a full bar represents; defaults to the largest row. */
    max?: number;
    format?: (value: number) => string;
    emptyLabel?: string;
    className?: string;
}) {
    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
    }

    const scale = max ?? Math.max(...rows.map((row) => row.value), 1);

    return (
        <ul className={cn('grid gap-2.5', className)}>
            {rows.map((row) => (
                <li
                    key={row.label}
                    className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm"
                    title={`${row.label}: ${format(row.value)}${row.note ? ` (${row.note})` : ''}`}
                >
                    <span className="truncate">{row.label}</span>
                    <span className="bg-muted/60 flex h-3 items-center rounded-r-[4px]">
                        <span
                            className="h-3 rounded-r-[4px] transition-opacity hover:opacity-80"
                            style={{
                                width: `${Math.min(Math.max((row.value / scale) * 100, 0), 100)}%`,
                                background: SERIES,
                            }}
                        />
                    </span>
                    <span className="text-right font-medium tabular-nums">
                        {format(row.value)}
                        {row.note ? (
                            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                                {row.note}
                            </span>
                        ) : null}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function TrendTooltip({
    active,
    payload,
    label,
    format,
}: {
    active?: boolean;
    payload?: { value?: number }[];
    label?: string;
    format: (value: number) => string;
}) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
            <p className="text-muted-foreground mb-1">{label}</p>
            <p className="flex items-center gap-2">
                <span
                    aria-hidden
                    className="h-0.5 w-3 rounded-full"
                    style={{ background: SERIES }}
                />
                <span className="text-sm font-semibold tabular-nums">
                    {format(Number(payload[0].value))}
                </span>
            </p>
        </div>
    );
}

/**
 * A single-series line over time: 2px line, a marker on the latest point,
 * hairline grid, and a crosshair tooltip. The data is also rendered as a
 * screen-reader table.
 */
export function TrendChart({
    data,
    caption,
    domain,
    format = (value) => value.toLocaleString(),
    height = 220,
}: {
    data: Point[];
    caption: string;
    domain?: [number, number];
    format?: (value: number) => string;
    height?: number;
}) {
    if (data.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No data recorded for this period yet.
            </p>
        );
    }

    const last = data[data.length - 1];

    return (
        <figure>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                    >
                        <CartesianGrid
                            vertical={false}
                            stroke="var(--border)"
                            strokeWidth={1}
                        />
                        <XAxis
                            dataKey="label"
                            tick={AXIS_TEXT}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--border)' }}
                        />
                        <YAxis
                            tick={AXIS_TEXT}
                            tickLine={false}
                            axisLine={false}
                            domain={domain}
                            tickFormatter={(value) => format(Number(value))}
                            width={48}
                        />
                        <Tooltip
                            cursor={{ stroke: 'var(--border)' }}
                            content={<TrendTooltip format={format} />}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={SERIES}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            dot={false}
                            activeDot={{
                                r: 4,
                                fill: SERIES,
                                stroke: 'var(--card)',
                                strokeWidth: 2,
                            }}
                            isAnimationActive={false}
                        />
                        <ReferenceDot
                            x={last.label}
                            y={last.value}
                            r={4}
                            fill={SERIES}
                            stroke="var(--card)"
                            strokeWidth={2}
                            ifOverflow="visible"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <table className="sr-only">
                <caption>{caption}</caption>
                <tbody>
                    {data.map((point) => (
                        <tr key={point.label}>
                            <th scope="row">{point.label}</th>
                            <td>{format(point.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}
