import Link from "next/link";
import { ArrowLeft, Shield, FileText, Users, MessageSquare, CreditCard, Globe, Scale } from "lucide-react";

export const metadata = {
  title: "Terms of Service | GroChurch",
  description: "Terms of Service for GroChurch.com — Pastors on Mission",
};

export default function TermsOfServicePage() {
  const lastUpdated = "March 23, 2026";

  const sections = [
    {
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      title: "1. Acceptance of Terms",
      content: `By accessing or using GroChurch.com ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. GroChurch reserves the right to update these Terms at any time, and your continued use of the Service constitutes acceptance of any modifications.`,
    },
    {
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      title: "2. Description of Service",
      content: `GroChurch is a church relationship management (CRM) platform designed for pastors and ministry leaders. The Service includes AI-powered pastoral assistance, WhatsApp integration for congregation outreach, campaign messaging, message templates, live chat inbox, smart lead management, and a ministry dashboard. GroChurch enables churches to connect with their congregation through automated and manual messaging workflows.`,
    },
    {
      icon: Shield,
      color: "text-green-600",
      bg: "bg-green-50",
      title: "3. Account Registration & Security",
      content: `To use GroChurch, you must create an account using a valid email address or Google authentication. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. GroChurch is not liable for any loss or damage arising from your failure to protect your account credentials.`,
    },
    {
      icon: CreditCard,
      color: "text-orange-600",
      bg: "bg-orange-50",
      title: "4. Subscription & Billing",
      content: `GroChurch offers a free tier with limited features and a paid "Pastor Brand" plan at $49/month billed via PayPal. By subscribing to a paid plan, you authorize recurring monthly payments. You may cancel your subscription at any time through PayPal. Cancellation takes effect at the end of the current billing period. GroChurch does not offer refunds for partial billing periods. We reserve the right to change pricing with 30 days' notice.`,
    },
    {
      icon: MessageSquare,
      color: "text-teal-600",
      bg: "bg-teal-50",
      title: "5. Acceptable Use",
      content: `You agree to use GroChurch only for lawful purposes related to church ministry and community engagement. You may not use the Service to send spam, unsolicited messages, or content that is abusive, harassing, defamatory, or otherwise objectionable. You are solely responsible for all content you send through the platform, including WhatsApp messages, campaigns, and AI-generated responses. GroChurch reserves the right to suspend or terminate accounts that violate these guidelines.`,
    },
    {
      icon: Globe,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      title: "6. Third-Party Integrations",
      content: `GroChurch integrates with third-party services including Meta (WhatsApp, Instagram, Facebook), Google, and PayPal. Your use of these integrations is subject to the respective third-party terms of service. GroChurch is not responsible for the availability, accuracy, or policies of third-party services. By connecting your WhatsApp Business Account or Instagram Professional Account, you grant GroChurch permission to send and receive messages on your behalf.`,
    },
    {
      icon: Scale,
      color: "text-rose-600",
      bg: "bg-rose-50",
      title: "7. Intellectual Property",
      content: `All content, trademarks, logos, and intellectual property displayed on GroChurch are owned by or licensed to GroChurch. You retain ownership of all content you upload or create through the Service, including congregation data and message templates. By using the Service, you grant GroChurch a limited license to process and store your content solely for the purpose of providing the Service.`,
    },
  ];

  const additionalSections = [
    {
      title: "8. AI-Generated Content",
      content: "GroChurch uses artificial intelligence to generate pastoral responses and assist with congregation engagement. While we strive for accuracy and appropriateness, AI-generated content may not always be perfect. You are responsible for reviewing and approving all AI-generated messages before they are sent to your congregation. GroChurch is not liable for any consequences arising from AI-generated content.",
    },
    {
      title: "9. Data Retention & Deletion",
      content: "Your data is retained for as long as your account is active. Upon account deletion, your personal data and congregation records will be permanently removed within 30 days, except where retention is required by law. You may request data export or deletion at any time by contacting support@grochurch.com.",
    },
    {
      title: "10. Limitation of Liability",
      content: "GroChurch is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, GroChurch shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data, revenue, or ministry opportunities.",
    },
    {
      title: "11. Termination",
      content: "GroChurch may suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination will remain in effect.",
    },
    {
      title: "12. Governing Law",
      content: "These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration in accordance with applicable arbitration rules.",
    },
    {
      title: "13. Contact Us",
      content: "If you have any questions about these Terms of Service, please contact us at support@grochurch.com.",
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
              <FileText className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Terms of Service</h1>
              <p className="text-gray-300 mt-1">Last updated: {lastUpdated}</p>
            </div>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            Please read these terms carefully before using GroChurch. By using our platform, you agree to be bound by these terms.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Icon Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 ${section.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h2>
                  <p className="text-gray-600 leading-relaxed text-[15px]">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Sections */}
        <div className="mt-8 bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {additionalSections.map((section) => (
            <div key={section.title} className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h2>
              <p className="text-gray-600 leading-relaxed text-[15px]">{section.content}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center border-t border-gray-200 pt-8 pb-4">
          <p className="text-sm text-gray-400">
            GroChurch.com — Pastors on Mission
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/privacy" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Privacy Policy
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
