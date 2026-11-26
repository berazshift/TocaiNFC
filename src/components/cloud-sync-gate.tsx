import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Cloud, LoaderCircle, LogOut, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { replaceAll, useData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const db = supabase as any;

export function CloudSyncGate({ children }: { children: ReactNode }) {
  const { state } = useData();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
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
        const { error: saveError } = await db.from("tocainfc_user_data").upsert({
          user_id: session.user.id,
          payload: state,
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

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    setMessage(error ? error.message : "Enviamos um link de acesso para seu e-mail. Abra-o neste dispositivo para entrar.");
  };

  if (checking || (session && !hydrated)) {
    return <div className="flex min-h-screen items-center justify-center gap-3 bg-background text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" /> {checking ? "Verificando acesso..." : "Carregando seus dados..."}</div>;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Cloud className="size-6" /></div>
          <h1 className="text-2xl font-semibold tracking-tight">Acesse seu TocaiNFC</h1>
          <p className="mt-2 text-sm text-muted-foreground">Entre com seu e-mail para salvar e sincronizar vendas, clientes, estoque e configurações na nuvem.</p>
          <form onSubmit={sendMagicLink} className="mt-6 grid gap-3">
            <label htmlFor="tocainfc-email" className="text-sm font-medium">E-mail</label>
            <Input id="tocainfc-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" />
            <Button type="submit" disabled={sending}>{sending ? <LoaderCircle className="size-4 animate-spin" /> : <Mail className="size-4" />} Enviar link de acesso</Button>
          </form>
          {message ? <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
          <p className="mt-5 text-xs text-muted-foreground">Não precisa criar senha. Enviaremos um link seguro para seu e-mail.</p>
        </section>
      </main>
    );
  }

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
