import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function chauffeurBookingCancelledTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const info = data as {
    bookingId: string;
    pickup?: string;
    dropoff?: string;
    cancelledBy?: string; // "user" | "admin" | "system_timeout"
  };

  const who =
    info.cancelledBy === "admin" ? "Movo support" :
    info.cancelledBy === "user"  ? "the rider" :
    "the rider";

  const preview = `Ride cancelled — no action needed - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#131936", fontSize: "24px", marginBottom: "16px" }}>
        Ride Cancelled
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, the ride below was cancelled by {who}. You don&apos;t need to
        do anything — you&apos;re back in the queue and will keep receiving new requests while
        you&apos;re online.
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
          <Text style={{ fontSize: "14px", color: "#666666" }}>
            <strong>Dropoff:</strong> {info.dropoff}
          </Text>
        )}
      </Section>

      <Button
        href={`${settings.baseUrl}/driver/home`}
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
        Back to Dashboard
      </Button>
    </EmailLayout>
  );

  const text = `
Ride Cancelled

Hi ${recipient.firstName}, the ride below was cancelled by ${who}. You don't need to do anything — you're back in the queue and will keep receiving new requests while you're online.

Booking: #${info.bookingId?.slice(0, 8)}
${info.pickup ? `Pickup: ${info.pickup}` : ""}
${info.dropoff ? `Dropoff: ${info.dropoff}` : ""}

Back to dashboard: ${settings.baseUrl}/driver/home

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Ride cancelled — no action needed - ${settings.appName}`,
    html,
    text,
  };
}
