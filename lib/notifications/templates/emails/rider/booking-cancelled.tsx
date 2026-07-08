import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderBookingCancelledTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const info = data as {
    bookingId: string;
    pickup?: string;
    dropoff?: string;
    cancelledBy?: string;   // "user" | "driver" | "admin" | "system_timeout"
    refunded?: boolean;
    refundAmount?: number;
    total?: number;
    refundPending?: boolean;
  };

  const byYou = info.cancelledBy === "user";
  const headline = byYou ? "Your Ride Is Cancelled" : "Your Ride Was Cancelled";
  const who =
    info.cancelledBy === "driver" ? "your chauffeur had to cancel this ride" :
    info.cancelledBy === "admin"  ? "this ride was cancelled by Movo support" :
    byYou ? "your cancellation is confirmed" :
    "this ride was cancelled";

  const refundLine = info.refundPending
    ? "Your refund is being processed and will be confirmed shortly."
    : info.refunded && info.refundAmount != null
      ? `A refund of $${info.refundAmount.toFixed(2)} has been issued to your original payment method.`
      : info.refunded
        ? "A full refund has been issued to your original payment method."
        : null;

  const preview = `${headline} - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#131936", fontSize: "24px", marginBottom: "16px" }}>
        {headline}
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, {who}.
        {refundLine ? ` ${refundLine}` : ""}
      </Text>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Booking:</strong> #{info.bookingId?.slice(0, 8)}
        </Text>
        {info.pickup && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Pickup:</strong> {info.pickup}
          </Text>
        )}
        {info.dropoff && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Dropoff:</strong> {info.dropoff}
          </Text>
        )}
        {info.refunded && info.refundAmount != null && (
          <Text style={{ fontSize: "14px", color: "#666666" }}>
            <strong>Refunded:</strong> ${info.refundAmount.toFixed(2)}
          </Text>
        )}
      </Section>

      {refundLine && (
        <Text style={{ fontSize: "13px", color: "#888888", marginTop: "20px" }}>
          Refunds typically appear on your statement within 5–10 business days, depending on
          your bank.
        </Text>
      )}

      <Button
        href={`${settings.baseUrl}/home`}
        style={{
          backgroundColor: "#131936",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "24px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Book Another Ride
      </Button>
    </EmailLayout>
  );

  const text = `
${headline}

Hi ${recipient.firstName}, ${who}.${refundLine ? ` ${refundLine}` : ""}

Booking: #${info.bookingId?.slice(0, 8)}
${info.pickup ? `Pickup: ${info.pickup}` : ""}
${info.dropoff ? `Dropoff: ${info.dropoff}` : ""}
${info.refunded && info.refundAmount != null ? `Refunded: $${info.refundAmount.toFixed(2)}` : ""}

${refundLine ? "Refunds typically appear on your statement within 5-10 business days." : ""}

Book another ride: ${settings.baseUrl}/home

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `${headline} - ${settings.appName}`,
    html,
    text,
  };
}
