import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { EmailTemplateContext } from "../../types";

interface EmailLayoutProps {
  context: EmailTemplateContext;
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ context, preview, children }: EmailLayoutProps) {
  const { settings } = context;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Img
              src={settings.logoUrl}
              width="60"
              height="60"
              alt={settings.appName}
              style={logo}
            />
            <Text style={logoText}>{settings.appName}</Text>
          </Section>

          {/* Content */}
          <Section style={contentSection}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footerSection}>
            <Text style={footerText}>
              © {new Date().getFullYear()} {settings.appName}. All rights reserved.
            </Text>
            <Text style={footerLinks}>
              <Link href={`mailto:${settings.supportEmail}`} style={link}>
                Support
              </Link>
              {" | "}
              <Link href={settings.baseUrl} style={link}>
                movoprive.com
              </Link>
            </Text>
            <Text style={supportText}>
              Need help? Contact us at{" "}
              <Link href={`mailto:${settings.supportEmail}`} style={link}>
                {settings.supportEmail}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "100%",
  maxWidth: "600px",
};

const logoSection = {
  padding: "20px",
  textAlign: "center" as const,
};

const logo = {
  display: "block",
  margin: "0 auto",
  border: "0",
  outline: "none",
  textDecoration: "none",
};

const logoText = {
  textAlign: "center" as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: "18px",
  fontWeight: "700" as const,
  color: "#131936",
  letterSpacing: "3px",
  margin: "6px 0 0",
};

const contentSection = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "40px 32px",
  margin: "0 20px",
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "32px 20px",
};

const footerSection = {
  padding: "0 20px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#666666",
  fontSize: "14px",
  margin: "8px 0",
};

const footerLinks = {
  color: "#666666",
  fontSize: "12px",
  margin: "8px 0",
};

const supportText = {
  color: "#666666",
  fontSize: "12px",
  margin: "16px 0 0",
};

const link = {
  color: "#2D0A53",
  textDecoration: "none",
};

// Re-export commonly used components
export { Heading, Text, Link, Hr, Section, Button } from "@react-email/components";
