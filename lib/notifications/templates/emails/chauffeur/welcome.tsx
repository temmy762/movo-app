import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function chauffeurWelcomeTemplate(context: EmailTemplateContext): EmailTemplateResult {
  const { recipient, settings } = context;

  const preview = `Welcome to ${settings.appName} Chauffeur, ${recipient.firstName}!`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Welcome to {settings.appName} Chauffeur!
      </Heading>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        Hi {recipient.firstName},
      </Text>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        Welcome to the {settings.appName} Chauffeur network! We're excited to have you join our community of professional drivers.
      </Text>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        To get started, you'll need to complete our onboarding process:
      </Text>

      <ul style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333", paddingLeft: "20px" }}>
        <li>Upload your driver's license and required documents</li>
        <li>Complete your vehicle information</li>
        <li>Pass a background check</li>
        <li>Review and accept our terms of service</li>
        <li>Complete driver training modules</li>
      </ul>

      <Button
        href={`${settings.baseUrl}/driver/onboarding`}
        style={{
          backgroundColor: "#2D0A53",
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
          marginTop: "24px",
          marginBottom: "24px",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Start Onboarding
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        If you have any questions during the process, our driver support team is here to help at{" "}
        <a href={`mailto:${settings.supportEmail}`} style={{ color: "#2D0A53" }}>
          {settings.supportEmail}
        </a>
      </Text>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "16px" }}>
        We look forward to partnering with you!
      </Text>
    </EmailLayout>
  );

  const text = `
Welcome to ${settings.appName} Chauffeur!

Hi ${recipient.firstName},

Welcome to the ${settings.appName} Chauffeur network! We're excited to have you join our community of professional drivers.

To get started, you'll need to complete our onboarding process:
- Upload your driver's license and required documents
- Complete your vehicle information
- Pass a background check
- Review and accept our terms of service
- Complete driver training modules

Start onboarding: ${settings.baseUrl}/driver/onboarding

If you have any questions during the process, our driver support team is here to help at ${settings.supportEmail}

We look forward to partnering with you!

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Welcome to ${settings.appName} Chauffeur!`,
    html,
    text,
  };
}
