import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function SkillTagInput({
  value,
  onChange,
  placeholder = "Type a skill and press Enter",
  max = 30,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (!v) return;
    if (value.includes(v)) {
      setInput("");
      return;
    }
    if (value.length >= max) return;
    onChange([...value, v]);
    setInput("");
  }
  function remove(s: string) {
    onChange(value.filter((x) => x !== s));
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  }
  return (
    <div className="rounded-md border bg-background px-2 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring/40">
      {value.map((s) => (
        <Badge key={s} variant="secondary" className="gap-1 pr-1">
          {s}
          <button
            type="button"
            onClick={() => remove(s)}
            className="rounded hover:bg-muted-foreground/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        className="border-0 shadow-none focus-visible:ring-0 h-7 flex-1 min-w-[140px] px-1"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={placeholder}
      />
    </div>
  );
}
