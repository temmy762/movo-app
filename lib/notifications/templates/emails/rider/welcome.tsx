import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function riderWelcomeTemplate(context: EmailTemplateContext): EmailTemplateResult {
  const { recipient, settings } = context;

  const preview = `Welcome to ${settings.appName}, ${recipient.firstName}! Start booking rides today.`;

  const html = render(
    <EmailLayout context={context} preview={preview}>
      <Heading style={{ color: "#2D0A53", fontSize: "24px", marginBottom: "16px" }}>
        Welcome to {settings.appName}, {recipient.firstName}!
      </Heading>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        We're thrilled to have you on board. With {settings.appName}, you can book
        premium rides with professional chauffeurs in just a few taps.
      </Text>

      <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333" }}>
        Here's what you can do:
      </Text>

      <ul style={{ fontSize: "16px", lineHeight: "1.5", color: "#333333", paddingLeft: "20px" }}>
        <li>Book rides instantly or schedule for later</li>
        <li>Choose from multiple service tiers (Classic, Business, VIP)</li>
        <li>Track your driver in real-time</li>
        <li>Enjoy transparent, upfront pricing</li>
        <li>Earn rewards with every ride</li>
      </ul>

      <Button
        href={`${settings.baseUrl}/home`}
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
        Book Your First Ride
      </Button>

      <Text style={{ fontSize: "14px", color: "#666666", marginTop: "24px" }}>
        If you have any questions, our support team is always here to help at{" "}
        <a href={`mailto:${settings.supportEmail}`} style={{ color: "#2D0A53" }}>
          {settings.supportEmail}
        </a>
      </Text>
    </EmailLayout>
  );

  const text = `
Welcome to ${settings.appName}, ${recipient.firstName}!

We're thrilled to have you on board. With ${settings.appName}, you can book premium rides with professional chauffeurs in just a few taps.

Here's what you can do:
- Book rides instantly or schedule for later
- Choose from multiple service tiers (Classic, Business, VIP)
- Track your driver in real-time
- Enjoy transparent, upfront pricing
- Earn rewards with every ride

Book your first ride: ${settings.baseUrl}/home

If you have any questions, our support team is always here to help at ${settings.supportEmail}

© ${new Date().getFullYear()} ${settings.appName}. All rights reserved.
`;

  return {
    subject: `Welcome to ${settings.appName}!`,
    html,
    text,
  };
}
