"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/utils/validation";
import { useAppDispatch, useAppSelector } from "@/store";
import { login, clearThrottle } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleSignInButton } from "@/components/auth/GoogleSignIn";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { getSafeRedirectUrl } from "@/utils/auth";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading, throttleSeconds } = useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleSuccessRedirect = () => {
    let target = searchParams?.get("redirect");
    if (!target && typeof window !== "undefined") {
      target = sessionStorage.getItem("redirect_after_login");
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("redirect_after_login");
    }
    const destination = getSafeRedirectUrl(target, "/dashboard");
    router.push(destination);
  };

  useEffect(() => {
    if (throttleSeconds && throttleSeconds > 0) {
      setCountdown(throttleSeconds);
    }
  }, [throttleSeconds]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    return () => {
      setCountdown(null);
      dispatch(clearThrottle());
    };
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await dispatch(login(data)).unwrap();
      toast.success("Successfully logged in!");
      setCountdown(null);
      handleSuccessRedirect();
    } catch (error: any) {
      const status = error?.status;
      const retryAfter = error?.retryAfter;
      if (status === 429 || retryAfter) {
        const secs = retryAfter || 60;
        setCountdown(secs);
      }
      toast.error(error?.message || (typeof error === "string" ? error : "Login failed"));
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-12">
        <span className="text-xs text-white/40 font-light tracking-[0.3em] uppercase block mb-6">
          Welcome Back
        </span>
      
      </div>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-xs text-white/60 font-light tracking-wider uppercase mb-3"
          >
            Email Address
          </label>
          <Input
            {...register("email")}
            type="email"
            id="email"
            placeholder="your@email.com"
            className="w-full bg-transparent border border-white/10 text-white placeholder-white/30 px-4 py-3 font-light focus:border-white/30 focus:outline-none transition-colors duration-300"
          />
          {errors.email && (
            <p className="mt-2 text-xs text-red-400 font-light">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs text-white/60 font-light tracking-wider uppercase mb-3"
          >
            Password
          </label>
          <div className="relative">
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Enter your password"
              className="w-full bg-transparent border border-white/10 text-white placeholder-white/30 px-4 py-3 pr-12 font-light focus:border-white/30 focus:outline-none transition-colors duration-300"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-white/40 hover:text-white/60 transition-colors" />
              ) : (
                <Eye className="h-4 w-4 text-white/40 hover:text-white/60 transition-colors" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-2 text-xs text-red-400 font-light">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-white/40 font-light cursor-pointer">
            <input
              id="remember-me"
              type="checkbox"
              {...register("rememberMe")}
              className="w-4 h-4 border border-white/10 bg-transparent rounded cursor-pointer"
            />
            Remember me for 30 days
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-white/40 hover:text-white font-light transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading || (countdown !== null && countdown > 0)}
          aria-disabled={isLoading || (countdown !== null && countdown > 0)}
          className="group w-full px-10 py-4 text-base font-light rounded-full bg-white text-black hover:bg-white/90 transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Signing in...
            </>
          ) : countdown !== null && countdown > 0 ? (
            <span aria-live="polite">
              Too many attempts. Retry in {countdown}s
            </span>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-500" />
            </>
          )}
        </Button>
        {countdown !== null && countdown > 0 && (
          <div role="alert" aria-live="polite" className="mt-2 text-xs text-amber-400 font-light text-center">
            Rate limit reached. Submit re-enables in {countdown} second{countdown === 1 ? '' : 's'}.
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-black text-white/40 font-light tracking-wider uppercase">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-6">
          <GoogleSignInButton
            onSuccess={handleSuccessRedirect}
            onError={(error) => console.error(error)}
            className="w-full px-10 py-4 text-base font-light rounded-full border border-white/10 text-black hover:text-white hover:border-white/20 transition-all duration-500"
          />
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-white/40 font-light">
          Don't have an account?{" "}
          <Link
            href="/auth/register"
            className="text-white hover:text-white/80 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
