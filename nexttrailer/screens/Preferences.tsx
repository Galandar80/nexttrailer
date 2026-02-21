"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-core";
import { SEO } from "@/components/SEO";

const Preferences = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, updateUserProfile, updateUserEmail, updateUserPassword } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [loading, user, router]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) {
      toast({ title: "Inserisci un nome utente" });
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateUserProfile(displayName);
      toast({ title: "Nome utente aggiornato" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aggiornamento non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !emailPassword) {
      toast({ title: "Compila tutti i campi" });
      return;
    }
    setIsSavingEmail(true);
    try {
      await updateUserEmail(email, emailPassword);
      setEmailPassword("");
      toast({ title: "Email aggiornata" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aggiornamento non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      toast({ title: "Compila tutti i campi" });
      return;
    }
    setIsSavingPassword(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password aggiornata" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aggiornamento non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Preferenze" description="Gestisci le preferenze del tuo account" robots="noindex, nofollow" />
      <Navbar />

      <main className="max-w-screen-md mx-auto px-4 md:px-8 py-10 space-y-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Preferenze</h1>
          <p className="text-muted-foreground">Aggiorna i dati del tuo account.</p>
        </div>

        <section className="bg-secondary/20 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Nome utente</h2>
            <p className="text-sm text-muted-foreground">Modifica il nome visibile nel profilo.</p>
          </div>
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div className="space-y-2">
              <Label htmlFor="pref-display-name">Nome utente</Label>
              <Input
                id="pref-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="username"
              />
            </div>
            <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={isSavingProfile}>
              Salva nome utente
            </Button>
          </form>
        </section>

        <section className="bg-secondary/20 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Email</h2>
            <p className="text-sm text-muted-foreground">Aggiorna l&apos;indirizzo email del tuo account.</p>
          </div>
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <div className="space-y-2">
              <Label htmlFor="pref-email">Email</Label>
              <Input
                id="pref-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pref-email-password">Password attuale</Label>
              <Input
                id="pref-email-password"
                type="password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={isSavingEmail}>
              Salva email
            </Button>
          </form>
        </section>

        <section className="bg-secondary/20 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Password</h2>
            <p className="text-sm text-muted-foreground">Imposta una nuova password per l&apos;accesso.</p>
          </div>
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <Label htmlFor="pref-current-password">Password attuale</Label>
              <Input
                id="pref-current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pref-new-password">Nuova password</Label>
              <Input
                id="pref-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={isSavingPassword}>
              Salva password
            </Button>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Preferences;
