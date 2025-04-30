// simple ring‑buffer logger (max 200 entries)
type LogEntry = {
  ts: string;
  direction: "request" | "response" | "error";
  payload: any;         // trimmed / redacted
};

const buffer: LogEntry[] = [];

export const log = (entry: LogEntry) => {
  if (buffer.length >= 200) buffer.shift();
  buffer.push(entry);
};

export const getLogs = () => [...buffer].reverse(); // newest first