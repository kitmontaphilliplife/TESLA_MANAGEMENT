import { useEffect, useRef, useState } from "react";

export function DebouncedInput({
  value,
  onCommit,
  className,
  placeholder,
  as = "input",
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  as?: "input" | "textarea";
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setLocal(value), [value]);

  function handleChange(next: string) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(next), 500);
  }

  function handleBlur() {
    if (timer.current) clearTimeout(timer.current);
    if (local !== value) onCommit(local);
  }

  if (as === "textarea") {
    return (
      <textarea
        className={className}
        value={local}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
    );
  }

  return (
    <input
      className={className}
      value={local}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  );
}
