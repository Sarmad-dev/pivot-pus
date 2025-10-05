import { z } from "zod";

export const signInSchema = z.object({
  email: z.email({ message: "Invalid Email Address" }),
  password: z
    .string()
    .min(8, { message: "Password should be at least 8 characters" }),
});

export const signUpSchema = z.object({
  firstName: z
    .string()
    .min(3, { message: "First Name should be at least 3 characters." }),
  lastName: z
    .string()
    .min(3, { message: "Last Name should be at least 3 characters." }),
  email: z.email({ message: "Invalid Email address" }),
  password: z
    .string()
    .min(8, { message: "Password should be at least 8 characters long." }),
});

export type SignInData = z.infer<typeof signInSchema>
export type SignUpData = z.infer<typeof signUpSchema>