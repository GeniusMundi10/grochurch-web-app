import Header from "@/components/header"
import BillingInfo from "./billing-info"

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plan & Billing</h1>
        <p className="text-gray-500 mt-1">View your current plan and manage your subscription for GroChurch.</p>
      </div>
      <BillingInfo />
    </div>
  )
}
