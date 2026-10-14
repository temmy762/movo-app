import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout, footerSection, footerLinks, footerText, link } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

const NAVY = "#131936";

const STEPS = [
  {
    title: "Enter your trip details",
    body: "Add your pickup location and destination, choose your service tier, and book now or schedule for later.",
  },
  {
    title: "Meet your chauffeur",
    body: "Once assigned, check your chauffeur’s details and track their arrival. Confirm their identity before starting your trip.",
  },
  {
    title: "Sit back and enjoy your trip",
    body: "Follow your trip in real time, with your fare shown before booking.",
  },
];

export function riderWelcomeTemplate(context: EmailTemplateContext): EmailTemplateResult {
  const { settings } = context;
  const bookUrl  = `${settings.baseUrl}/home`;
  const helpUrl  = `${settings.baseUrl}/home/help`;
  const termsUrl = `${settings.baseUrl}/terms`;
  const privUrl  = `${settings.baseUrl}/privacy-policy`;
  const unsubUrl = `mailto:${settings.supportEmail}?subject=Unsubscribe`;

  const preview = "Where will you go next? Booking with MOVO is just a few taps away.";

  const footer = (
    <Section style={footerSection}>
      <Text style={footerLinks}>
        <Link href={helpUrl} style={link}>Help</Link>{" | "}
        <Link href={termsUrl} style={link}>Terms</Link>{" | "}
        <Link href={privUrl} style={link}>Privacy</Link>{" | "}
        <Link href={unsubUrl} style={link}>Unsubscribe</Link>
      </Text>
      <Text style={footerText}>© {new Date().getFullYear()} {settings.appName}. All rights reserved.</Text>
    </Section>
  );

  const html = render(
    <EmailLayout context={context} preview={preview} animatedLogo footer={footer}>
      <Heading style={{ color: NAVY, fontSize: "26px", margin: "0 0 4px" }}>Welcome to MOVO</Heading>
      <Text style={{ color: "#555555", fontSize: "17px", margin: "0 0 20px" }}>Where will you go next?</Text>

      <Text style={{ fontSize: "16px", lineHeight: "1.6", color: "#333333", margin: "0 0 24px" }}>
        We’re excited to have you on board. Whether you need a ride around the city or a chauffeur
        to drive you and your vehicle home, booking with MOVO is just a few taps away.
      </Text>

      <Button
        href={bookUrl}
        style={{
          backgroundColor: NAVY,
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: "8px",
          textDecoration: "none",
          display: "inline-block",
          fontSize: "16px",
          fontWeight: "600",
        }}
      >
        Book Your First Ride
      </Button>

      <Heading as="h2" style={{ color: NAVY, fontSize: "19px", margin: "36px 0 12px" }}>Getting started is simple</Heading>
      {STEPS.map((s, i) => (
        <Section key={s.title} style={{ margin: "0 0 16px" }}>
          <Text style={{ fontSize: "16px", fontWeight: "700", color: "#111111", margin: "0 0 4px" }}>
            {i + 1}. {s.title}
          </Text>
          <Text style={{ fontSize: "15px", lineHeight: "1.55", color: "#444444", margin: "0" }}>{s.body}</Text>
        </Section>
      ))}

      <Heading as="h2" style={{ color: NAVY, fontSize: "19px", margin: "28px 0 8px" }}>Earn rewards as you go</Heading>
      <Text style={{ fontSize: "15px", lineHeight: "1.55", color: "#444444", margin: "0" }}>
        Earn rewards with your rides and make your next trip even more rewarding.
      </Text>

      <Text style={{ fontSize: "15px", lineHeight: "1.55", color: "#444444", margin: "28px 0 0" }}>
        Need a hand? We’re here to help.
        <br />
        <Link href={`mailto:${settings.supportEmail}`} style={{ color: NAVY, fontWeight: "600" }}>{settings.supportEmail}</Link>
      </Text>

      <Text style={{ fontSize: "15px", color: "#333333", margin: "24px 0 0", fontWeight: "600" }}>The MOVO Team</Text>
    </EmailLayout>
  );

  const text = `Welcome to MOVO

Where will you go next?

We’re excited to have you on board. Whether you need a ride around the city or a chauffeur to drive you and your vehicle home, booking with MOVO is just a few taps away.

Book Your First Ride: ${bookUrl}

Getting started is simple

${STEPS.map((s, i) => `${i + 1}. ${s.title}\n${s.body}`).join("\n\n")}

Earn rewards as you go
Earn rewards with your rides and make your next trip even more rewarding.

Need a hand? We’re here to help.
${settings.supportEmail}

The MOVO Team

Help: ${helpUrl} | Terms: ${termsUrl} | Privacy: ${privUrl} | Unsubscribe: ${unsubUrl}
`;

  return {
    subject: "Welcome to MOVO",
    html,
    text,
  };
}
