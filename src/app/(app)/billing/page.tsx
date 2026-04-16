import BillingInfo from "./billing-info"
import PricingPlans from "./pricing-plans"

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plan & Billing</h1>
        <p className="text-gray-500 mt-1">View your current plan and manage your subscription for GroChurch.</p>
      </div>
      <BillingInfo />
      <div className="border-t border-gray-100 pt-8">
        <PricingPlans />
      </div>
    </div>
  )
}
