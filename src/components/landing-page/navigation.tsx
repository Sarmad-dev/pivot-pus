import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";
import { useConvexAuth } from "convex/react";

const Navigation = () => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  return (
    <nav className="fixed top-0 w-full z-50 glass-strong border-b border-border/30">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-gradient">PivotPulse</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="#testimonials"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Testimonials
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </Link>
            {!isLoading && isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="btn-ghost">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/auth/sign-in">
                <Button variant="outline" size="sm" className="btn-ghost">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
