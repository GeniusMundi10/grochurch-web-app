"use client"

import React from "react"
import { Check, X, ExternalLink } from "lucide-react"
import { useUser } from "@/context/UserContext"

interface PricingPlansProps {
  onClose?: () => void
}

const PAYPAL_LINK = "https://www.paypal.com/ncp/payment/V2V5DL6EBYTGW"

export default function PricingPlans({ onClose }: PricingPlansProps) {
  const { user, loading: userLoading } = useUser()

  const currentPlan = user?.plan?.toLowerCase() || "free"
  const isPastorBrand = currentPlan === "pastor_brand" || currentPlan === "pastor brand"

  const plan = {
    name: "Pastor Brand",
    description: "Everything your church needs to grow, connect, and reach your community through AI-powered outreach.",
    price: "$49",
    features: [
      "AI Pastoral Assistant — Responds like a caring pastor, 24/7",
      "WhatsApp Integration — Connect with your congregation on WhatsApp",
      "Campaign Messaging — Send mass messages & follow-ups",
      "Message Templates — Pre-approved templates for quick outreach",
      "Unlimited Contacts — No limits on your congregation size",
      "Unlimited Team Members — Collaborate with your ministry team",
      "Live Chat Inbox — Manage all conversations in one place",
      "Smart Lead Management — Track visitors & new members",
      "GroChurch Dashboard — Monitor engagement at a glance",
      "Priority Support — Dedicated help when you need it",
    ],
  }

  const handleSubscribe = () => {
    window.open(PAYPAL_LINK, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-gray-500 mt-1">One plan. Everything your church needs to grow and connect.</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Pricing Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden max-w-xl mx-auto card-hover">
        {/* Navy header */}
        <div className="brand-gradient px-6 py-5 text-center">
          <span className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
            For Pastors
          </span>
          <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
          <p className="text-gray-300 text-sm">{plan.description}</p>
        </div>

        <div className="p-6 sm:p-8">
          {/* Price */}
          <div className="text-center mb-6">
            <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
            <span className="text-gray-500 text-lg ml-2 font-medium">/month</span>
          </div>

          <div className="mb-6 py-2 px-4 bg-orange-50 rounded-lg border border-orange-100 text-center">
            <p className="text-sm text-orange-700 font-medium">
              Billed <span className="font-bold">$49</span> monthly via PayPal
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-orange-600 stroke-[3]" />
                </div>
                <span className="text-gray-600 text-sm leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>

          {/* Subscribe Button */}
          <button
            className="w-full orange-gradient text-white font-semibold py-3.5 px-6 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={userLoading}
            onClick={handleSubscribe}
          >
            {isPastorBrand ? (
              <>Already Subscribed — Manage on PayPal <ExternalLink className="h-4 w-4" /></>
            ) : (
              <>Subscribe Now via PayPal <ExternalLink className="h-4 w-4" /></>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3 font-medium">
            Secure payment via PayPal • Cancel anytime
          </p>
        </div>
      </div>

      {/* Footer text */}
      <div className="text-center pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-400">
          GroChurch.com — Pastors on Mission
        </p>
      </div>
    </div>
  )
}
