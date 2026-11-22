export type SmsMessage = {
  to: string;
  body: string;
};

export type SmsProvider = {
  /** `mock` logs the link. A vendor id means a real text was handed off. */
  readonly id: string;
  send(message: SmsMessage): Promise<{ id: string }>;
};

/**
 * Default sender. It does not call a vendor and does not need an account.
 * SMS_PROVIDER=mock is the same thing. Any other value fails until that
 * vendor is wired, so a half-configured deploy cannot pretend a text was sent.
 */
export function createSmsProvider(): SmsProvider {
  const name = (process.env.SMS_PROVIDER ?? 'mock').trim().toLowerCase() || 'mock';
  if (name === 'mock' || name === 'dev') return createMockSmsProvider();
  throw new Error(
    `SMS provider "${name}" is not connected. Leave SMS_PROVIDER unset to log the approval link instead of sending a text.`,
  );
}

export function createMockSmsProvider(log: (line: string) => void = console.info): SmsProvider {
  return {
    id: 'mock',
    async send(message) {
      const last4 = message.to.replace(/\D/g, '').slice(-4);
      log(`[collegematch sms:mock] to=***${last4} ${message.body}`);
      return { id: `mock-${Date.now()}` };
    },
  };
}

export function recordingSmsProvider(): SmsProvider & { messages: SmsMessage[] } {
  const messages: SmsMessage[] = [];
  return {
    id: 'mock',
    messages,
    async send(message) {
      messages.push(message);
      return { id: `mock-${messages.length}` };
    },
  };
}

export function approvalText(name: string, url: string): string {
  const first = name.trim().split(/\s+/)[0]?.replace(/[^\p{L}\p{N}'-]/gu, '') || 'A player';
  return `CollegeMatch: ${first.slice(0, 40)} asked to publish a recruiting bio. Approve once (expires in 72 hours): ${url}`;
}
