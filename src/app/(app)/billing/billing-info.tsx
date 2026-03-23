"use client"

import { useState, useEffect } from "react"
import PricingPlans from "./pricing-plans"
import { useUser } from "@/context/UserContext"
import { Crown, MessageSquare, Users, Sparkles, CreditCard, ArrowUpRight } from "lucide-react"

export default function BillingInfo() {
  const [showPricingPlans, setShowPricingPlans] = useState(false)
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [daysLeftInTrial, setDaysLeftInTrial] = useState(0)

  const currentPlan = user?.plan?.toLowerCase() || "free"
  const isPastorBrand = currentPlan === "pastor_brand" || currentPlan === "pastor brand"

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      if (user?.id) {
        const trialDays = typeof user?.trial_days === "number" ? user.trial_days : null
        if (trialDays !== null) {
          const daysLeft = Math.max(0, 14 - trialDays)
          setDaysLeftInTrial(daysLeft)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [user?.id])

  return (
    <>
      {showPricingPlans ? (
        <PricingPlans onClose={() => setShowPricingPlans(false)} />
      ) : (
        <div className="space-y-6">
          {loading ? (
            /* Shimmer loading state */
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 bg-gray-200 rounded w-40" />
                  <div className="h-4 bg-gray-100 rounded w-24" />
                  <div className="space-y-2 mt-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-4 bg-gray-100 rounded w-[65%]" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="stat-card">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                      <div className="h-6 bg-gray-100 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Current Plan Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Navy header bar like the GroChurch brand */}
                <div className="brand-gradient px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                      {isPastorBrand ? (
                        <Sparkles className="w-5 h-5 text-orange-400" />
                      ) : (
                        <Crown className="w-5 h-5 text-orange-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        {isPastorBrand ? "Pastor Brand" : "Free Plan"}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {isPastorBrand
                          ? "Your current plan — Empowering your ministry"
                          : "You are currently on the free plan"}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isPastorBrand
                      ? "bg-orange-500 text-white"
                      : "bg-white/20 text-white"
                  }`}>
                    {isPastorBrand ? "Active" : "Free"}
                  </span>
                </div>

                {/* Plan features */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6 text-sm text-gray-600">
                    {isPastorBrand ? (
                      <>
                        <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-orange-500" />Unlimited WhatsApp conversations</li>
                        <li className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" />Unlimited congregation contacts</li>
                        <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-purple-500" />AI Pastoral Assistant</li>
                        <li className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500" />Campaign messaging & templates</li>
                        <li className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500" />WhatsApp integration</li>
                        <li className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500" />Priority support</li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-orange-500" />100 chat messages</li>
                        <li className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" />Limited contacts</li>
                        <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-purple-500" />1 AI Agent</li>
                        <li className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500" />Basic messaging</li>
                        <li className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500" />Community support</li>
                      </>
                    )}
                  </ul>

                  {/* CTA */}
                  {!isPastorBrand && (
                    <button
                      onClick={() => setShowPricingPlans(true)}
                      className="w-full orange-gradient text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Crown className="h-4 w-4" /> Subscribe to Pastor Brand
                    </button>
                  )}
                  {isPastorBrand && (
                    <button
                      onClick={() => setShowPricingPlans(true)}
                      className="w-full border border-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" /> View Plan Details
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="stat-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> Plan
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{isPastorBrand ? "Active" : "Free"}</div>
                  <div className="text-sm text-gray-500">Plan Status</div>
                </div>

                <div className="stat-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> Price
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{isPastorBrand ? "$49" : "$0"}</div>
                  <div className="text-sm text-gray-500">Monthly Price</div>
                </div>

                <div className="stat-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                      <Crown className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> Trial
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{daysLeftInTrial}</div>
                  <div className="text-sm text-gray-500">Days Left in Free Trial</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
