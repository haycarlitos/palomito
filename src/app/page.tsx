"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useLanguage } from "@/contexts/language-context";
import { getTranslations } from "@/lib/translations";
import { usePrivy } from "@privy-io/react-auth";

export default function Home() {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const router = useRouter();
  const { authenticated, ready, login } = usePrivy();

  // Redirect to dashboard after login (only on home page)
  useEffect(() => {
    if (ready && authenticated) {
      // Small delay to ensure the UI has updated and authentication state is stable
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [ready, authenticated, router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100 relative overflow-hidden">
      {/* Animated Clouds */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Top section clouds */}
        <Image
          src="/cloud1.png"
          alt=""
          width={200}
          height={100}
          className="absolute top-[5%] animate-cloud-1 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={250}
          height={120}
          className="absolute top-[10%] animate-cloud-2 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={180}
          height={90}
          className="absolute top-[15%] animate-cloud-3 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={220}
          height={110}
          className="absolute top-[8%] right-0 animate-cloud-4 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={240}
          height={115}
          className="absolute top-[12%] right-0 animate-cloud-6 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Middle section clouds */}
        <Image
          src="/cloud3.png"
          alt=""
          width={200}
          height={100}
          className="absolute top-[25%] animate-cloud-7 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={230}
          height={115}
          className="absolute top-[30%] animate-cloud-8 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={210}
          height={105}
          className="absolute top-[35%] right-0 animate-cloud-9 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={260}
          height={130}
          className="absolute top-[28%] animate-cloud-10 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Lower middle section clouds */}
        <Image
          src="/cloud1.png"
          alt=""
          width={190}
          height={95}
          className="absolute top-[45%] animate-cloud-11 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={220}
          height={110}
          className="absolute top-[50%] animate-cloud-12 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={240}
          height={120}
          className="absolute top-[55%] right-0 animate-cloud-13 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={200}
          height={100}
          className="absolute top-[48%] animate-cloud-14 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Bottom section clouds */}
        <Image
          src="/cloud2.png"
          alt=""
          width={250}
          height={125}
          className="absolute top-[65%] animate-cloud-15 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={180}
          height={90}
          className="absolute top-[70%] animate-cloud-16 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={220}
          height={110}
          className="absolute top-[75%] right-0 animate-cloud-17 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={230}
          height={115}
          className="absolute top-[68%] animate-cloud-18 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Very bottom section clouds */}
        <Image
          src="/cloud3.png"
          alt=""
          width={200}
          height={100}
          className="absolute top-[85%] animate-cloud-19 opacity-[0.98] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={240}
          height={120}
          className="absolute top-[90%] animate-cloud-20 opacity-[0.97] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Additional clouds with varied opacities */}
        {/* High opacity clouds (100%, 98%) */}
        <Image
          src="/cloud2.png"
          alt=""
          width={200}
          height={100}
          className="absolute top-[3%] animate-cloud-21 opacity-100 cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={230}
          height={115}
          className="absolute top-[7%] right-0 animate-cloud-22 opacity-100 cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={190}
          height={95}
          className="absolute top-[18%] animate-cloud-23 opacity-100 cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={220}
          height={110}
          className="absolute top-[22%] right-0 animate-cloud-24 opacity-[0.99] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Medium-high opacity clouds (95%, 96%) */}
        <Image
          src="/cloud3.png"
          alt=""
          width={210}
          height={105}
          className="absolute top-[32%] animate-cloud-25 opacity-[0.95] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={250}
          height={125}
          className="absolute top-[38%] right-0 animate-cloud-26 opacity-[0.96] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={180}
          height={90}
          className="absolute top-[42%] animate-cloud-27 opacity-[0.95] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={240}
          height={120}
          className="absolute top-[52%] right-0 animate-cloud-28 opacity-[0.96] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Medium opacity clouds (92%, 93%) */}
        <Image
          src="/cloud1.png"
          alt=""
          width={200}
          height={100}
          className="absolute top-[58%] animate-cloud-29 opacity-[0.92] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={230}
          height={115}
          className="absolute top-[62%] right-0 animate-cloud-30 opacity-[0.93] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={210}
          height={105}
          className="absolute top-[72%] animate-cloud-31 opacity-[0.92] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={190}
          height={95}
          className="absolute top-[78%] right-0 animate-cloud-32 opacity-[0.93] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Lower opacity clouds (88%, 90%) */}
        <Image
          src="/cloud2.png"
          alt=""
          width={220}
          height={110}
          className="absolute top-[20%] animate-cloud-33 opacity-[0.90] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={200}
          height={100}
          className="absolute top-[40%] animate-cloud-34 opacity-[0.88] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={240}
          height={120}
          className="absolute top-[60%] right-0 animate-cloud-35 opacity-[0.90] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={180}
          height={90}
          className="absolute top-[80%] animate-cloud-36 opacity-[0.88] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={220}
          height={110}
          className="absolute top-[88%] right-0 animate-cloud-37 opacity-[0.90] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        
        {/* Lowest opacity clouds (85%, 86%) */}
        <Image
          src="/cloud1.png"
          alt=""
          width={210}
          height={105}
          className="absolute top-[13%] animate-cloud-38 opacity-[0.85] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={250}
          height={125}
          className="absolute top-[33%] right-0 animate-cloud-39 opacity-[0.86] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud3.png"
          alt=""
          width={190}
          height={95}
          className="absolute top-[53%] animate-cloud-40 opacity-[0.85] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud1.png"
          alt=""
          width={230}
          height={115}
          className="absolute top-[73%] right-0 animate-cloud-41 opacity-[0.86] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
        <Image
          src="/cloud2.png"
          alt=""
          width={200}
          height={100}
          className="absolute top-[93%] animate-cloud-42 opacity-[0.85] cloud-shadow"
          style={{ filter: 'brightness(0.92) contrast(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}
          priority
        />
      </div>

      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 lg:py-12 relative z-10">
        {/* Hero Section */}
        <section className="text-center mb-16 lg:mb-24">
          <div className="max-w-4xl mx-auto">
            {/* Palomito Pet */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Image 
                  src="/palomito.png" 
                  alt="Palomito el palomo vaquero" 
                  width={200} 
                  height={200}
                  className="drop-shadow-lg animate-bounce-slow"
                />
              </div>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-teal-600 bg-clip-text text-transparent">Palomito</span>
            </h1>
            <p className="text-2xl sm:text-3xl text-stone-700 mb-8 leading-relaxed font-medium">
              {t.hero.tagline}
            </p>
            <p className="text-lg text-stone-600 mb-10 max-w-2xl mx-auto">
              {t.hero.description}
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => {
                // Only proceed if Privy is ready
                if (!ready) {
                  return;
                }
                
                // Explicitly check authentication state
                if (authenticated === true) {
                  router.push("/buy");
                } else {
                  // Not authenticated or authentication state unknown - trigger login
                  login();
                }
              }}
            >
              {t.hero.cta}
            </Button>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16 lg:mb-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-stone-800">
              {t.howItWorks.title}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm text-center">
                <div className="text-4xl mb-4">{t.howItWorks.step1.emoji}</div>
                <h3 className="text-xl font-semibold mb-3 text-stone-800">{t.howItWorks.step1.title}</h3>
                <p className="text-stone-600">
                  {t.howItWorks.step1.description}
                </p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm text-center">
                <div className="text-4xl mb-4">{t.howItWorks.step2.emoji}</div>
                <h3 className="text-xl font-semibold mb-3 text-stone-800">{t.howItWorks.step2.title}</h3>
                <p className="text-stone-600">
                  {t.howItWorks.step2.description}
                </p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm text-center">
                <div className="text-4xl mb-4">{t.howItWorks.step3.emoji}</div>
                <h3 className="text-xl font-semibold mb-3 text-stone-800">{t.howItWorks.step3.title}</h3>
                <p className="text-stone-600">
                  {t.howItWorks.step3.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-16 lg:mb-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-stone-800">
              {t.testimonials.title}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 ring-1 ring-amber-200/50 shadow-sm">
                <p className="text-stone-700 mb-4 italic">
                  &ldquo;{t.testimonials.testimonial1.text}&rdquo;
                </p>
                <p className="text-sm font-semibold text-stone-800">— {t.testimonials.testimonial1.author}</p>
                <p className="text-xs text-stone-600">{t.testimonials.testimonial1.subname}</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 ring-1 ring-amber-200/50 shadow-sm">
                <p className="text-stone-700 mb-4 italic">
                  &ldquo;{t.testimonials.testimonial2.text}&rdquo;
                </p>
                <p className="text-sm font-semibold text-stone-800">— {t.testimonials.testimonial2.author}</p>
                <p className="text-xs text-stone-600">{t.testimonials.testimonial2.subname}</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 ring-1 ring-amber-200/50 shadow-sm">
                <p className="text-stone-700 mb-4 italic">
                  &ldquo;{t.testimonials.testimonial3.text}&rdquo;
                </p>
                <p className="text-sm font-semibold text-stone-800">— {t.testimonials.testimonial3.author}</p>
                <p className="text-xs text-stone-600">{t.testimonials.testimonial3.subname}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mb-12">
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-amber-50 via-orange-50/50 to-teal-50/30 rounded-xl p-12 ring-1 ring-amber-200/50 backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-4 text-stone-800">{t.cta.title}</h2>
            <p className="text-stone-600 mb-8 text-lg">
              {t.cta.description}
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => {
                // Only proceed if Privy is ready
                if (!ready) {
                  return;
                }
                
                // Explicitly check authentication state
                if (authenticated === true) {
                  router.push("/buy");
                } else {
                  // Not authenticated or authentication state unknown - trigger login
                  login();
                }
              }}
            >
              {t.cta.button}
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-200/50 bg-amber-50/30 relative z-10">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center text-sm text-stone-600">
          <div>{t.footer.madeBy}</div>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <Link href="/dashboard" className="hover:text-amber-900 transition-colors">
              {t.footer.dashboard}
            </Link>
            <Link href="/claims" className="hover:text-amber-900 transition-colors">
              {t.footer.claims}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
