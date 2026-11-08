import { register } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return <AuthForm mode="register" action={register} />;
}
