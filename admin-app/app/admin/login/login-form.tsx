"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.href = "/admin";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally { setLoading(false); }
  }

  return <main className="admin-login"><Card className="w-full max-w-md border-[#dfd3c4] shadow-[0_24px_70px_rgba(58,34,20,.18)]"><CardHeader className="items-center text-center"><img src="/gambeti-logo.png" alt="Gambeti" className="mb-3 h-24 w-24 object-contain"/><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4e6bd] text-[#6f4c12]"><LockKeyhole className="size-5"/></span><CardTitle className="mt-2 text-2xl">Área administrativa</CardTitle><p className="text-sm text-muted-foreground">Entre para gerenciar os certificados.</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="username">Usuário</Label><Input id="username" autoComplete="username" required value={username} onChange={(event)=>setUsername(event.target.value)}/></div><div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event)=>setPassword(event.target.value)}/></div>{error&&<p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button type="submit" disabled={loading} className="h-11 w-full bg-[#5a3622] hover:bg-[#432718]">{loading?"Entrando...":"Entrar"}</Button><Button asChild variant="ghost" className="w-full"><a href="/">Voltar ao site</a></Button></form></CardContent></Card></main>;
}
