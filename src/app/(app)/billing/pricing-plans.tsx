"use client"

import React from "react"
import { Check, X, ExternalLink, Phone, Calendar } from "lucide-react"
import { useUser } from "@/context/UserContext"

interface PricingPlansProps {
  onClose?: () => void
}

const PAYPAL_LINK = "https://www.paypal.com/ncp/payment/V2V5DL6EBYTGW"

export default function PricingPlans({ onClose }: PricingPlansProps) {
  const { user, loading: userLoading } = useUser()

  const currentPlan = user?.plan?.toLowerCase() || "free"
  const isPastorBrand = currentPlan === "pastor_brand" || currentPlan === "pastor brand"

  const handleSubscribe = () => {
    window.open(PAYPAL_LINK, "_blank", "noopener,noreferrer")
  }

  const handleContact = () => {
    window.open("mailto:support@grochurch.com", "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-6">
      {/* Header with optional back button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-gray-500 mt-1">
            Start with Pastor Brand, or go deeper with a personal coaching tier.
          </p>
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

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* ── Pastor Brand $49 ── */}
        <div className="bg-white rounded-xl border-2 border-orange-400 shadow-md overflow-hidden flex flex-col relative">
          {/* Most Popular badge */}
          <span className="absolute top-0 inset-x-0 text-center -translate-y-full hidden" />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
              Most Popular
            </span>
          </div>

          {/* Header */}
          <div className="brand-gradient px-6 pt-8 pb-5 text-center">
            <span className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
              For Pastors
            </span>
            <h3 className="text-xl font-bold text-white mb-1">Pastor Brand</h3>
            <p className="text-gray-300 text-xs">AI-powered church outreach & growth</p>
          </div>

          <div className="p-6 flex flex-col flex-1">
            {/* Price */}
            <div className="text-center mb-4">
              <span className="text-4xl font-extrabold text-gray-900">$49</span>
              <span className="text-gray-500 text-base ml-1 font-medium">/month</span>
            </div>
            <div className="mb-5 py-2 px-3 bg-orange-50 rounded-lg border border-orange-100 text-center">
              <p className="text-xs text-orange-700 font-medium">Billed monthly via PayPal</p>
            </div>

            {/* Features */}
            <div className="space-y-2.5 mb-6 flex-1">
              {[
                "AI Pastoral Assistant — 24/7 care",
                "WhatsApp Integration & Campaigns",
                "Unlimited Contacts & Team Members",
                "Pre-approved Message Templates",
                "Live Chat Inbox",
                "Smart Lead Management",
                "GroChurch Dashboard",
                "Priority Support",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-orange-600 stroke-[3]" />
                  </div>
                  <span className="text-gray-600 text-sm leading-snug">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              className="w-full orange-gradient text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={userLoading}
              onClick={handleSubscribe}
            >
              {isPastorBrand ? (
                <>Already Subscribed — Manage on PayPal <ExternalLink className="h-4 w-4" /></>
              ) : (
                <>Subscribe via PayPal <ExternalLink className="h-4 w-4" /></>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Secure • Cancel anytime</p>
          </div>
        </div>

        {/* ── Rescue $500 ── */}
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-blue-700 px-6 py-5 text-center">
            <span className="inline-block bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
              Coaching
            </span>
            <h3 className="text-xl font-bold text-white mb-1">Rescue Plan</h3>
            <p className="text-blue-200 text-xs">Monthly 1:1 support for churches in transition</p>
          </div>

          <div className="p-6 flex flex-col flex-1">
            {/* Price */}
            <div className="text-center mb-4">
              <span className="text-4xl font-extrabold text-gray-900">$500</span>
              <span className="text-gray-500 text-base ml-1 font-medium">/month</span>
            </div>
            <div className="mb-5 py-2 px-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
              <p className="text-xs text-blue-700 font-medium">Billed monthly • Contact us to enroll</p>
            </div>

            {/* Features */}
            <div className="space-y-2.5 mb-6 flex-1">
              {[
                "Monthly 1:1 pastoral coaching call",
                "Crisis triage & emergency support",
                "Sermon architecture review",
                "Ministry health assessment",
                "Custom outreach strategy",
                "Everything in Pastor Brand",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-blue-600 stroke-[3]" />
                  </div>
                  <span className="text-gray-600 text-sm leading-snug">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              className="w-full bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
              onClick={handleContact}
            >
              <Phone className="h-4 w-4" />
              Contact Us to Enroll
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Book a discovery call first</p>
          </div>
        </div>

        {/* ── Thrive $1,000 ── */}
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-br from-orange-600 to-amber-500 px-6 py-5 text-center">
            <span className="inline-block bg-amber-400 text-orange-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
              Premium
            </span>
            <h3 className="text-xl font-bold text-white mb-1">Thrive Plan</h3>
            <p className="text-orange-100 text-xs">Full strategy & weekly coaching for growth-focused churches</p>
          </div>

          <div className="p-6 flex flex-col flex-1">
            {/* Price */}
            <div className="text-center mb-4">
              <span className="text-4xl font-extrabold text-gray-900">$1,000</span>
              <span className="text-gray-500 text-base ml-1 font-medium">/month</span>
            </div>
            <div className="mb-5 py-2 px-3 bg-orange-50 rounded-lg border border-orange-100 text-center">
              <p className="text-xs text-orange-700 font-medium">Billed monthly • Contact us to enroll</p>
            </div>

            {/* Features */}
            <div className="space-y-2.5 mb-6 flex-1">
              {[
                "Weekly 1:1 coaching sessions",
                "Full growth strategy & planning",
                "Custom 90-day ministry roadmap",
                "Multi-campus support",
                "Sermon series development",
                "Analytics deep-dives & reports",
                "Everything in Rescue Plan",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-orange-600 stroke-[3]" />
                  </div>
                  <span className="text-gray-600 text-sm leading-snug">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              onClick={handleContact}
            >
              <Calendar className="h-4 w-4" />
              Contact Us to Enroll
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Limited spots available</p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-400">
          GroChurch.com — Pastors on Mission • Questions?{" "}
          <a href="mailto:support@grochurch.com" className="underline hover:text-gray-600">
            support@grochurch.com
          </a>
        </p>
      </div>
    </div>
  )
}
