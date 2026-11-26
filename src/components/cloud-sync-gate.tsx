import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Cloud, LoaderCircle, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY, replaceAll, useData } from "@/lib/store";
import { startsEmpty } from "@/lib/account";
import { AuthScreen } from "@/components/auth-screen";

const db = supabase as any;

// Remembers which account the data on this device belongs to.
const OWNER_KEY = "tocainfc:conta";
const readOwner = () => { try { return window.localStorage.getItem(OWNER_KEY); } catch { return null; } };
const writeOwner = (id: string) => { try { window.localStorage.setItem(OWNER_KEY, id); } catch { /* storage unavailable */ } };

export function CloudSyncGate({ children }: { children: ReactNode }) {
  const { state } = useData();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const [message, setMessage] = useState("");
  const [syncState, setSyncState] = useState<"synced" | "saving" | "offline">("synced");

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setMessage("Não foi possível verificar sua sessão. Tente novamente.");
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setHydrated(false);
      setCanSync(false);
      setChecking(false);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    let cancelled = false;
    setHydrated(false);
    setCanSync(false);
    (async () => {
      const { data, error } = await db.from("tocainfc_user_data")
        .select("payload")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncState("offline");
        setMessage("Não foi possível carregar a cópia da nuvem. Seus dados locais foram preservados.");
        setCanSync(false);
        setHydrated(true);
        return;
      }
      if (data?.payload && typeof data.payload === "object") {
        replaceAll(data.payload);
      } else {
        // A new account must not inherit data another account left on this device.
        const fresh = startsEmpty(readOwner(), session.user.id);
        if (fresh) replaceAll(EMPTY);
        const { error: saveError } = await db.from("tocainfc_user_data").upsert({
          user_id: session.user.id,
          payload: fresh ? EMPTY : state,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (saveError) {
          setSyncState("offline");
          setMessage("Não foi possível enviar seus dados locais para a nuvem. Eles continuam salvos neste aparelho.");
          setCanSync(false);
        } else {
          setCanSync(true);
        }
      }
      if (!cancelled) {
        writeOwner(session.user.id);
        if (data?.payload && typeof data.payload === "object") setCanSync(true);
        setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !hydrated || !canSync) return;
    setSyncState("saving");
    const timer = window.setTimeout(async () => {
      const { error } = await db.from("tocainfc_user_data").upsert({
        user_id: session.user.id,
        payload: state,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      setSyncState(error ? "offline" : "synced");
      if (error) setMessage("Falha na sincronização. O salvamento local continua ativo e tentaremos novamente na próxima alteração.");
      else setMessage("");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [state, session?.user.id, hydrated, canSync]);

  if (checking || (session && !hydrated)) {
    return <div className="flex min-h-screen items-center justify-center gap-3 bg-background text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" /> {checking ? "Verificando acesso..." : "Carregando seus dados..."}</div>;
  }

  if (!session) return <AuthScreen />;

  return (
    <>
      <div className="flex items-center justify-between border-b bg-card px-4 py-2 text-xs text-muted-foreground md:px-8">
        <span className="flex items-center gap-2"><Cloud className="size-3.5" /> {syncState === "saving" ? "Sincronizando..." : syncState === "offline" ? "Salvo localmente · nuvem indisponível" : "Dados sincronizados na nuvem"}</span>
        <button className="inline-flex items-center gap-1.5 hover:text-foreground" onClick={() => void supabase.auth.signOut()}><LogOut className="size-3.5" /> Sair</button>
      </div>
      {message ? <p role="status" className="bg-muted px-4 py-1.5 text-center text-xs text-muted-foreground">{message}</p> : null}
      {children}
    </>
  );
}
