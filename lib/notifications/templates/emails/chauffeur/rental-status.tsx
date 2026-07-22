import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

type RentalInfo = {
  vehicle?: string;      // "Toyota Camry 2024"
  plan?: string;         // DAILY | WEEKLY | MONTHLY
  amount?: number;
  endDate?: string;      // pre-formatted label
  reason?: string;       // decline reason
};

const PLAN_LABELS: Record<string, string> = {
  DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly",
};

export function chauffeurRentalApprovedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const info = data as RentalInfo;

  const html = render(
    <EmailLayout context={context} preview={`Your Movo vehicle rental is approved - ${settings.appName}`}>
      <Heading style={{ color: "#131936", fontSize: "24px", marginBottom: "16px" }}>
        Rental Approved — Vehicle Assigned
      </Heading>
      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, your vehicle rental has been approved. The vehicle is now
        assigned to your account and you can start accepting trips right away.
      </Text>
      <Section style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginTop: "24px" }}>
        {info.vehicle && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Vehicle:</strong> {info.vehicle}
          </Text>
        )}
        {info.plan && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Plan:</strong> {PLAN_LABELS[info.plan] ?? info.plan}
          </Text>
        )}
        {info.amount != null && (
          <Text style={{ fontSize: "14px", color: "#666666", marginBottom: "4px" }}>
            <strong>Paid:</strong> ${info.amount.toFixed(2)} CAD
          </Text>
        )}
        {info.endDate && (
          <Text style={{ fontSize: "14px", color: "#666666" }}>
            <strong>Return by:</strong> {info.endDate}
          </Text>
        )}
      </Section>
      <Text style={{ fontSize: "13px", color: "#888888", marginTop: "20px" }}>
        Reminder: the vehicle is provided with a full tank. Please return it clean and with a
        full tank — otherwise the fuel cost plus a $20 refueling service fee applies. Damages
        or excessive cleaning are handled per Movo&apos;s rental policy.
      </Text>
      <Button
        href={`${settings.baseUrl}/driver/home`}
        style={{ backgroundColor: "#131936", color: "#ffffff", padding: "14px 32px", borderRadius: "6px", textDecoration: "none", display: "inline-block", marginTop: "24px", fontSize: "16px", fontWeight: "600" }}>
        Go Online &amp; Start Driving
      </Button>
    </EmailLayout>
  );

  const text = `
Rental Approved — Vehicle Assigned

Hi ${recipient.firstName}, your vehicle rental has been approved. The vehicle is now assigned to your account and you can start accepting trips right away.

${info.vehicle ? `Vehicle: ${info.vehicle}` : ""}
${info.plan ? `Plan: ${PLAN_LABELS[info.plan] ?? info.plan}` : ""}
${info.amount != null ? `Paid: $${info.amount.toFixed(2)} CAD` : ""}
${info.endDate ? `Return by: ${info.endDate}` : ""}

Reminder: the vehicle is provided with a full tank. Please return it clean and with a full tank — otherwise the fuel cost plus a $20 refueling service fee applies.

Go online: ${settings.baseUrl}/driver/home

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return { subject: `Rental approved — your Movo vehicle is ready - ${settings.appName}`, html, text };
}

export function chauffeurRentalDeclinedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const info = data as RentalInfo;

  const html = render(
    <EmailLayout context={context} preview={`Update on your rental request - ${settings.appName}`}>
      <Heading style={{ color: "#131936", fontSize: "24px", marginBottom: "16px" }}>
        Rental Request Declined
      </Heading>
      <Text style={{ fontSize: "16px", color: "#333333" }}>
        Hi {recipient.firstName}, unfortunately we couldn&apos;t approve your vehicle rental
        request{info.vehicle ? ` for the ${info.vehicle}` : ""}. Your payment
        {info.amount != null ? ` of $${info.amount.toFixed(2)} CAD` : ""} has been refunded in
        full to your card.
      </Text>
      {info.reason && (
        <Section style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginTop: "24px" }}>
          <Text style={{ fontSize: "14px", color: "#666666" }}>
            <strong>Reason:</strong> {info.reason}
          </Text>
        </Section>
      )}
      <Text style={{ fontSize: "13px", color: "#888888", marginTop: "20px" }}>
        Refunds typically appear on your statement within 5–10 business days. You&apos;re welcome
        to request a different vehicle at any time.
      </Text>
      <Button
        href={`${settings.baseUrl}/driver/home/rentals`}
        style={{ backgroundColor: "#131936", color: "#ffffff", padding: "14px 32px", borderRadius: "6px", textDecoration: "none", display: "inline-block", marginTop: "24px", fontSize: "16px", fontWeight: "600" }}>
        Browse Rental Vehicles
      </Button>
    </EmailLayout>
  );

  const text = `
Rental Request Declined

Hi ${recipient.firstName}, unfortunately we couldn't approve your vehicle rental request${info.vehicle ? ` for the ${info.vehicle}` : ""}. Your payment${info.amount != null ? ` of $${info.amount.toFixed(2)} CAD` : ""} has been refunded in full to your card.

${info.reason ? `Reason: ${info.reason}` : ""}

Refunds typically appear on your statement within 5-10 business days.

Browse rental vehicles: ${settings.baseUrl}/driver/home/rentals

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return { subject: `Update on your rental request - ${settings.appName}`, html, text };
}
