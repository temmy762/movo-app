import { Button, Heading, Text, Hr, Section } from "@react-email/components";
import { EmailLayout, money } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderPaymentReceiptTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const payment = data as {
    bookingId: string;
    paymentId: string;
    amount: number;
    method: string;
    date: string;
    items: { label: string; amount: number }[];
    receiptNumber?: string | null;
    bookingNumber?: string | null;
    serviceLabel?: string;
  };

  const preview = `Your payment receipt from ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Payment Receipt
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, here's your receipt for the recent payment.
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
          <strong>Receipt number:</strong> {payment.receiptNumber ?? payment.paymentId}
        </Text>
        {payment.bookingNumber && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Booking number:</strong> {payment.bookingNumber}
          </Text>
        )}
        {payment.serviceLabel && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Service:</strong> {payment.serviceLabel}
          </Text>
        )}
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Date:</strong> {payment.date}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666" }}>
          <strong>Payment Method:</strong> {payment.method}
        </Text>
      </Section>

      <Hr style={{ borderColor: "#e6e6e6", margin: "24px 0" }} />

      <Section>
        <Text style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
          Items
        </Text>
        {(payment.items ?? []).map((item, index) => (
          <Text
            key={index}
            style={{
              fontSize: "14px",
              color: "#333333",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{item.label}</span>
            <span>${money(item.amount)}</span>
          </Text>
        ))}

        <Hr style={{ borderColor: "#e6e6e6", margin: "16px 0" }} />

        <Text style={{ fontSize: "18px", fontWeight: "700", color: "#2D0A53" }}>
          Total: ${money(payment.amount)}
        </Text>
      </Section>

      <Button
        href={`${settings.baseUrl}/home/rides/${payment.bookingId}`}
        style={{
          backgroundColor: "#2D0A53",
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
        View Ride Details
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        This receipt was generated automatically. For questions, contact{" "}
        <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>
      </Text>
    </EmailLayout>
  );

  const text = `
Payment Receipt

Hi ${recipient.firstName}, here's your receipt for the recent payment.

Receipt number: ${payment.receiptNumber ?? payment.paymentId}${payment.bookingNumber ? `
Booking number: ${payment.bookingNumber}` : ""}${payment.serviceLabel ? `
Service: ${payment.serviceLabel}` : ""}
Date: ${payment.date}
Payment Method: ${payment.method}

Items:
${(payment.items ?? []).map((i) => `- ${i.label}: $${money(i.amount)}`).join("\n")}

Total: $${money(payment.amount)}

View ride details: ${settings.baseUrl}/home/rides/${payment.bookingId}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Your ${settings.appName} payment receipt`,
    html,
    text,
  };
}
