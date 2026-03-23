"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import PricingPlans from "./pricing-plans"
import { useUser } from "@/context/UserContext"
import { Badge } from "@/components/ui/badge"
import { Shimmer } from "@/components/ui/shimmer"
import { Crown, ArrowRight, BarChart2, Calendar, MessageSquare, CreditCard, Users, Sparkles } from "lucide-react"

export default function BillingInfo() {
  const [showPricingPlans, setShowPricingPlans] = useState(false)
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [daysLeftInTrial, setDaysLeftInTrial] = useState(0)

  // Derive plan info from user context
  const currentPlan = user?.plan?.toLowerCase() || "free"
  const isPastorBrand = currentPlan === "pastor_brand" || currentPlan === "pastor brand"

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      if (user?.id) {
        // Calculate trial days
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
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Shimmer className="h-5 w-40" />
                      <Shimmer className="h-4 w-24" />
                    </div>
                    <Shimmer className="h-8 w-24 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Shimmer key={i} className="h-4 w-[70%]" />
                  ))}
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Plan Status", "Messages", "Trial Days"].map((_, i) => (
                  <Card key={i} className="shadow-sm">
                    <CardContent className="py-4">
                      <Shimmer className="h-4 w-24 mb-2" />
                      <Shimmer className="h-6 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Current Plan */}
              <Card className="shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {isPastorBrand ? "Pastor Brand" : "Free Plan"}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {isPastorBrand
                          ? "Your current plan — Empowering your ministry"
                          : "You are currently on the free plan"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPastorBrand ? (
                        <Badge variant="outline" className="bg-white dark:bg-gray-900 border-orange-200 text-orange-700">
                          <Sparkles className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-2 mb-6 text-sm">
                    {isPastorBrand ? (
                      <>
                        <li className="flex items-center"><MessageSquare className="h-4 w-4 mr-2 text-orange-600" />Unlimited WhatsApp conversations</li>
                        <li className="flex items-center"><Users className="h-4 w-4 mr-2 text-blue-600" />Unlimited congregation contacts</li>
                        <li className="flex items-center"><Crown className="h-4 w-4 mr-2 text-purple-600" />AI Pastoral Assistant</li>
                        <li className="flex items-center"><ArrowRight className="h-4 w-4 mr-2 text-slate-600" />Campaign messaging &amp; templates</li>
                        <li className="flex items-center"><ArrowRight className="h-4 w-4 mr-2 text-slate-600" />WhatsApp integration</li>
                        <li className="flex items-center"><ArrowRight className="h-4 w-4 mr-2 text-slate-600" />Priority support</li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center"><MessageSquare className="h-4 w-4 mr-2 text-orange-600" />100 chat messages</li>
                        <li className="flex items-center"><Users className="h-4 w-4 mr-2 text-blue-600" />Limited contacts</li>
                        <li className="flex items-center"><Crown className="h-4 w-4 mr-2 text-purple-600" />1 AI Agent</li>
                        <li className="flex items-center"><ArrowRight className="h-4 w-4 mr-2 text-slate-600" />Basic messaging</li>
                        <li className="flex items-center"><ArrowRight className="h-4 w-4 mr-2 text-slate-600" />Community support</li>
                      </>
                    )}
                  </ul>

                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="shadow-none border">
                      <CardContent className="py-4">
                        <div className="text-xs text-muted-foreground">Plan Status</div>
                        <div className="text-xl font-semibold">
                          {isPastorBrand ? "Active" : "Free"}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none border">
                      <CardContent className="py-4">
                        <div className="text-xs text-muted-foreground">Monthly Price</div>
                        <div className="text-xl font-semibold">
                          {isPastorBrand ? "$49" : "$0"}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none border">
                      <CardContent className="py-4">
                        <div className="text-xs text-muted-foreground">Days left in Free Trial</div>
                        <div className="text-xl font-semibold">{daysLeftInTrial}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!isPastorBrand && (
                      <Button
                        onClick={() => setShowPricingPlans(true)}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                      >
                        <Crown className="h-4 w-4 mr-2" /> Subscribe to Pastor Brand
                      </Button>
                    )}
                    {isPastorBrand && (
                      <Button
                        onClick={() => setShowPricingPlans(true)}
                        variant="outline"
                        className="flex-1"
                      >
                        <CreditCard className="h-4 w-4 mr-2" /> View Plan Details
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </>
  )
}
