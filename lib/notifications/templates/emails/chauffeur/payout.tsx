import { Button, Heading, Text, Hr, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function chauffeurPayoutTemplate(context: EmailTemplateContext): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const payout = data as {
    payoutId: string;
    amount: number;
    periodStart: string;
    periodEnd: string;
    ridesCompleted: number;
    paymentMethod: string;
    processedAt: string;
  };

  const preview = `Your payout has been processed - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Payout Processed
      </Heading>

      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Great news, {recipient.firstName}! Your earnings have been processed.
      </Text>

      <Section
        style={{
          backgroundColor: "#2D0A53",
          padding: "24px",
          borderRadius: "8px",
          marginTop: "24px",
          textAlign: "center",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#ffffff", marginBottom: "8px" }}>
          Amount Deposited
        </Text>
        <Text style={{ fontSize: "32px", fontWeight: "700", color: "#ffffff" }}>
          ${payout.amount.toFixed(2)}
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "24px",
        }}
      >
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Payout ID:</strong> {payout.payoutId}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Period:</strong> {payout.periodStart} - {payout.periodEnd}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Rides Completed:</strong> {payout.ridesCompleted}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
          <strong>Payment Method:</strong> {payout.paymentMethod}
        </Text>
        <Text style={{ fontSize: "14px", color: "#666666" }}>
          <strong>Processed:</strong> {payout.processedAt}
        </Text>
      </Section>

      <Hr style={{ borderColor: "#e6e6e6", margin: "24px 0" }} />

      <Text style={{ fontSize: "14px", color: "#666666" }}>
        Funds should appear in your account within 1-3 business days depending on your bank.
      </Text>

      <Button
        href={`${settings.baseUrl}/driver/home/wallet`}
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
        View Earnings
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        Keep up the great work! Your dedication helps make {settings.appName} the best ride service.
      </Text>
    </EmailLayout>
  );

  const text = `
Payout Processed

Great news, ${recipient.firstName}! Your earnings have been processed.

Amount Deposited: $${payout.amount.toFixed(2)}

Payout ID: ${payout.payoutId}
Period: ${payout.periodStart} - ${payout.periodEnd}
Rides Completed: ${payout.ridesCompleted}
Payment Method: ${payout.paymentMethod}
Processed: ${payout.processedAt}

Funds should appear in your account within 1-3 business days depending on your bank.

View earnings: ${settings.baseUrl}/driver/earnings

Keep up the great work! Your dedication helps make ${settings.appName} the best ride service.

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Payout processed: $${payout.amount.toFixed(2)} - ${settings.appName}`,
    html,
    text,
  };
}
