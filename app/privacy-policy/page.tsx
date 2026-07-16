import PolicyLayout, { PolicySection } from "@/components/legal/PolicyLayout";

export const metadata = { title: "Privacy Policy — Movo" };

const UPDATED = "July 4, 2026";

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      updatedAt={UPDATED}
      intro="Movo ('Movo', 'we', 'us') respects your privacy and is committed to protecting the personal information of our riders, chauffeurs, and website visitors. This Privacy Policy explains what information we collect, how we use it, and the rights you have over it. It applies to the Movo website, rider app, and chauffeur app."
    >
      <PolicySection title="1. Information We Collect">
        <p><strong>Customers.</strong> Name, email address, phone number, payment details (processed by our payment provider — Movo does not store full card numbers), pickup/drop-off addresses, ride history, ratings and reviews, and support communications.</p>
        <p><strong>Chauffeurs.</strong> Name, contact details, date of birth, driver's licence, vehicle registration and insurance documents, driver abstract, background/criminal record check results, banking details for payouts, vehicle and profile photographs, and onboarding documents.</p>
        <p><strong>Vehicle information.</strong> Make, model, year, licence plate, insurance policy details, and vehicle photographs, used to verify roadworthiness and match riders with the correct service tier.</p>
        <p><strong>Automatically collected information.</strong> Device identifiers, IP address, app usage data, and approximate location when the app is open.</p>
      </PolicySection>

      <PolicySection title="2. Location Tracking During Active Trips">
        <p>While a trip is active, we collect precise GPS location from the chauffeur's device to power live tracking, ETA calculation, and safety features, and share the chauffeur's live location with the rider on that trip (and vice versa is not shared — riders' location is used only to calculate pickup and fare). Location collection stops being actively used once a trip is completed, though historical trip-route data is retained as part of the ride record for safety, dispute resolution, and legal compliance purposes.</p>
      </PolicySection>

      <PolicySection title="3. Payment Processing">
        <p>Payments are processed by Stripe, a PCI-DSS Level 1 certified payment processor. Movo does not store your full card number, CVV, or bank account credentials on its own servers. If you choose to save a payment method, Stripe securely stores a tokenized reference to your card on our behalf so future bookings don't require re-entering card details; you can remove a saved card at any time from your account settings.</p>
      </PolicySection>

      <PolicySection title="4. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>To create and manage your account, and match riders with available chauffeurs</li>
          <li>To process payments, payouts, and refunds</li>
          <li>To provide real-time trip tracking, ETAs, and in-app messaging between rider and chauffeur</li>
          <li>To verify chauffeur eligibility (licensing, insurance, background checks) before activation</li>
          <li>To respond to support requests, complaints, incident reports, and lost-property claims</li>
          <li>To detect and prevent fraud, abuse, and safety incidents</li>
          <li>To comply with municipal licensing, tax, and other legal obligations</li>
        </ul>
      </PolicySection>

      <PolicySection title="5. Data Storage and Security">
        <p>Personal information is stored on encrypted, access-controlled infrastructure. Data in transit is protected with TLS encryption. Access to personal data within Movo is restricted to employees and contractors who need it to perform their role, governed by internal access controls. See our <a href="/data-security" className="underline text-gray-800">Data Security Policy</a> for further detail.</p>
      </PolicySection>

      <PolicySection title="6. Information Sharing">
        <p>We do not sell personal information. We share information only:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Between a rider and the chauffeur assigned to their trip (name, phone number, live location, vehicle details), and vice versa, strictly to facilitate the ride</li>
          <li>With service providers who process data on our behalf (payment processing, email/SMS delivery, cloud hosting), under contractual confidentiality obligations</li>
          <li>When required by law, regulation, court order, or to cooperate with a municipal licensing authority or law enforcement investigation</li>
          <li>To protect the safety of a rider, chauffeur, or the public in an emergency</li>
        </ul>
      </PolicySection>

      <PolicySection title="7. Data Retention">
        <p>We retain personal information for as long as your account is active, and for a reasonable period afterward to meet legal, tax, insurance, and dispute-resolution obligations. Specific retention periods for each data category are set out in our <a href="/data-security" className="underline text-gray-800">Data Security Policy</a>.</p>
      </PolicySection>

      <PolicySection title="8. Your Rights">
        <p>Subject to applicable law (including Canada's Personal Information Protection and Electronic Documents Act, "PIPEDA"), you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate or outdated information</li>
          <li>Withdraw consent for optional processing (e.g. marketing communications)</li>
          <li>Request deletion of your account and associated personal information, subject to records we are legally required to retain</li>
          <li>Lodge a complaint with the Office of the Privacy Commissioner of Canada if you believe your privacy rights have been violated</li>
        </ul>
        <p>To exercise any of these rights, contact <a href="mailto:support@movoprive.com" className="underline text-gray-800">support@movoprive.com</a>.</p>
      </PolicySection>

      <PolicySection title="9. Account Deletion">
        <p>You may request deletion of your account at any time from your account settings or by emailing <a href="mailto:support@movoprive.com" className="underline text-gray-800">support@movoprive.com</a>. We will delete or anonymize your personal information within a reasonable period, except for information we are required to retain for legal, tax, safety, or dispute-resolution purposes (for example, completed trip and payment records).</p>
      </PolicySection>

      <PolicySection title="10. Compliance with PIPEDA">
        <p>Movo operates in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy legislation. We are committed to the ten PIPEDA fair information principles, including accountability, consent, limited collection, limited use/disclosure/retention, accuracy, safeguards, openness, individual access, and the ability to challenge compliance.</p>
      </PolicySection>

      <PolicySection title="11. Contact Us">
        <p>Questions about this Privacy Policy can be directed to <a href="mailto:support@movoprive.com" className="underline text-gray-800">support@movoprive.com</a> or via our <a href="/contact" className="underline text-gray-800">Contact page</a>.</p>
      </PolicySection>

      <p className="text-[11px] text-gray-400 mt-10 pt-4 border-t border-gray-100">
        This policy is a template provided for operational use and should be reviewed by qualified legal counsel to confirm full compliance with PIPEDA, applicable provincial legislation, and municipal licensing requirements before final publication.
      </p>
    </PolicyLayout>
  );
}
