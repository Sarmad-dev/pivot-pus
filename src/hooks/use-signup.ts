"use client";

import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface SignupData {
  email: string;
  password: string;
  name?: string;
}

interface UseSignupOptions {
  onSuccess?: (userProfileId: string) => void;
  onError?: (error: string) => void;
}

export function useSignup(options: UseSignupOptions = {}) {
  const { signIn } = useAuthActions();
  const createUserProfile = useMutation(api.users.createUserProfileAfterSignup);

  const signup = async (data: SignupData) => {
    try {
      // First, sign up the user using Convex auth
      await signIn("password", {
        email: data.email,
        password: data.password,
        flow: "signUp",
      });

      // After successful signup, create the user profile
      const userProfileId = await createUserProfile({
        name: data.name,
        email: data.email,
      });

      toast.success("Account created successfully!", {
        description: "Welcome! Your account has been set up.",
      });

      options.onSuccess?.(userProfileId);
      return userProfileId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      
      toast.error("Signup failed", {
        description: errorMessage,
      });

      options.onError?.(errorMessage);
      throw error;
    }
  };

  return {
    signup,
  };
}