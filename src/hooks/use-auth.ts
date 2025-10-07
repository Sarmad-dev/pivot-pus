"use client";
import { signUpSchema } from "./../lib/validations/auth";
import { SignInData, signInSchema, SignUpData } from "@/lib/validations/auth";
import { useAuthActions } from "@convex-dev/auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const useAuth = () => {
  const { signIn, signOut } = useAuthActions();
  const router = useRouter();

  const signInForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const handleSignIn = async (data: SignInData) => {
    try {
      await signIn("password", {
        email: data.email,
        password: data.password,
        flow: "signIn",
      });

      router.push("/dashboard");
    } catch (error) {
      if (error instanceof Error) console.error(error.message);
      signInForm.setError("root", {
        message: "Invalid Email or Password",
      });
    }
  };

  const handleSignUp = async (data: SignUpData) => {
    try {
      // Sign up the user using Convex auth - profile will be created automatically
      await signIn("password", {
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
        flow: "signUp",
      });

      toast.success("Account created successfully!", {
        description: "Welcome! Your account has been set up.",
      });

      router.push("/dashboard");
    } catch (error) {
      if (error instanceof Error) console.error(error.message);

      toast.error("Signup failed", {
        description:
          error instanceof Error
            ? error.message
            : "Cannot create an account, Please try again later",
      });

      signUpForm.setError("root", {
        message: "Cannot create an account, Please try again later",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      if (error instanceof Error) console.error(error.message);
    }
  };

  return {
    signInForm,
    signUpForm,
    handleSignIn,
    handleSignUp,
    handleSignOut,
  };
};
