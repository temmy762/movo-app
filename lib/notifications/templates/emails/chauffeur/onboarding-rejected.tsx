import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function chauffeurOnboardingRejectedTemplate(
  context: EmailTemplateContext
): EmailTemplateResult {
  const { recipient, data, settings } = context;
  const rejection = data as {
    reason?: string;
    canReapply?: boolean;
  };

  const preview = `Update on your application - ${settings.appName}`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Application Update
      </Heading>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        Hi {recipient.firstName},
      </Text>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        We've completed the review of your application to join the {settings.appName} Chauffeur network. Unfortunately, we're unable to approve your application at this time.
      </Text>

      {rejection.reason && (
        <Section
          style={{
            backgroundColor: "#fff8e1",
            padding: "20px",
            borderRadius: "8px",
            marginTop: "24px",
            borderLeft: "4px solid #ffc107",
          }}
        >
          <Text style={{ fontSize: "14px", fontWeight: "600", color: "#333333", marginBottom: "8px" }}>
            Reason:
          </Text>
          <Text style={{ fontSize: "14px", color: "#333333" }}>
            {rejection.reason}
          </Text>
        </Section>
      )}

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333", marginTop: "24px" }}>
        This decision may be based on:
      </Text>

      <ul style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333", paddingLeft: "20px" }}>
        <li>Incomplete documentation</li>
        <li>Vehicle requirements not met</li>
        <li>Background check results</li>
        <li>Insurance requirements</li>
      </ul>

      {rejection.canReapply !== false && (
        <>
          <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333", marginTop: "24px" }}>
            You may reapply after addressing the above concerns. If you'd like to discuss this decision or need clarification, please contact our driver support team.
          </Text>

          <Button
            href={`${settings.baseUrl}/driver/support`}
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
            Contact Driver Support
          </Button>
        </>
      )}

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        Thank you for your interest in joining {settings.appName}. We wish you the best in your future endeavors.
      </Text>
    </EmailLayout>
  );

  const text = `
Application Update

Hi ${recipient.firstName},

We've completed the review of your application to join the ${settings.appName} Chauffeur network. Unfortunately, we're unable to approve your application at this time.

${rejection.reason ? `Reason: ${rejection.reason}` : ""}

This decision may be based on:
- Incomplete documentation
- Vehicle requirements not met
- Background check results
- Insurance requirements

${rejection.canReapply !== false ? `You may reapply after addressing the above concerns. Contact our driver support team: ${settings.baseUrl}/driver/support` : ""}

Thank you for your interest in joining ${settings.appName}. We wish you the best in your future endeavors.

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Application update - ${settings.appName}`,
    html,
    text,
  };
}
