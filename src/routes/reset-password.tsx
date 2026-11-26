import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "TocaiNFC" },
      { name: "description", content: "Crie uma nova senha para voltar a acessar sua conta do TocaiNFC." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Nova senha — TocaiNFC" },
      { property: "og:description", content: "Crie uma nova senha para voltar a acessar sua conta do TocaiNFC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    // The link from the e-mail signs the person in for recovery; without that session the link is invalid or expired.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive && session) setStatus("ready");
    });
    const timer = window.setTimeout(async () => {
      const { data: current } = await supabase.auth.getSession();
      if (alive) setStatus((value) => current.session ? "ready" : value === "ready" ? "ready" : "invalid");
    }, 1500);
    return () => { alive = false; window.clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) { setError("As senhas não são iguais."); return; }
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    toast.success("Senha criada com sucesso.");
    setStatus("done");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
        <img src="/tocainfc-symbol.svg" alt="" width={48} height={48} className="mb-5 size-12 rounded-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">Criar nova senha</h1>
        {status === "checking" ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Verificando o link...</p>
        ) : status === "invalid" ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Este link é inválido ou já expirou. Peça um novo em "Esqueci a senha" na tela de entrada.</p>
            <Button asChild className="mt-6 w-full"><Link to="/">Voltar para a entrada</Link></Button>
          </>
        ) : status === "done" ? (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sua senha foi criada!</p>
            <p>Agora volte à tela inicial do iPhone e abra o TocaiNFC pelo ícone instalado. Entre com seu e-mail e a senha que acabou de criar. Depois disso, a sessão ficará salva neste aplicativo e você não precisará abrir links do e-mail a cada acesso.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-password">Repita a nova senha</Label>
              <Input id="confirm-password" type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : null} Salvar nova senha</Button>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </form>
        )}
      </section>
    </main>
  );
}
