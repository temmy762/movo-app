import PolicyLayout, { PolicySection } from "@/components/legal/PolicyLayout";

export const metadata = { title: "Chauffeur Independent Contractor Agreement — Movo Privé" };

const UPDATED = "July 4, 2026";

export default function ChauffeurAgreementPage() {
  return (
    <PolicyLayout
      title="Chauffeur Independent Contractor Agreement"
      updatedAt={UPDATED}
      intro="This Agreement governs the relationship between Movo Privé and chauffeurs who accept rides through the Movo platform. Every chauffeur must read and electronically sign this Agreement as part of onboarding, before their account is activated."
    >
      <PolicySection title="1. Independent Contractor Status">
        <p>You are engaged as an independent contractor, not as an employee, worker, partner, or agent of Movo Privé. Nothing in this Agreement creates an employment relationship. You are free to accept or decline any ride request and to determine your own working hours.</p>
      </PolicySection>

      <PolicySection title="2. Driver Obligations">
        <p>You agree to hold a valid driver's licence appropriate to the vehicle and service tier you operate, comply with all traffic and licensing laws, and drive safely and courteously at all times while active on the platform.</p>
      </PolicySection>

      <PolicySection title="3. Vehicle Standards">
        <p>Your vehicle must meet the age, condition, and equipment standards for your registered service tier, pass any inspection Movo requires, and be kept clean and in safe mechanical condition. You must promptly update your vehicle profile if you change vehicles.</p>
      </PolicySection>

      <PolicySection title="4. Professional Appearance">
        <p>You agree to maintain a neat, professional appearance consistent with Movo's premium chauffeur brand while providing rides.</p>
      </PolicySection>

      <PolicySection title="5. Customer Service Expectations">
        <p>You agree to treat every customer courteously and professionally, follow reasonable customer requests, and represent the Movo brand positively throughout every trip.</p>
      </PolicySection>

      <PolicySection title="6. Confidentiality">
        <p>You agree to keep customer personal information (contact details, addresses, ride history, and any information disclosed during a trip) confidential, and to use it only for the purpose of providing the ride.</p>
      </PolicySection>

      <PolicySection title="7. Insurance Responsibilities">
        <p>You are solely responsible for maintaining valid commercial/ride-hail insurance coverage that meets or exceeds the minimum required in your operating jurisdiction, for the full duration of your activity on the platform, and for providing proof of coverage upon request.</p>
      </PolicySection>

      <PolicySection title="8. Payment Process">
        <p>You will be paid the net fare (gross fare less Movo's disclosed platform commission) for each completed trip. Earnings are credited to your in-app wallet and become available for withdrawal to your linked bank account after the standard settlement period.</p>
      </PolicySection>

      <PolicySection title="9. Suspension and Termination">
        <p>Movo may suspend or terminate your access to the platform for safety concerns, confirmed complaints, expired or invalid documentation, fraudulent activity, or breach of this Agreement, the Terms & Conditions, or Movo policies. You may deactivate your account and stop accepting rides at any time.</p>
      </PolicySection>

      <PolicySection title="10. Compliance with Movo Policies">
        <p>You agree to comply with all applicable Movo policies referenced in this Agreement, including the Terms & Conditions, Data Security Policy, Complaints Policy, and Lost & Found Policy, as they may be updated from time to time.</p>
      </PolicySection>

      <PolicySection title="11. Electronic Signature">
        <p>By clicking "I Agree and Sign" during onboarding, you electronically sign this Agreement, and Movo records the date, time, and IP address of your acceptance. Your account will remain in Pending Review status until an administrator manually reviews and approves your application, including verification of all required documents.</p>
      </PolicySection>

      <p className="text-[11px] text-gray-400 mt-10 pt-4 border-t border-gray-100">
        This Agreement is a template and should be reviewed by qualified legal counsel — particularly the independent-contractor classification, which carries specific requirements under provincial employment and tax law — before final publication.
      </p>
    </PolicyLayout>
  );
}
