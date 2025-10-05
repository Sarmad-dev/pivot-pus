"use client"
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const SignInForm = () => {
  const { signInForm, handleSignIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting: isLoading, errors },
  } = signInForm;

  return (
    <form onSubmit={handleSubmit(handleSignIn)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          {...register("email")}
          className={`bg-surface/50 border-border/50 focus:border-primary ${errors.email ? "border-destructive" : ""}`}
        />
        {errors.email && (
          <p className="px-1 text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
          className={`bg-surface/50 border-border/50 focus:border-primary ${errors.password ? "border-destructive" : ""}`}
        />
        {errors.password && (
          <p className="px-1 text-xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <Link
          href="#"
          className="text-primary hover:text-primary-glow transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      {errors.root && (
        <p className="px-1 text-xs text-destructive">{errors.root.message}</p>
      )}

      <Button type="submit" className="w-full btn-hero" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing In...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
};

export default SignInForm;
