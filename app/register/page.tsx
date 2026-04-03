import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
}
