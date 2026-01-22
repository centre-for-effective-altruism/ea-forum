"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { siteLoginAction, SiteLoginResult } from "@/lib/siteAuthActions";
import Type from "@/components/Type";

export default function SiteLoginPage() {
  const [state, setState] = useState<SiteLoginResult>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const router = useRouter();

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      setLoading(true);
      setState({});
      const result = await siteLoginAction(formData);
      if (result.authenticated) {
        router.push(returnTo);
      } else {
        setState(result);
        setLoading(false);
      }
    },
    [router, returnTo],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey && formRef.current) {
      formRef.current.requestSubmit();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-[400px] max-w-full">
        <Type style="sectionTitleLarge" className="mb-6 text-center">
          Site Access
        </Type>
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              autoFocus
              onKeyDown={handleKeyDown}
              className="w-full p-3 pr-12 border border-gray-300 rounded text-[16px] outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-primary text-white rounded text-[16px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Enter"}
          </button>
          {state.error && (
            <Type style="bodySmall" className="text-red-600 text-center">
              {state.error}
            </Type>
          )}
        </form>
      </div>
    </div>
  );
}
