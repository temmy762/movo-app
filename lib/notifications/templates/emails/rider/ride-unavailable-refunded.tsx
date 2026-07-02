import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderRideUnavailableRefundedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const info = data as {
    bookingId: string;
    pickup?: string;
    dropoff?: string;
    total?: number;
  };

  const preview = `We couldn't find a driver — you've been fully refunded - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#131936", fontSize: "24px", marginBottom: "16px" }}>
        No Driver Available
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, we're sorry — we weren't able to find a driver for your ride
        in time. Your payment has been fully refunded and no further action is needed.
      </Text>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
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
        {info.total != null && (
          <Text style={{ fontSize: "14px", color: "#666666" }}>
            <strong>Refunded amount:</strong> ${info.total.toFixed(2)}
          </Text>
        )}
      </Section>

      <Text style={{ fontSize: "13px", color: "#888888", marginTop: "20px" }}>
        Refunds typically appear on your statement within 5–10 business days, depending on your
        bank. Please try booking again — driver availability changes throughout the day.
      </Text>

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
No Driver Available

Hi ${recipient.firstName}, we're sorry — we weren't able to find a driver for your ride in time. Your payment has been fully refunded and no further action is needed.

${info.pickup ? `Pickup: ${info.pickup}` : ""}
${info.dropoff ? `Dropoff: ${info.dropoff}` : ""}
${info.total != null ? `Refunded amount: $${info.total.toFixed(2)}` : ""}

Refunds typically appear on your statement within 5-10 business days.

Book another ride: ${settings.baseUrl}/home

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `We couldn't find a driver — you've been refunded - ${settings.appName}`,
    html,
    text,
  };
}
