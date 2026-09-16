import { Button } from "@/components/ui/button";
import InputError from "@/components/input-error";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DateField({
    label,
    name,
    value,
    onChange,
    error,
    fromDate,
}: {
    label: string;
    name: string;
    value?: Date;
    onChange: (date?: Date) => void;
    error?: string;
    fromDate?: Date;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            <input type="hidden" name={name} value={value ? format(value, "yyyy-MM-dd") : ""} />
            <Popover> 
                <PopoverTrigger asChild>
                    <Button
                        id={name}
                        type="button"
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 size-4" />
                        {value ? format(value, "PPP") : "Pick a date"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={value}
                        onSelect={onChange}
                        fromDate={fromDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            <InputError message={error} />
        </div>
    );
}