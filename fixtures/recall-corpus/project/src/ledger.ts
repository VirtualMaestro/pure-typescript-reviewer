import { append, type Entry } from "./ledger-store.js";

export function postEntry(entry: Entry): void {
  append(entry);
}
