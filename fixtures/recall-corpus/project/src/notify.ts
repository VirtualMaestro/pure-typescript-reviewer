function send(message: string): void {
  if (message.length === 0) {
    throw new Error("empty message");
  }
  process.stdout.write(`${message}\n`);
}

export function notify(message: string): void {
  try {
    send(message);
  } catch (error) {}
}
