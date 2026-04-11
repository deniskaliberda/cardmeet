import { RegisterForm } from "@/components/auth/register-form";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
