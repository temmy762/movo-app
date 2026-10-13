import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client && accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

/**
 * Normalise any phone string to E.164. A 10-digit number with no country code
 * is Canadian/US (+1) — Movo operates in Canada. (This used to default to +234,
 * which stored Canadian numbers as Nigerian ones.)
 */
export function toE164(phone: string, defaultCountryCode = "1"): string {
  const hasPlus = phone.trimStart().startsWith("+");
  let digits = phone.replace(/\D/g, "");

  if (hasPlus) {
    // Number already carries a country code, but may have a leading trunk 0 in the
    // national part (e.g. +2340906315XXXX → +234906315XXXX).
    // Heuristic: if {1-3 digit CC} + "0" + {9-10 digit national} → strip the 0.
    const m = digits.match(/^(\d{1,3})(0)(\d{9,10})$/);
    if (m) digits = m[1] + m[3];
    return `+${digits}`;
  }

  // Nigerian local format (0 + 10 digits, e.g. 0803XXXXXXX) — legacy test accounts
  if (digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;

  // Strip any other leading trunk "0"
  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  // 10 digits → prepend default country code (+1)
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;

  // 11 digits starting with 1 → North American number typed with its 1
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Anything else: assume it already carries a country code
  return `+${digits}`;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const twilioClient = getClient();
    const normalised = toE164(to);

    if (!twilioClient || !fromPhone) {
      console.warn("[SMS] Twilio not configured. Message not sent.");
      console.log(`[SMS] To: ${normalised}, Message: ${message}`);
      return false;
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: fromPhone,
      to: normalised,
    });

    console.log(`[SMS] Sent to ${normalised}: ${result.sid}`);
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return false;
  }
}

export async function sendAdminOTP(phone: string, otp: string): Promise<boolean> {
  const message = `Your MOVO admin verification code is: ${otp}. Valid for 10 minutes.`;
  return sendSMS(phone, message);
}
