export interface AgendaType {
  /** Label used in the agenda file, matched case-insensitively. */
  name: string;
  /** CSS hex color, e.g. "#4c8bf5". */
  color: string;
}

export const DEFAULT_TYPES: AgendaType[] = [
  { name: "task", color: "#4c8bf5" },
  { name: "event", color: "#3fb97f" },
  { name: "deadline", color: "#e5534b" },
  { name: "reminder", color: "#e0a030" },
];

/** Palette for newly added types, cycled by index. */
export const NEW_TYPE_COLORS = ["#a371f7", "#2ba4b8", "#d9638f", "#8a9a2b"];

export const UNKNOWN_TYPE_COLOR = "#8a8a8a";

export function cloneTypes(types: AgendaType[]): AgendaType[] {
  return types.map((t) => ({ ...t }));
}

export function findType(types: AgendaType[], type: string): AgendaType | undefined {
  const wanted = type.trim().toLowerCase();
  return types.find((t) => t.name.trim().toLowerCase() === wanted);
}

export function colorFor(types: AgendaType[], type: string): string {
  return findType(types, type)?.color ?? UNKNOWN_TYPE_COLOR;
}
