import type { Metadata } from "next";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = { title: "Inloggen" };
export default function SignInPage() {
  return <SignInForm />;
}
