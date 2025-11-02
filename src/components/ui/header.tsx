"use client";

import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { usePathname } from "next/navigation";
import { ProfileButton } from "./profile-button";
import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const { authenticated, ready } = usePrivy();
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-amber-200/50 bg-amber-50/80 backdrop-blur supports-[backdrop-filter]:bg-amber-50/60">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image src="/palomito-logo.png" alt="Palomito" width={96} height={96} />
          </Link>
          {ready && authenticated && (
            <nav className="flex items-center gap-6 ml-4">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/dashboard"
                    ? "text-amber-900 font-semibold"
                    : "text-stone-700 hover:text-amber-900"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/claims"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/claims"
                    ? "text-amber-900 font-semibold"
                    : "text-stone-700 hover:text-amber-900"
                }`}
              >
                Claims
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}
