"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { APP_NAME, BRAND_LOGO } from "@/lib/brand";
export function AccessForm({ entryId }: { entryId?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="access-page">
      <div className="access-art">
        <div className="access-brand">
          <Image
            src={BRAND_LOGO}
            alt="Tequila El Tequileño"
            width={600}
            height={600}
            className="access-logo"
            preload
          />
        </div>
        <div className="access-heading">
          <p className="eyebrow">CONNECTED PLANS. CLEARER DAYS.</p>
          <h1>
            Good things
            <br />
            start with
            <br />
            <em>a plan.</em>
          </h1>
          <p>
            One shared calendar for market visits, Casa Salles, Canadian events,
            and provincial tender calls.
          </p>
        </div>
        <div className="access-foot">CANADA ↔ TEQUILA</div>
      </div>
      <div className="access-main">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/session", {
                method: "POST",
                body: JSON.stringify({ email }),
              });
              router.replace(entryId ? `/?entry=${entryId}` : "/");
              router.refresh();
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Unable to enter the workspace.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="access-icon">
            <Mail size={25} />
          </span>
          <p className="eyebrow">YOUR PLANNING WORKSPACE</p>
          <h2>
            Welcome to
            <br />
            {APP_NAME}.
          </h2>
          <p>Enter an email approved for this workspace.</p>
          <label className="field">
            <span>Approved email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Opening workspace…" : "Open calendar"}
            <ArrowRight size={16} />
          </Button>
        </form>
      </div>
    </main>
  );
}
