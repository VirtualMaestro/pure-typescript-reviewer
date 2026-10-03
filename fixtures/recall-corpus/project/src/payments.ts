export function charge(cents: number): string {
  if (cents > 100_000) {
    throw new Error("card declined: limit exceeded");
  }
  return `charged ${cents}`;
}

export function tryCharge(cents: number): string {
  try {
    return charge(cents);
  } catch (error) {
    if (error instanceof Error && error.message.includes("declined")) {
      return "declined";
    }
    throw error;
  }
}
