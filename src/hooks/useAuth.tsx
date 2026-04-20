import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Plan = "free" | "artist_basic" | "studio_pro";
type SubStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing" | "suspended";

interface SubscriptionInfo {
  plan: Plan;
  status: SubStatus;
  isPro: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async (userId: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      const plan = data.plan as Plan;
      const status = data.status as SubStatus;
      setSubscription({
        plan,
        status,
        isPro:
          (status === "active" || status === "trialing") &&
          (plan === "artist_basic" || plan === "studio_pro"),
      });
    } else {
      setSubscription({ plan: "free", status: "inactive", isPro: false });
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => loadSubscription(newSession.user.id), 0);
      } else {
        setSubscription(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadSubscription(existing.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshSubscription = async () => {
    if (user) await loadSubscription(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, subscription, loading, signOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
