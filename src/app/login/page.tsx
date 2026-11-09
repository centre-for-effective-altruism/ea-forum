import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import LoginPageContent from "@/components/Auth/LoginPageContent";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AnalyticsContext pageContext="loginPage">
      <div className="w-[800px] max-w-full p-10 mx-auto">
        <Suspense>
          <LoginPageContent />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
