"use client";

import { useEffect, useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Eye, EyeOff, GraduationCap, KeyRound, Laptop } from "lucide-react";
import { PortalHeader } from "@/components/shell/PortalHeader";

function getSafePostLoginRedirect(target: string, role: string, origin: string): string | null {
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return null;

  try {
    const url = new URL(target, origin);
    if (url.origin !== origin) return null;

    const allowedRoots = role === "TEACHER" || role === "ADMIN"
      ? ["/studio", "/proctor"]
      : ["/lobby", "/exam"];
    const allowed = allowedRoots.some(
      (root) => url.pathname === root || url.pathname.startsWith(`${root}/`)
    );
    return allowed ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeRole, setActiveRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (redirectTarget.includes("studio") || redirectTarget.includes("proctor")) {
      setActiveRole("TEACHER");
    }
  }, [redirectTarget]);

  const fillDemoCredentials = (role: "STUDENT" | "TEACHER") => {
    setActiveRole(role);
    setErrorMessage(null);
    if (role === "TEACHER") {
      setEmail("teacher@openhall.edu");
      setPassword("teacher123");
    } else {
      setEmail("student@openhall.edu");
      setPassword("student123");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        const destination =
          getSafePostLoginRedirect(redirectTarget, data.user.role, window.location.origin) ||
          data.redirectUrl ||
          (data.user.role === "TEACHER" || data.user.role === "ADMIN" ? "/studio" : "/lobby");
        router.push(destination);
        router.refresh();
        return;
      }

      setErrorMessage(data?.error || "email or password not recognized. check your details and try again.");
    } catch {
      setErrorMessage("could not reach the sign-in service. check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="portal-main login-main">
      <section className="login-card portal-surface" aria-labelledby="login-title">
        <div className="login-card__intro">
          <div className="login-icon"><KeyRound aria-hidden="true" /></div>
          <p className="portal-eyebrow">account access</p>
          <h1 id="login-title">sign in</h1>
          <p>use the account provided by your school to continue to your workspace.</p>
        </div>

        {errorMessage && (
          <div className="login-alert" role="alert" aria-live="polite">
            <AlertCircle aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-field" htmlFor="login-email">
            <span>email address</span>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@school.edu"
              disabled={isLoading}
            />
          </label>

          <label className="login-field" htmlFor="login-password">
            <span>password</span>
            <span className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "hide password" : "show password"}
                aria-pressed={showPassword}
                disabled={!password || isLoading}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </span>
          </label>

          <button type="submit" className="retro-btn-green login-submit" disabled={isLoading || !email.trim() || !password}>
            {isLoading ? "signing in…" : "continue"}
            {!isLoading && <ArrowLeft className="login-submit__arrow" aria-hidden="true" />}
          </button>
        </form>

        {process.env.NODE_ENV !== "production" && (
          <details className="login-demo">
            <summary>local demo accounts</summary>
            <div className="login-demo__accounts">
              <button
                type="button"
                onClick={() => fillDemoCredentials("STUDENT")}
                className={activeRole === "STUDENT" ? "login-demo__account is-active" : "login-demo__account"}
              >
                <GraduationCap aria-hidden="true" />
                <span><b>candidate</b><small>student@openhall.edu</small></span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials("TEACHER")}
                className={activeRole === "TEACHER" ? "login-demo__account is-active" : "login-demo__account"}
              >
                <Laptop aria-hidden="true" />
                <span><b>teacher</b><small>teacher@openhall.edu</small></span>
              </button>
            </div>
            <p>demo passwords are filled into the form; use these accounts only on a local demo.</p>
          </details>
        )}

        <Link href="/" className="login-return">
          <ArrowLeft aria-hidden="true" /> return to home
        </Link>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <PortalHeader section="account access" showAuth={false} />
      <Suspense fallback={<main className="portal-main login-main"><div className="portal-surface login-loading">loading sign-in form…</div></main>}>
        <LoginForm />
      </Suspense>

      <style jsx global>{`
        .login-main { display: grid; place-items: start center; padding-top: 52px; }
        .login-card { width: min(100%, 470px); padding: 25px; }
        .login-card__intro { display: grid; justify-items: center; text-align: center; padding: 3px 10px 20px; }
        .login-icon { display: grid; width: 45px; height: 45px; margin-bottom: 13px; place-items: center; color: #2b5d78; border: 1px solid #b4c5d0; border-bottom: 2px solid #8ca3b2; border-radius: 6px; background: linear-gradient(180deg,#fff,#e9f0f4); box-shadow: inset 0 1px 0 #fff,0 1px 2px rgba(23,49,69,.08); }
        .login-icon svg { width: 20px; height: 20px; }
        .login-card__intro h1 { margin-top: 6px; color: #19354a; font-size: 28px; font-weight: 850; letter-spacing: -.045em; line-height: 1.1; }
        .login-card__intro > p:last-child { max-width: 330px; margin-top: 8px; color: #607689; font-size: 13px; line-height: 1.5; }
        .login-alert { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 15px; padding: 11px 12px; color: #7d3732; border: 1px solid #dfbdb9; border-radius: 5px; background: #fbefee; font-size: 12px; line-height: 1.45; }
        .login-alert svg { width: 16px; height: 16px; flex: 0 0 auto; margin-top: 1px; }
        .login-form { display: grid; gap: 15px; }
        .login-field { display: grid; gap: 7px; color: #3e5b70; font-size: 11px; font-weight: 800; }
        .login-field input { width: 100%; min-height: 42px; padding: 10px 12px; color: #18364b; border: 1px solid #a6b8c5; border-top-color: #8198a8; border-radius: 4px; background: #fff; box-shadow: inset 0 1px 2px rgba(19,43,62,.08); font-size: 13px; }
        .login-field input:focus { border-color: #28749a; outline: 3px solid rgba(40,116,154,.16); outline-offset: 0; }
        .login-field input::placeholder { color: #8595a1; }
        .login-field input:disabled { background: #edf1f4; }
        .login-password-wrap { position: relative; display: block; }
        .login-password-wrap input { padding-right: 44px; }
        .login-password-toggle { position: absolute; top: 50%; right: 6px; display: grid; width: 32px; height: 32px; transform: translateY(-50%); place-items: center; color: #60798c; border: 0; border-radius: 4px; background: transparent; cursor: pointer; }
        .login-password-toggle:hover:not(:disabled) { color: #244d68; background: #edf3f6; }
        .login-password-toggle:disabled { opacity: .4; }
        .login-password-toggle svg { width: 16px; height: 16px; }
        .login-submit { display: flex; justify-content: space-between; width: 100%; min-height: 43px; margin-top: 4px; padding: 0 14px; font-size: 13px; }
        .login-submit:disabled { cursor: wait; opacity: .6; }
        .login-submit__arrow { width: 16px; height: 16px; transform: rotate(180deg); }
        .login-demo { margin-top: 20px; border-top: 1px solid #d5dfe5; }
        .login-demo summary { padding: 14px 0 8px; color: #506b80; font-size: 11px; font-weight: 800; cursor: pointer; }
        .login-demo__accounts { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
        .login-demo__account { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 9px; color: #496479; border: 1px solid #c4d1da; border-radius: 4px; background: #f5f8fa; text-align: left; cursor: pointer; }
        .login-demo__account:hover,.login-demo__account.is-active { border-color: #9cb2c0; background: #fff; }
        .login-demo__account svg { width: 17px; height: 17px; flex: 0 0 auto; }
        .login-demo__account span { display: grid; min-width: 0; gap: 3px; }
        .login-demo__account b { color: #2c4d65; font-size: 10px; }
        .login-demo__account small { overflow: hidden; color: #718594; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 8px; text-overflow: ellipsis; }
        .login-demo > p { margin-top: 8px; color: #7b8c98; font-size: 10px; line-height: 1.4; }
        .login-return { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 19px; padding-top: 14px; color: #657b8c; border-top: 1px solid #d5dfe5; font-size: 11px; font-weight: 700; text-decoration: none; }
        .login-return:hover { color: #264d68; }
        .login-return svg { width: 14px; height: 14px; }
        .login-loading { width: min(100%,470px); padding: 35px; color: #607689; text-align: center; font-size: 13px; }
        @media(max-width: 540px) { .login-main { padding-top: 28px; } .login-card { padding: 19px; } }
      `}</style>
    </div>
  );
}
