"use client";

import { Button } from "@ajaykumar_br/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    router.push("/");
  };

  return (
    <nav className="bg-background border-b border-border shadow-sm fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              ArcanInk
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isLoggedIn ? (
              <Button
                onClick={handleLogout}
                className="text-foreground px-3 py-2 rounded-md text-sm font-medium"
                variant="secondary"
                size="sm"
              >
                Logout
              </Button>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-green-400 hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-red-400 hover:text-white"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
