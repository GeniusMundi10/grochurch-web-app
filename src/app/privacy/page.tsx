import Link from "next/link";
import { ArrowLeft, Shield, Eye, Database, Lock, Bell, UserCheck, Globe, HardDrive, Trash2 } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | GroChurch",
  description: "Privacy Policy for GroChurch.com — How we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "March 23, 2026";

  const sections = [
    {
      icon: Eye,
      color: "text-blue-600",
      bg: "bg-blue-50",
      title: "1. Information We Collect",
      items: [
        { label: "Account Information", desc: "When you create an account, we collect your name, email address, and authentication credentials (via email/password or Google OAuth)." },
        { label: "Congregation Data", desc: "You may upload or create contact records for your congregation members, including names, phone numbers, email addresses, and custom notes." },
        { label: "Messaging Data", desc: "Messages sent and received through WhatsApp, Instagram, and our live chat are stored to provide conversation history and analytics." },
        { label: "Usage Data", desc: "We automatically collect information about how you interact with the Service, including pages visited, features used, and timestamps." },
        { label: "Payment Information", desc: "Payment processing is handled entirely by PayPal. We do not store credit card numbers or financial account details on our servers." },
      ],
    },
    {
      icon: Database,
      color: "text-purple-600",
      bg: "bg-purple-50",
      title: "2. How We Use Your Information",
      items: [
        { label: "Service Delivery", desc: "To operate, maintain, and improve the GroChurch platform, including AI-powered pastoral responses and campaign messaging." },
        { label: "Communication", desc: "To send you important service updates, security alerts, and support communications." },
        { label: "Analytics", desc: "To understand usage patterns and improve our features, user experience, and platform performance." },
        { label: "Compliance", desc: "To comply with legal obligations, enforce our Terms of Service, and prevent fraud or abuse." },
      ],
    },
    {
      icon: Lock,
      color: "text-green-600",
      bg: "bg-green-50",
      title: "3. Data Security",
      items: [
        { label: "Encryption", desc: "All data in transit is encrypted using TLS 1.2 or higher. Data at rest is encrypted using AES-256 encryption." },
        { label: "Access Controls", desc: "We implement strict role-based access controls. Only authorized personnel can access production systems." },
        { label: "Infrastructure", desc: "GroChurch is hosted on enterprise-grade cloud infrastructure (Supabase/AWS) with regular security audits and monitoring." },
        { label: "Incident Response", desc: "In the event of a data breach, we will notify affected users within 72 hours as required by applicable regulations." },
      ],
    },
    {
      icon: Globe,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      title: "4. Third-Party Services",
      items: [
        { label: "Meta (WhatsApp & Instagram)", desc: "When you connect your WhatsApp Business Account or Instagram Professional Account, Meta processes messages according to their privacy policy. We access messages through official Meta APIs." },
        { label: "Google", desc: "If you sign in with Google, we receive your name and email from Google. We do not access your Google contacts, calendar, or other data." },
        { label: "PayPal", desc: "Payment processing is handled by PayPal. Your payment data is governed by PayPal's privacy policy. We only receive transaction confirmation details." },
        { label: "Supabase", desc: "Our database and authentication infrastructure is powered by Supabase. Data is stored in compliance with SOC 2 Type II standards." },
      ],
    },
    {
      icon: UserCheck,
      color: "text-orange-600",
      bg: "bg-orange-50",
      title: "5. Your Rights",
      items: [
        { label: "Access", desc: "You can access your personal data at any time through your GroChurch dashboard or by contacting us." },
        { label: "Correction", desc: "You can update or correct your personal information through your account settings." },
        { label: "Deletion", desc: "You can request complete deletion of your account and all associated data by contacting support@grochurch.com." },
        { label: "Export", desc: "You can request a copy of your data in a portable format at any time." },
        { label: "Opt-Out", desc: "You can opt out of non-essential communications at any time through your notification settings." },
      ],
    },
    {
      icon: Bell,
      color: "text-teal-600",
      bg: "bg-teal-50",
      title: "6. AI & Automated Processing",
      items: [
        { label: "AI Responses", desc: "Our AI Pastoral Assistant uses your uploaded knowledge base and conversation context to generate responses. We do not use your congregation data to train our AI models." },
        { label: "Campaign Automation", desc: "Automated campaigns send messages based on schedules you create. You maintain full control over message content and recipient lists." },
        { label: "No Data Selling", desc: "We never sell, rent, or share your personal data or congregation data with third parties for marketing purposes." },
      ],
    },
  ];

  const additionalSections = [
    {
      icon: HardDrive,
      title: "7. Data Retention",
      content: "We retain your data for as long as your account is active. Conversation histories are retained to provide continuous service. Upon account deletion, all personal data and congregation records are permanently deleted within 30 days, except where retention is required by law. Anonymized, aggregated analytics data may be retained indefinitely.",
    },
    {
      icon: Shield,
      title: "8. Cookies & Tracking",
      content: "GroChurch uses essential cookies for authentication and session management. We do not use third-party advertising cookies or trackers. Analytics cookies are used solely to improve platform performance and user experience.",
    },
    {
      icon: Trash2,
      title: "9. Children's Privacy",
      content: "GroChurch is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take steps to delete that information.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="brand-gradient">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Privacy Policy</h1>
              <p className="text-gray-300 mt-1">Last updated: {lastUpdated}</p>
            </div>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            Your privacy matters to us. This policy explains how GroChurch collects, uses, and protects your personal information.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-5">
                <div className={`w-10 h-10 ${section.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 pt-1.5">{section.title}</h2>
              </div>
              <div className="space-y-4 ml-14">
                {section.items.map((item) => (
                  <div key={item.label}>
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">{item.label}</h3>
                    <p className="text-gray-600 text-[15px] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Additional Sections */}
          {additionalSections.map((section) => (
            <div key={section.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <section.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h2>
                  <p className="text-gray-600 leading-relaxed text-[15px]">{section.content}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Contact Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed text-[15px] mb-4">
              If you have any questions about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-sm text-gray-700 font-medium">GroChurch Support</p>
              <p className="text-sm text-gray-500 mt-1">Email: support@grochurch.com</p>
              <p className="text-sm text-gray-500">Website: grochurch.com</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center border-t border-gray-200 pt-8 pb-4">
          <p className="text-sm text-gray-400">
            GroChurch.com — Pastors on Mission
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/terms" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Terms of Service
            </Link>
            <span className="text-gray-300">•</span>
            <Link href="/auth/signin" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
