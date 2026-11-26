import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup" | "forgot";
type Notice = { kind: "error" | "info"; text: string };

const friendly = (message: string) => {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(message)) return "Este e-mail já tem uma conta. Entre ou redefina a senha.";
  if (/at least 6/i.test(message)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit|too many/i.test(message)) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  return message;
};

const copy: Record<Mode, { title: string; text: string; action: string }> = {
  signin: { title: "Entre no TocaiNFC", text: "Acesse suas vendas, clientes, estoque e metas em qualquer aparelho.", action: "Entrar" },
  signup: { title: "Crie sua conta", text: "Cadastre-se para guardar e sincronizar seus dados de vendas.", action: "Criar conta" },
  forgot: { title: "Redefinir senha", text: "Informe seu e-mail e enviaremos um link para criar uma nova senha.", action: "Enviar link" },
};

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const change = (next: Mode) => { setMode(next); setNotice(null); setPassword(""); };
  const fail = (message: string) => setNotice({ kind: "error", text: friendly(message) });
  const info = (text: string) => setNotice({ kind: "info", text });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy("form");
    setNotice(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error) fail(error.message);
    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: address, password, options: { emailRedirectTo: window.location.origin },
      });
      if (error) fail(error.message);
      else if (data.user && data.user.identities?.length === 0) fail("already registered");
      else if (!data.session) info("Conta criada. Enviamos um e-mail de confirmação: abra o link para ativar e entrar.");
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) fail(error.message);
      else info("Se houver uma conta com este e-mail, o link para criar a nova senha já está a caminho.");
    }
    setBusy(null);
  };

  const oauth = async (provider: "google" | "lovable") => {
    setBusy(provider);
    setNotice(null);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if ("error" in result && result.error) fail(result.error instanceof Error ? result.error.message : String(result.error));
    setBusy(null);
  };

  const magicLink = async () => {
    const address = email.trim();
    if (!address) { fail("Informe seu e-mail para receber o link de acesso."); return; }
    setBusy("magic");
    setNotice(null);
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo: window.location.origin } });
    if (error) fail(error.message);
    else info("Enviamos um link de acesso para seu e-mail. Abra-o neste aparelho para entrar.");
    setBusy(null);
  };

  const text = copy[mode];
  const spinner = <LoaderCircle className="size-4 animate-spin" />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
        <img src="/tocainfc-symbol.svg" alt="" width={48} height={48} className="mb-5 size-12 rounded-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">{text.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.text}</p>

        {mode !== "forgot" ? (
          <>
            <div className="mt-6 grid gap-2">
              <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void oauth("google")}>
                {busy === "google" ? spinner : <span aria-hidden className="font-bold">G</span>} Continuar com Google
              </Button>
              <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void oauth("lovable")}>
                {busy === "lovable" ? spinner : <span aria-hidden>♥</span>} Continuar com Lovable
              </Button>
            </div>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou com e-mail <span className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : <div className="mt-6" />}

        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="auth-email">E-mail</Label>
            <Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" />
          </div>
          {mode !== "forgot" ? (
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password">Senha</Label>
                {mode === "signin" ? (
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => change("forgot")}>Esqueci a senha</button>
                ) : null}
              </div>
              <Input id="auth-password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "Mínimo de 6 caracteres" : "Sua senha"} />
            </div>
          ) : null}
          <Button type="submit" disabled={busy !== null}>{busy === "form" ? spinner : null} {text.action}</Button>
          {mode === "signin" ? (
            <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => void magicLink()}>
              {busy === "magic" ? spinner : <Mail className="size-4" />} Entrar com link por e-mail, sem senha
            </Button>
          ) : null}
        </form>

        {notice ? (
          <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-4 text-sm ${notice.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>{notice.text}</p>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>Ainda não tem conta? <button type="button" className="font-semibold text-primary hover:underline" onClick={() => change("signup")}>Criar conta</button></>
          ) : (
            <>Já tem conta? <button type="button" className="font-semibold text-primary hover:underline" onClick={() => change("signin")}>Entrar</button></>
          )}
        </p>
      </section>
    </main>
  );
}
