"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Mic2,
  ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";

const bars = [18, 27, 22, 39, 31, 49, 36, 56, 42, 62, 34, 48, 40, 55, 35, 47];

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@gmail.com");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    window.localStorage.setItem(
      "vox_account",
      JSON.stringify({ email, name: "Alex Morgan" })
    );
    window.setTimeout(() => router.push("/workspace"), 650);
  }

  return (
    <main className="voice-login-page">
      <section className="voice-login-shell">
        <aside className="voice-login-visual">
          <div className="grid-pattern" />

          <div className="voice-brand">
            <span><AudioLines size={19} /></span>
            <div><strong>Vox</strong><small>Voice AI workspace</small></div>
          </div>

          <div className="voice-copy">
            <div className="system-pill"><i /> Voice node ready</div>
            <h1>
              Conversations
              <br />
              that <em>flow</em>
              <br />
              naturally.
            </h1>
            <p>
              A focused voice workspace for natural, real-time conversations
              with your AI assistant.
            </p>
            <div className="voice-signal" aria-hidden="true">
              {bars.map((height, index) => (
                <i
                  key={index}
                  className={index === 8 ? "active" : ""}
                  style={{ height }}
                />
              ))}
            </div>
          </div>

          <div className="voice-stats">
            <div><strong>24/7</strong><span>Available</span></div>
            <div><strong>Live</strong><span>Voice response</span></div>
            <div><strong>Secure</strong><span>Private session</span></div>
          </div>
        </aside>

        <section className="voice-login-panel">
          <form className="voice-login-form" onSubmit={handleSubmit}>
            <div className="mic-tile"><Mic2 size={23} /></div>
            <p className="voice-eyebrow">Secure access</p>
            <h2>Welcome back.</h2>
            <p className="voice-intro">Sign in to access your Voice AI account.</p>

            <label>
              <span>Email</span>
              <div className="voice-field">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="voice-field">
                <LockKeyhole size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  defaultValue="admin"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <div className="voice-trust">
              <label><input type="checkbox" defaultChecked /> Keep me signed in</label>
              <button type="button">Forgot password?</button>
            </div>

            <button className="voice-primary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Enter voice workspace"}
              {!loading && <ArrowRight size={17} />}
            </button>

            <div className="voice-security">
              <ShieldCheck size={14} /> Private and encrypted session
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
