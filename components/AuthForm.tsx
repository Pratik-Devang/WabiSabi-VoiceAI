"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type AuthMode = "signin" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignIn = mode === "signin";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    window.setTimeout(() => {
      setIsLoading(false);
      router.push("/voice");
    }, 1500);
  }

  return (
    <div className="flex min-h-[580px] flex-col justify-center bg-[#131318] px-6 py-9 sm:px-12 md:rounded-l-[24px]">
      <div className="mb-10">
        <div className="mb-16 text-2xl font-extrabold tracking-tight text-[#A3E635]">
          Vox
        </div>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-white">
          {isSignIn ? "Welcome back!" : "Create your account"}
        </h1>
        <p className="mt-3 text-[13px] leading-[1.6] text-[#6B6B7B]/75">
          {isSignIn
            ? "Pick up where you left off, and keep things moving."
            : "Start your voice workspace and keep every conversation flowing."}
        </p>
      </div>

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        {!isSignIn && (
          <AuthInput
            id="fullName"
            label="Full name"
            type="text"
            placeholder="Ada Lovelace"
          />
        )}

        <AuthInput
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
        />

        <PasswordInput
          id="password"
          label="Password"
          placeholder="********"
          showPassword={showPassword}
          onToggleShow={() => setShowPassword((current) => !current)}
        />

        {!isSignIn && (
          <PasswordInput
            id="confirmPassword"
            label="Confirm password"
            placeholder="********"
            showPassword={showPassword}
            onToggleShow={() => setShowPassword((current) => !current)}
          />
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            className="text-sm font-medium text-[#A3E635] transition hover:text-[#BEF264] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#84CC16]"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="group flex h-12 w-full items-center justify-center rounded-xl bg-[#84CC16] text-sm font-semibold text-white transition duration-300 hover:bg-[#65A30D] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A3E635] disabled:cursor-not-allowed disabled:opacity-80"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
          ) : isSignIn ? (
            <span>
              Log in{" "}
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-[3px] group-hover:underline">
                →
              </span>
            </span>
          ) : (
            <span>
              Create account{" "}
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-[3px] group-hover:underline">
                →
              </span>
            </span>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-xs font-medium text-[#6B6B7B]">or</span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <button
        type="button"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-transparent text-sm font-semibold text-white transition hover:bg-white/[0.04] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#84CC16]"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      <p className="mt-8 text-center text-sm text-[#8E8EA0]">
        {isSignIn ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => setMode(isSignIn ? "signup" : "signin")}
          className="font-semibold text-[#A3E635] transition hover:text-[#BEF264] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#84CC16]"
        >
          {isSignIn ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

function AuthInput({
  id,
  label,
  type,
  placeholder
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="sr-only">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/[0.08] border-l-2 border-l-transparent bg-[#1A1A21] px-4 text-sm text-white outline-none transition duration-300 placeholder:text-[#6B6B7B] focus:border-white/[0.08] focus:border-l-[#84CC16]"
      />
    </label>
  );
}

function PasswordInput({
  id,
  label,
  placeholder,
  showPassword,
  onToggleShow
}: {
  id: string;
  label: string;
  placeholder: string;
  showPassword: boolean;
  onToggleShow: () => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="sr-only">{label}</span>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-white/[0.08] border-l-2 border-l-transparent bg-[#1A1A21] px-4 pr-16 text-sm text-white outline-none transition duration-300 placeholder:text-[#6B6B7B] focus:border-white/[0.08] focus:border-l-[#84CC16]"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8E8EA0] transition hover:text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#84CC16]"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
