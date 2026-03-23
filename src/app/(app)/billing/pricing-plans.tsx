"use client"

import React from "react"
import { Button } from "@/components/ui/button"
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
    <div className="min-h-[80vh] w-full bg-gradient-to-b from-orange-50/50 to-white dark:from-gray-950 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto text-center mb-12 relative">
        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          Empower Your Ministry
        </h2>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          One plan. Everything your church needs to grow and connect.
        </p>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="max-w-lg mx-auto">
        <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-gray-800 overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
          {/* Top accent bar */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-orange-500 to-amber-500" />

          <div className="p-8 sm:p-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  {plan.description}
                </p>
              </div>
              <span className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full border border-orange-100 dark:border-orange-800 uppercase tracking-wide shrink-0 ml-4">
                For Pastors
              </span>
            </div>

            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {plan.price}
              </span>
              <span className="text-slate-500 text-lg ml-2 font-medium">
                /month
              </span>
            </div>

            <div className="mb-8 p-3 bg-orange-50/50 dark:bg-orange-950/30 rounded-lg border border-orange-100 dark:border-orange-900 text-center">
              <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                Billed <span className="font-bold">$49</span> monthly via PayPal
              </p>
            </div>

            <div className="space-y-4 mb-10">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mt-0.5">
                    <Check className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 stroke-[3]" />
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all duration-200 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white border-0"
              disabled={userLoading}
              onClick={handleSubscribe}
            >
              {isPastorBrand ? (
                <span className="flex items-center gap-2">
                  Already Subscribed — Manage on PayPal
                  <ExternalLink className="h-4 w-4" />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Subscribe Now via PayPal
                  <ExternalLink className="h-4 w-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400 mt-4 font-medium">
              Secure payment via PayPal • Cancel anytime
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-16 text-center border-t border-slate-100 dark:border-gray-800 pt-12">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Trusted by Pastors & Churches Worldwide
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          GroChurch.com — Pastors on Mission
        </p>
      </div>
    </div>
  )
}
