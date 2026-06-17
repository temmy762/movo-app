import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function adminPayoutRequestTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { data, settings } = context;
  const payout = data as {
    driverName: string;
    driverEmail: string;
    amount: number;
    type: string;
    transactionId: string;
    requestedAt: string;
    automated: boolean;
  };

  const preview = `Payout ${payout.automated ? "processed" : "requested"}: CAD $${payout.amount.toFixed(2)} — ${payout.driverName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Driver Payout {payout.automated ? "Processed" : "Requested"}
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        {payout.automated
          ? `A payout has been automatically transferred to the driver's bank account.`
          : `A driver has requested a manual payout that may require your review.`}
      </Text>

      <Section
        style={{
          backgroundColor: payout.automated ? "#f0fdf4" : "#fffbeb",
          border: `1px solid ${payout.automated ? "#bbf7d0" : "#fde68a"}`,
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
          textAlign: "center" as const,
        }}
      >
        <Text style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
          {payout.automated ? "Amount Transferred" : "Amount Requested"}
        </Text>
        <Text style={{ fontSize: "32px", fontWeight: "700", color: "#2D0A53", margin: "0" }}>
          CAD ${payout.amount.toFixed(2)}
        </Text>
        <Text style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
          {payout.automated ? "✓ Stripe Connect — Automated" : "⏳ Pending manual approval"}
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "16px",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Driver:</strong> {payout.driverName}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Email:</strong> {payout.driverEmail}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Transaction ID:</strong> {payout.transactionId}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Type:</strong> {payout.type}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666" }}>
          <strong>Requested At:</strong> {payout.requestedAt}
        </Text>
      </Section>

      <Button
        href={`${settings.baseUrl}/admin/financials/payouts`}
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
        View Payouts
      </Button>
    </EmailLayout>
  );

  const text = `
Driver Payout ${payout.automated ? "Processed" : "Requested"}

Driver: ${payout.driverName}
Email: ${payout.driverEmail}
Amount: CAD $${payout.amount.toFixed(2)}
Type: ${payout.type}
Transaction ID: ${payout.transactionId}
Requested At: ${payout.requestedAt}
Status: ${payout.automated ? "Automatically transferred via Stripe Connect" : "Pending manual approval"}

View payouts: ${settings.baseUrl}/admin/financials/payouts

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Driver payout ${payout.automated ? "processed" : "requested"}: CAD $${payout.amount.toFixed(2)} — ${payout.driverName}`,
    html,
    text,
  };
}
