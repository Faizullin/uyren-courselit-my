"use client";

import { useProfile } from "@/components/contexts/profile-context";
import { useSiteInfo } from "@/components/contexts/site-info-context";
import { useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  UserCircle,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Header() {
  const { t, i18n } = useTranslation("common");
  const { siteInfo } = useSiteInfo();
  const { profile } = useProfile();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState(i18n.language || "en");

  const navigationItems = [
    { name: t("nav_home"), href: "/" },
    { name: t("nav_about"), href: "/about" },
    { name: t("nav_courses"), href: "/courses" },
    { name: t("nav_grants"), href: "/grants" },
    // { name: t("nav_community"), href: "/community" },
    { name: t("nav_sponsorship"), href: "/sponsorship" },
  ];

  const languages = [
    { code: "en-US", label: "EN" },
    { code: "ru", label: "RU" },
    // { code: "kz", label: "KZ" },
  ];

  const handleNavigation = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (href === pathname) return;
      router.push(href);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLang(lng);
    setLangOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle click outside to close user menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
      toast({
        title: "Signed out successfully",
        description: "You have been logged out",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Sign out error",
        description: "There was an issue signing out. Please try again.",
        variant: "destructive",
      });
    }
    setUserMenuOpen(false);
  };

  const isAuthenticated = status === "authenticated" && session?.user;

  return (
    <header className="bg-background shadow-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Branding
            title={siteInfo?.title || "Uyren Academy"}
            subtitle={siteInfo?.subtitle}
            icon={
              siteInfo?.logo?.url ? (
                <Image
                  src={siteInfo.logo.url}
                  alt={siteInfo.logo.caption || siteInfo.title || "Logo"}
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <span className="text-white font-bold text-lg">U</span>
              )
            }
            onClick={handleNavigation}
          />

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4 lg:space-x-8">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavigation(item.href, e)}
                  className={cn(
                    "relative py-2 px-1 text-gray-700 text-sm transition-all duration-300 hover:text-brand-primary group",
                    isActive ? "font-bold text-brand-primary" : "font-medium",
                  )}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary transform transition-transform duration-300" />
                  )}
                  {!isActive && (
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-primary transform transition-all duration-300 group-hover:w-full" />
                  )}
                </Link>
              );
            })}

            {/* Language selector */}
            <div className="relative">
              <Button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-md"
              >
                {languages.find((l) => l.code === currentLang)?.label}
                <ChevronDown className="w-4 h-4" />
              </Button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border rounded-md shadow-lg z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className="w-full text-left px-3 py-2 hover:bg-brand-primary hover:text-white rounded-md"
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Get Started */}

            {/* Get Started */}
            {!isAuthenticated ? (
              <Link
                href="/auth/sign-in"
                onClick={(e) => handleNavigation("/auth/sign-in", e)}
              >
                <Button className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-105">
                  {t("nav_get_started")}
                </Button>
              </Link>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-md text-muted-foreground hover:text-brand-primary hover:bg-accent transition-colors duration-200"
                >
                  {profile?.avatar?.file ? (
                    <Image
                      src={profile.avatar.file}
                      alt={profile.name || "User Avatar"}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-8 h-8 text-brand-primary" />
                  )}
                  <span className="font-medium text-foreground">
                    {profile?.name || session?.user?.name || "User"}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-md shadow-lg py-1 z-50">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-muted-foreground hover:text-brand-primary hover:bg-accent"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 inline mr-2" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-red-500 hover:bg-accent"
                    >
                      <LogOut className="w-4 h-4 inline mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 transition-transform duration-300 rotate-90" />
            ) : (
              <Menu className="h-6 w-6 transition-transform duration-300" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "lg:hidden border-t overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="flex flex-col space-y-2 py-4">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavigation(item.href, e)}
                  className={cn(
                    "block py-2 px-2 transition-all duration-200 rounded-md",
                    isActive
                      ? "text-brand-primary font-bold bg-orange-50 border-l-4 border-brand-primary pl-4"
                      : "text-gray-700 hover:text-brand-primary hover:bg-orange-50/50 font-medium",
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
            {/* 
            <div className="flex items-center justify-between py-2 px-2">
              <span className="text-gray-700 font-medium">{t("nav_theme")}</span>
              <ThemeToggle />
            </div> */}

            {/* Mobile language selector */}
            <div className="flex items-center justify-between py-2 px-2">
              <span className="text-gray-700 font-medium">
                {t("nav_language")}
              </span>
              <select
                value={currentLang}
                onChange={(e) => changeLanguage(e.target.value)}
                className="border rounded px-2 py-1 text-gray-700"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {!isAuthenticated ? (
              <Link
                href="/auth/sign-in"
                onClick={(e) => handleNavigation("/auth/sign-in", e)}
              >
                <Button className="w-full mt-4 bg-brand-primary hover:bg-brand-primary-hover text-white py-2 rounded-lg font-medium transition-all duration-300">
                  {t("nav_get_started")}
                </Button>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                onClick={(e) => handleNavigation("/dashboard", e)}
              >
                <Button className="w-full mt-4 bg-brand-primary hover:bg-brand-primary-hover text-white py-2 rounded-lg font-medium transition-all duration-300">
                  {t("nav_dashboard")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

const Branding = (props: {
  onClick: (href: string, e: React.MouseEvent) => void;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}) => {
  return (
    <Link
      href="/"
      className="flex items-center space-x-3 group transition-all duration-300"
      onClick={(e) => props.onClick("/", e)}
    >
      <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-full flex items-center justify-center transition-transform duration-300">
        <span className="text-white font-bold text-lg">{props.icon}</span>
      </div>
      <div>
        <div className="text-lg font-bold text-gray-900">{props.title}</div>
        <div className="text-xs text-brand-primary">{props.subtitle}</div>
      </div>
    </Link>
  );
};
