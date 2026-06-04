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

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const twilioClient = getClient();

    if (!twilioClient || !fromPhone) {
      console.warn("[SMS] Twilio not configured. Message not sent.");
      console.log(`[SMS] To: ${to}, Message: ${message}`);
      return false;
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: fromPhone,
      to,
    });

    console.log(`[SMS] Sent to ${to}: ${result.sid}`);
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
