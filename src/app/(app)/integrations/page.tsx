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
