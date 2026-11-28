export type ApprovalMail = {
  to: string;
  subject: string;
  /** Plain-text body. Email clients that skip HTML still get the link. */
  text: string;
  html: string;
};

export type EmailProvider = {
  /** `mock` logs the link. `resend` means Resend accepted the message. */
  readonly id: string;
  send(message: ApprovalMail): Promise<{ id: string }>;
};

export function emailProviderError(env: { provider?: string; key?: string; from?: string }): string | null {
  const name = (env.provider ?? 'mock').trim().toLowerCase() || 'mock';
  if (name === 'mock' || name === 'dev') return null;
  if (name === 'resend') {
    if (!env.key?.trim() || !env.from?.trim()) {
      return 'EMAIL_PROVIDER is resend, but RESEND_API_KEY or EMAIL_FROM is missing. No email was sent.';
    }
    return null;
  }
  return `Email provider "${name}" is not connected. Leave EMAIL_PROVIDER unset to log the approval link.`;
}

/**
 * Default sender. It does not call a vendor.
 * EMAIL_PROVIDER=resend uses Resend and refuses to send when the key or from-address is missing.
 */
export function createEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const problem = emailProviderError({ provider, key, from });
  if (problem) throw new Error(problem);
  const name = (provider ?? 'mock').trim().toLowerCase() || 'mock';
  if (name === 'resend') return createResendProvider(key!.trim(), from!.trim());
  return createMockEmailProvider();
}

export function createMockEmailProvider(log: (line: string) => void = console.info): EmailProvider {
  return {
    id: 'mock',
    async send(message) {
      log(`[collegematch email:mock] to=${maskEmail(message.to)} ${message.text}`);
      return { id: `mock-${Date.now()}` };
    },
  };
}

export function recordingEmailProvider(): EmailProvider & { messages: ApprovalMail[] } {
  const messages: ApprovalMail[] = [];
  return {
    id: 'mock',
    messages,
    async send(message) {
      messages.push(message);
      return { id: `mock-${messages.length}` };
    },
  };
}

function createResendProvider(key: string, from: string): EmailProvider {
  return {
    id: 'resend',
    async send(message) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!response.ok) {
        console.error(`Resend rejected the approval email (${response.status}).`);
        throw new Error('The email service did not accept the message. Nothing was changed.');
      }
      const payload = (await response.json().catch(() => null)) as { id?: unknown } | null;
      if (!payload || typeof payload.id !== 'string' || payload.id.length === 0) {
        throw new Error('The email service did not accept the message. Nothing was changed.');
      }
      return { id: payload.id };
    },
  };
}

export function approvalEmail(input: {
  to: string;
  name: string;
  url: string;
  position: string;
  gradYear: number;
  hasPhoto: boolean;
  colleges: string[];
}): ApprovalMail {
  const name = input.name.trim() || 'A player';
  const colleges = input.colleges.slice(0, 8);
  const collegeLine =
    colleges.length > 0 ? colleges.join(', ') : 'No colleges saved yet';
  const photoLine = input.hasPhoto ? 'Their photo' : 'No photo, unless they add one later';
  const subject = `Please approve ${name}'s CollegeMatch page`;
  const text = [
    'Hello,',
    '',
    `${name} wants to publish a recruiting page on CollegeMatch.`,
    '',
    'If you approve, anyone with the link will be able to see:',
    `- Their name, position (${input.position}), and class of ${input.gradYear}`,
    `- ${photoLine}`,
    '- Playing details such as jersey number, dominant foot, years at this level, height, GPA, and home state',
    `- Colleges they're watching: ${collegeLine}`,
    '',
    'The page is not listed in search engines. Only the player can take it down later.',
    '',
    'This link expires in 72 hours and works once:',
    input.url,
    '',
    "If you don't recognize this request, ignore this email. Nothing becomes public unless you approve.",
    '',
    'CollegeMatch',
  ].join('\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;background:#f3f0e8;color:#17211c;font-family:Georgia,'Iowan Old Style',serif;">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px 40px;">
    <p style="margin:0 0 16px;letter-spacing:0.14em;text-transform:uppercase;font-family:sans-serif;font-size:12px;color:#0f7a45;">CollegeMatch</p>
    <h1 style="font-size:32px;line-height:1.1;margin:0 0 12px;">Please approve this page</h1>
    <p style="font-family:sans-serif;font-size:16px;line-height:1.5;">${escapeHtml(name)} wants to publish a recruiting page on CollegeMatch.</p>
    <p style="font-family:sans-serif;font-size:16px;line-height:1.5;">If you approve, anyone with the link will be able to see:</p>
    <ul style="font-family:sans-serif;font-size:16px;line-height:1.5;padding-left:18px;">
      <li>Their name, position (${escapeHtml(input.position)}), and class of ${input.gradYear}</li>
      <li>${escapeHtml(photoLine)}</li>
      <li>Playing details such as jersey number, dominant foot, years at this level, height, GPA, and home state</li>
      <li>Colleges they're watching: ${escapeHtml(collegeLine)}</li>
    </ul>
    <p style="font-family:sans-serif;font-size:16px;line-height:1.5;">The page is not listed in search engines. Only the player can take it down later.</p>
    <p style="margin:24px 0;">
      <a href="${escapeHtml(input.url)}" style="display:inline-block;background:#0c3b2c;color:#f4f1ea;text-decoration:none;font-family:sans-serif;font-weight:700;font-size:18px;padding:14px 22px;border-radius:999px;">Approve</a>
    </p>
    <p style="font-family:sans-serif;font-size:14px;line-height:1.5;color:#3c4a43;">This link expires in 72 hours and works once.<br /><a href="${escapeHtml(input.url)}">${escapeHtml(input.url)}</a></p>
    <p style="font-family:sans-serif;font-size:14px;line-height:1.5;color:#3c4a43;">If you don't recognize this request, ignore this email. Nothing becomes public unless you approve.</p>
  </div>
</body>
</html>`;
  return { to: input.to, subject, text, html };
}

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return 'hidden';
  return `${local.slice(0, 1)}***@${domain}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    if (character === '>') return '&gt;';
    if (character === '"') return '&quot;';
    return '&#39;';
  });
}
