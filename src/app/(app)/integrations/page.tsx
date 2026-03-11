"use client";

import React from "react";
import Header from "@/components/header";
import IntegrationsForm from "./integrations-form";
import { motion } from "framer-motion";
import { Zap, Plug2 } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Integrations"
        description="Connect third-party tools to super-charge your church workflow."
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-6 sm:p-8 lg:p-10 text-white shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Plug2 className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-white/80 uppercase tracking-wider">Integrations Hub</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-3">
                  Connect Your Tools
                </h1>
                <p className="text-base sm:text-lg text-white/90 max-w-2xl leading-relaxed">
                  Supercharge your outreach by connecting with WhatsApp, CRMs, and messaging platforms. 
                  Communicate with your members more effectively.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center p-4 bg-white/10 backdrop-blur-sm rounded-xl min-w-[100px]">
                  <Zap className="w-5 h-5 mb-1.5 text-yellow-300" />
                  <span className="text-2xl font-bold">1</span>
                  <span className="text-xs text-white/70">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Integration Categories Hint */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">Available:</span>
            <span className="px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium border border-green-100 dark:border-green-800">Messaging</span>
          </div>
        </motion.div>

        {/* Integrations Grid */}
        <IntegrationsForm />
      </div>
    </div>
  );
}
