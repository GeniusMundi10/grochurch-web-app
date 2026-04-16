"use client"

import React from "react"
import { Check, ExternalLink, Sparkles, Shield, Flame } from "lucide-react"
import { useUser } from "@/context/UserContext"

interface PricingPlansProps {
  onClose?: () => void
}

// ── PayPal links ──────────────────────────────────────────────────────────────
const PAYPAL_49  = "https://www.paypal.com/ncp/payment/V2V5DL6EBYTGW"
const PAYPAL_499 = "https://www.paypal.com/ncp/payment/JQGHRQ6YA39MW"
const PAYPAL_999 = "https://www.paypal.com/ncp/payment/QB4TVNK5TCW7Q"

// ── Plan definitions ──────────────────────────────────────────────────────────
const plans = [
  {
    id: "pastor_brand",
    badge: "Most Popular",
    badgeColor: "bg-orange-500 text-white",
    icon: Sparkles,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    tag: "For Every Church",
    name: "Pastor Brand",
    tagline: "Stop losing visitors. Start building a thriving congregation.",
    price: "$49",
    period: "/month",
    billing: "Billed monthly via PayPal · Cancel anytime",
    accentBorder: "border-orange-400",
    headerGradient: "brand-gradient",
    checkBg: "bg-orange-100",
    checkColor: "text-orange-600",
    ctaClass: "orange-gradient text-white hover:opacity-90",
    ctaText: "Subscribe via PayPal",
    ctaIcon: ExternalLink,
    link: PAYPAL_49,
    features: [
      { text: "AI Pastoral Assistant that responds like a caring pastor — 24/7", highlight: true },
      { text: "WhatsApp outreach campaigns to reach your whole congregation at once", highlight: false },
      { text: "Automated visitor follow-up — no new face falls through the cracks", highlight: false },
      { text: "Unlimited member contacts & ministry team seats", highlight: false },
      { text: "Pre-approved message templates for prayer, events & discipleship", highlight: false },
      { text: "Live conversation inbox to shepherd every reply personally", highlight: false },
      { text: "Smart lead tracking — see who's a guest, a regular, or a leader", highlight: false },
      { text: "GroChurch analytics dashboard — know your health at a glance", highlight: false },
      { text: "Priority support from a ministry-minded team", highlight: false },
    ],
  },
  {
    id: "scout",
    badge: "Pastoral Coaching",
    badgeColor: "bg-blue-600 text-white",
    icon: Shield,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    tag: "Churches in Transition",
    name: "Scout Plan",
    tagline: "One-on-one support to stabilise, reclaim momentum & lead with clarity.",
    price: "$499",
    period: "/month",
    billing: "Billed monthly via PayPal",
    accentBorder: "border-blue-400",
    headerGradient: "bg-gradient-to-br from-blue-800 to-blue-600",
    checkBg: "bg-blue-100",
    checkColor: "text-blue-600",
    ctaClass: "bg-blue-700 text-white hover:bg-blue-800",
    ctaText: "Enroll via PayPal",
    ctaIcon: ExternalLink,
    link: PAYPAL_499,
    features: [
      { text: "Monthly 1:1 pastoral coaching call with a seasoned ministry strategist", highlight: true },
      { text: "Crisis triage & rapid-response support for church emergencies", highlight: false },
      { text: "Sermon architecture review — structure messages that move hearts", highlight: false },
      { text: "Ministry health assessment — diagnose what's holding your church back", highlight: false },
      { text: "Custom congregant outreach strategy built around your community", highlight: false },
      { text: "Visitor-retention roadmap — turn first-time guests into committed members", highlight: false },
      { text: "Everything included in Pastor Brand", highlight: false },
    ],
  },
  {
    id: "success",
    badge: "Premium",
    badgeColor: "bg-amber-400 text-amber-900",
    icon: Flame,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    tag: "Growth-Focused Pastors",
    name: "Success Plan",
    tagline: "Weekly strategy & deep discipleship systems to multiply kingdom impact.",
    price: "$999",
    period: "/month",
    billing: "Billed monthly via PayPal",
    accentBorder: "border-amber-400",
    headerGradient: "bg-gradient-to-br from-orange-600 to-amber-500",
    checkBg: "bg-amber-100",
    checkColor: "text-amber-700",
    ctaClass: "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90",
    ctaText: "Enroll via PayPal",
    ctaIcon: ExternalLink,
    link: PAYPAL_999,
    features: [
      { text: "Weekly 1:1 coaching sessions — accountability & momentum every week", highlight: true },
      { text: "Custom 90-day church growth roadmap built for your congregation", highlight: false },
      { text: "Full preaching series development & discipleship pathway design", highlight: false },
      { text: "Multi-site & multi-campus outreach coordination", highlight: false },
      { text: "Deep analytics reviews — understand what's working & what isn't", highlight: false },
      { text: "Volunteer mobilisation strategy — equip your lay leaders to lead", highlight: false },
      { text: "Generosity campaign planning to build a sustainable giving culture", highlight: false },
      { text: "Everything included in the Scout Plan", highlight: false },
    ],
  },
]

