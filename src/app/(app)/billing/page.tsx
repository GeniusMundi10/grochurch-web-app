import Header from "@/components/header"
import BillingInfo from "./billing-info"

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header 
        title="Plan & Billing" 
        description="View your current plan and manage your subscription for GroChurch."
        showTitleInHeader={false}
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <BillingInfo />
      </div>
    </div>
  )
}
