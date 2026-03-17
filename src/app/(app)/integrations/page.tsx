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
          <div className="relative overflow-hidden rounded-2xl bg-[#0f1117] p-6 sm:p-8 lg:p-10 text-white shadow-xl border border-gray-800">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/30 rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] transform -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                    <Plug2 className="w-5 h-5 text-gray-300" />
                  </div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Integrations Hub</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                  Connect Your Tools
                </h1>
                <p className="text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed">
                  Supercharge your outreach by seamlessly integrating WhatsApp. 
                  Communicate with your congregation efficiently and intuitively.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center p-5 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl min-w-[110px] shadow-inner shadow-white/5">
                  <Zap className="w-5 h-5 mb-2 text-orange-400 fill-orange-400/20" />
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">1</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">Connected</span>
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
            <span className="font-medium text-gray-400">Available Integrations:</span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700">Messaging</span>
          </div>
        </motion.div>

        {/* Integrations Grid */}
        <IntegrationsForm />
      </div>
    </div>
  );
}
