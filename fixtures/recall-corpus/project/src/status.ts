import type { Status } from "./types.js";

export function label(status: Status): string {
  let text = "";
  if (status === "new") {
    text = "New";
  } else if (status === "paid") {
    text = "Paid";
  } else if (status === "shipped") {
    text = "Shipped";
  }
  return text;
}
