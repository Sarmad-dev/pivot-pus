"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const SignUpForm = () => {
  const { signUpForm, handleSignUp } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting: isLoading, errors },
  } = signUpForm;

  return (
    <form onSubmit={handleSubmit(handleSignUp)} className="space-y-4">
      <div className="flex gap-3 flex-row items-center">
        <div className="space-y-2 flex-1">
          <Label htmlFor="firstName" className="text-foreground">
            FirstName
          </Label>
          <Input
            id="firstName"
            type="text"
            placeholder="John"
            {...register("firstName")}
            className={`bg-surface/50 border-border/50 focus:border-primary ${errors.firstName ? "border-destructive" : ""}`}
          />
          {errors.firstName && (
            <p className="px-1 text-xs text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div className="space-y-2 flex-1">
          <Label htmlFor="email" className="text-foreground">
            LastName
          </Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Doe"
            {...register("lastName")}
            className={`bg-surface/50 border-border/50 focus:border-primary ${errors.lastName ? "border-destructive" : ""}`}
          />
          {errors.lastName && (
            <p className="px-1 text-xs text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>
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

      {errors.root && (
        <p className="px-1 text-xs text-destructive">{errors.root.message}</p>
      )}

      <Button type="submit" className="w-full btn-hero" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing Up...
          </>
        ) : (
          "Sign Up"
        )}
      </Button>
    </form>
  );
};

export default SignUpForm;
