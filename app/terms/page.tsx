import PolicyLayout, { PolicySection } from "@/components/legal/PolicyLayout";

export const metadata = { title: "Terms & Conditions — Movo Privé" };

const UPDATED = "July 4, 2026";

export default function TermsPage() {
  return (
    <PolicyLayout
      title="Terms & Conditions"
      updatedAt={UPDATED}
      intro="These Terms & Conditions govern your use of the Movo Privé platform, whether as a customer booking a ride or a chauffeur providing one. By creating an account, you agree to be bound by these Terms."
    >
      <h2 className="text-[20px] font-extrabold text-gray-900 mb-4 mt-2">Part A — Customer Terms</h2>

      <PolicySection title="A.1 Booking Conditions">
        <p>A booking is confirmed once payment has been authorized and a chauffeur has accepted your request. Fare estimates shown at booking are calculated from distance, duration, and the applicable service tier's pricing, plus taxes and applicable fees — the final charge reflects your actual trip, including any additional stops.</p>
      </PolicySection>

      <PolicySection title="A.2 Cancellation Policy">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Cancelling within 5 minutes of booking, or before a chauffeur has been assigned, is free — you receive a full refund.</li>
          <li>Cancelling after a chauffeur has accepted and more than 5 minutes have passed may incur a partial charge to compensate the chauffeur for their time and travel.</li>
          <li>If a chauffeur cancels after accepting, or fails to respond, you are never charged for that cancellation — Movo automatically finds you another chauffeur or issues a full refund.</li>
        </ul>
      </PolicySection>

      <PolicySection title="A.3 No-Show Policy">
        <p>If a chauffeur arrives at the pickup location and the customer is not present or reachable within a reasonable waiting period, the ride may be marked a no-show and cancellation charges may apply, in addition to any waiting-time charges already accrued.</p>
      </PolicySection>

      <PolicySection title="A.4 Waiting Time Charges">
        <p>A complimentary waiting period applies at pickup (see current rate in your fare breakdown). Waiting time beyond that period is billed per minute at the rate shown at checkout and disclosed in the Admin pricing configuration.</p>
      </PolicySection>

      <PolicySection title="A.5 Fare Estimates">
        <p>Fare estimates are calculated in real time from your pickup, destination, selected service tier, and current pricing configuration, and are shown before you confirm payment. Estimates may change if you add stops, change your destination, or if actual trip conditions (traffic, route) differ from the estimate; you will always see the updated breakdown before any additional charge is applied.</p>
      </PolicySection>

      <PolicySection title="A.6 Payment Authorization">
        <p>By booking a ride, you authorize Movo to charge your selected payment method for the full fare, including base fare, applicable fees, taxes, and any in-trip additions (such as stops) at the time they occur. Saved payment methods may be charged for such in-trip additions without requiring you to re-enter card details, consistent with your prior authorization.</p>
      </PolicySection>

      <PolicySection title="A.7 User Responsibilities">
        <p>You agree to provide accurate pickup/destination information, treat chauffeurs and their vehicles with respect, and comply with any reasonable safety instructions given during a trip.</p>
      </PolicySection>

      <PolicySection title="A.8 Prohibited Behaviour">
        <p>Harassment, threats, violence, discrimination, property damage, smoking in vehicles (unless permitted by the chauffeur), and any illegal activity during a trip are strictly prohibited and may result in account suspension or termination, and referral to law enforcement where appropriate.</p>
      </PolicySection>

      <PolicySection title="A.9 Limitation of Liability">
        <p>Movo Privé is a platform connecting riders with independent chauffeurs. To the maximum extent permitted by law, Movo's liability for any claim arising from use of the platform is limited to the amount paid for the ride giving rise to the claim. Movo is not liable for indirect, incidental, or consequential damages.</p>
      </PolicySection>

      <PolicySection title="A.10 Refund Policy">
        <p>Refunds are issued automatically according to the cancellation policy above, or manually by our support team where a service issue is confirmed (e.g. a ride that never occurred, a billing error, or a resolved complaint). Refunds are returned to the original payment method and may take 5–10 business days to appear on your statement.</p>
      </PolicySection>

      <PolicySection title="A.11 Service Availability">
        <p>Movo Privé operates subject to chauffeur availability in your area and service hours may vary by region. We do not guarantee that a ride will always be available on demand, particularly for Movo Safe Ride, which requires two chauffeurs.</p>
      </PolicySection>

      <h2 className="text-[20px] font-extrabold text-gray-900 mb-4 mt-10">Part B — Chauffeur Terms</h2>

      <PolicySection title="B.1 Independent Contractor Relationship">
        <p>Chauffeurs providing rides through the Movo platform are independent contractors, not employees, agents, or partners of Movo Privé. Chauffeurs control their own schedule, choose whether to accept a given ride request, and are responsible for their own tax obligations.</p>
      </PolicySection>

      <PolicySection title="B.2 Vehicle Requirements">
        <p>Vehicles used on the platform must meet the make/model/age and condition requirements for the service tier applied for, pass any required inspection, and be maintained in safe, clean, roadworthy condition throughout the chauffeur's activity on the platform.</p>
      </PolicySection>

      <PolicySection title="B.3 Insurance Requirements">
        <p>Chauffeurs must maintain valid commercial/ride-hail insurance coverage meeting or exceeding the minimum required by the jurisdiction they operate in, and must provide proof of insurance during onboarding and upon renewal.</p>
      </PolicySection>

      <PolicySection title="B.4 Professional Conduct">
        <p>Chauffeurs are expected to maintain a professional appearance, treat every customer with courtesy and respect, drive safely and lawfully, and represent the Movo brand appropriately at all times while active on the platform.</p>
      </PolicySection>

      <PolicySection title="B.5 Document Verification">
        <p>Chauffeurs must submit a valid driver's licence, vehicle registration, proof of insurance, a driver abstract, a criminal record check, and (where applicable to the service offered) a vulnerable sector / child abuse registry check, along with vehicle and profile photographs, before activation.</p>
      </PolicySection>

      <PolicySection title="B.6 Suspension and Termination">
        <p>Movo may suspend or terminate a chauffeur's account for safety concerns, repeated low ratings without resolution, confirmed complaints, expired documentation, fraudulent activity, or violation of these Terms or the Chauffeur Agreement. Chauffeurs may also deactivate their account at any time.</p>
      </PolicySection>

      <PolicySection title="B.7 Payment Terms">
        <p>Chauffeurs are paid the agreed net fare (fare less Movo's platform commission, disclosed in the pricing configuration for each service tier) for completed trips. Earnings settle to the chauffeur's wallet after a standard settlement period and may be withdrawn to a linked bank account, subject to the payout process described in the app.</p>
      </PolicySection>

      <PolicySection title="B.8 Ratings Requirements">
        <p>Chauffeurs are rated by customers after every trip and are expected to maintain a reasonable average rating. Chauffeurs whose ratings fall persistently below the platform's minimum threshold may be subject to review, additional training, or suspension.</p>
      </PolicySection>

      <PolicySection title="B.9 Compliance with Local Regulations">
        <p>Chauffeurs are solely responsible for holding any municipal or provincial licence, permit, or registration required to provide for-hire transportation in their operating area, and for complying with all applicable traffic, licensing, and tax laws.</p>
      </PolicySection>

      <p className="text-[11px] text-gray-400 mt-10 pt-4 border-t border-gray-100">
        This document is a template provided for operational use and should be reviewed by qualified legal counsel before final publication, particularly the limitation-of-liability and independent-contractor provisions, which vary by jurisdiction.
      </p>
    </PolicyLayout>
  );
}
