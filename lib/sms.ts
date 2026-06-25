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

/** Normalise any phone string to E.164. Defaults to country code 1 (Canada/US). */
export function toE164(phone: string, defaultCountryCode = "1"): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
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