export default function PricingPlans({ onClose }: PricingPlansProps) {
  const { user, loading: userLoading } = useUser()

  const currentPlan = user?.plan?.toLowerCase() || "free"
  const isPastorBrand =
    currentPlan === "pastor_brand" || currentPlan === "pastor brand"

  return (
    <div className="space-y-8">
      {/* ── Section header ── */}
      <div className="text-center">
        <span className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
          Pricing Plans
        </span>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
          Every church deserves tools worthy of its mission.
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
          Whether you&apos;re planting, growing, or navigating a season of change — we have
          a plan designed around where <em>your</em> church is right now.
        </p>
      </div>

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const isActive = plan.id === "pastor_brand" && isPastorBrand
          const PlanIcon = plan.icon
          const CtaIcon  = plan.ctaIcon

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 ${plan.accentBorder} shadow-sm flex flex-col overflow-hidden transition-shadow hover:shadow-md`}
            >
              {/* Badge */}
              <div className="absolute top-0 inset-x-0 flex justify-center">
                <span
                  className={`-translate-y-1/2 inline-block ${plan.badgeColor} text-xs font-bold px-4 py-1 rounded-full shadow-sm`}
                >
                  {plan.badge}
                </span>
              </div>

              {/* Header */}
              <div className={`${plan.headerGradient} px-6 pt-8 pb-6 text-center`}>
                <div className={`w-12 h-12 ${plan.iconBg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <PlanIcon className={`w-6 h-6 ${plan.iconColor}`} />
                </div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                  {plan.tag}
                </p>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-white/80 text-xs mt-2 leading-relaxed">
                  {plan.tagline}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col flex-1">
                {/* Price */}
                <div className="text-center mb-4">
                  <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm font-medium ml-1">{plan.period}</span>
                </div>
                <p className="text-center text-xs text-gray-400 mb-5">{plan.billing}</p>

                {/* Feature list — flex-1 pushes CTA to bottom */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full ${plan.checkBg} flex items-center justify-center mt-0.5`}
                      >
                        <Check className={`h-3 w-3 ${plan.checkColor} stroke-[3]`} />
                      </div>
                      <span
                        className={`text-sm leading-snug ${
                          f.highlight
                            ? "font-semibold text-gray-800"
                            : "text-gray-500"
                        }`}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isActive ? (
                  <button
                    className="w-full border-2 border-orange-300 text-orange-600 font-semibold py-3 px-6 rounded-xl bg-orange-50 cursor-default"
                    disabled
                  >
                    ✓ Currently Subscribed
                  </button>
                ) : (
                  <a
                    href={plan.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full ${plan.ctaClass} font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm`}
                  >
                    {plan.ctaText}
                    <CtaIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Trust bar ── */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
        <p className="text-sm text-gray-500 leading-relaxed">
          🔒 All plans billed securely via PayPal. No hidden fees. Cancel anytime.&nbsp;
          <a
            href="mailto:support@grochurch.com"
            className="text-orange-600 font-medium hover:underline"
          >
            Questions? Email us →
          </a>
        </p>
      </div>
    </div>
  )
}
