"use client";
import GoogleButton from "@/components/auth/oauth/google-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { ReactNode } from "react";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background font-inter flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
              <span className="text-background font-bold">P</span>
            </div>
            <span className="text-2xl font-bold text-gradient">PivotPulse</span>
          </Link>
          <p className="text-muted-foreground mt-2">
            {pathname.includes("/sign-in")
              ? "Welcome back to your campaign intelligence platform"
              : "Create your account to get start using PivotPulse"}
          </p>
        </div>

        <Card className="glass-strong border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              Sign In
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Google Sign In */}
            <GoogleButton />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email Sign In Form */}
            {children}

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href={
                  pathname.includes("/sign-in")
                    ? "/auth/sign-up"
                    : "/auth/sign-in"
                }
                className="text-primary hover:text-primary-glow transition-colors font-medium"
              >
                {pathname.includes("/sign-in") ? "Create account" : "Sign In"}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthLayout;
