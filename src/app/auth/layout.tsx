import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-orange-500 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full bg-orange-400 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="https://grochurch.com" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" opacity="0.3"/>
                <path d="M12 1L1 6.5V17c0 6.11 4.23 11.81 9.9 13.2.7.17 1.5.17 2.2 0C18.77 28.81 23 23.11 23 17V6.5L12 1zm0 2.18l9 4.5V17c0 5.06-3.5 9.77-9 11.17C6.5 26.77 3 22.06 3 17V7.68l9-4.5z"/>
                <rect x="11" y="8" width="2" height="8" fill="white"/>
                <rect x="8" y="11" width="8" height="2" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-xl">GroChurch</div>
              <div className="text-orange-300 text-xs">Pastors@Risk™ Platform</div>
            </div>
          </Link>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Rescue. Renew.<br />
              <span className="text-orange-400">Re-Launch.</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              A safe, confidential, and founder-led pathway for pastors to find clarity, care, and courage.
            </p>
          </div>

          {/* Dr. Steve Quote */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-orange-400">
                <Image
                  src="/images/dr-steve-1.jpg"
                  alt="Dr. Steve"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-gray-200 text-sm italic leading-relaxed">
                  &ldquo;Every pastor deserves access to tools, teachings, and methods that provide the possibility for spiritual renewal and revival.&rdquo;
                </p>
                <div className="mt-2">
                  <div className="text-white font-semibold text-sm">Dr. Steve Bonenberger, Ph.D.</div>
                  <div className="text-orange-300 text-xs">Founder & Lead Coach</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">1,000+</div>
              <div className="text-gray-400 text-xs">Pastors Restored</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">30+</div>
              <div className="text-gray-400 text-xs">Years Experience</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">100k</div>
              <div className="text-gray-400 text-xs">Community Members</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-gray-500 text-xs">
            © 2026 GroChurch. All rights reserved. |{" "}
            <Link href="https://grochurch.com" className="text-gray-400 hover:text-white">
              grochurch.com
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href="https://grochurch.com" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                <rect x="11" y="8" width="2" height="8" fill="white"/>
                <rect x="8" y="11" width="8" height="2" fill="white"/>
              </svg>
            </div>
            <div className="text-gray-900 font-bold text-xl">GroChurch</div>
          </Link>
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
