
import { Search, User as UserIcon, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/auth-core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useWatchlistStore();
  const { items: libraryItems } = useLibraryStore();
  const { user, canAccess, signInWithGoogle, signInWithEmail, signUpWithEmail, sendVerificationEmail, resendVerificationWithEmail, resetPassword, logout } = useAuth();
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const watchlistCount = items.length;
  const libraryCount = libraryItems.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({ title: "Compila email e password" });
      return;
    }
    setAuthLoading(true);
    try {
      await signInWithEmail(loginEmail, loginPassword);
      setAuthOpen(false);
      setLoginEmail("");
      setLoginPassword("");
      toast({ title: "Accesso effettuato" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Accesso non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!registerUsername || !registerEmail || !registerPassword) {
      toast({ title: "Compila tutti i campi" });
      return;
    }
    setAuthLoading(true);
    try {
      await signUpWithEmail(registerUsername, registerEmail, registerPassword);
      setAuthOpen(false);
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      toast({ title: "Registrazione completata", description: "Controlla la tua email per la conferma." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registrazione non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      setAuthOpen(false);
      toast({ title: "Accesso effettuato" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Accesso non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendVerification = async () => {
    try {
      await sendVerificationEmail();
      toast({ title: "Email di verifica inviata" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invio email non riuscito";
      toast({ title: message, variant: "destructive" });
    }
  };

  const handleResendVerification = async () => {
    if (!loginEmail || !loginPassword) {
      toast({ title: "Compila email e password" });
      return;
    }
    setAuthLoading(true);
    try {
      await resendVerificationWithEmail(loginEmail, loginPassword);
      setLoginPassword("");
      toast({ title: "Email di verifica inviata" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invio email non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!loginEmail) {
      toast({ title: "Inserisci la tua email" });
      return;
    }
    setAuthLoading(true);
    try {
      await resetPassword(loginEmail);
      toast({ title: "Email di reset inviata" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reset non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <nav className="py-4 px-4 md:px-8 border-b border-muted/30 z-50 relative bg-background/80 backdrop-blur-md sticky top-0">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-1">
            <span className="text-3xl font-poster text-accent">Next</span>
            <span className="text-3xl font-poster text-white">Trailer</span>
          </Link>
          <div className="hidden md:flex ml-10 space-x-6">
            <Link
              to="/"
              className={`transition-colors ${isActive('/') ? 'text-accent font-medium' : 'hover:text-accent font-medium'}`}
            >
              Home
            </Link>
            <Link
              to="/movies"
              className={`transition-colors ${isActive('/movies') ? 'text-accent font-medium' : 'hover:text-accent font-medium'}`}
            >
              Film
            </Link>
            <Link
              to="/tv"
              className={`transition-colors ${isActive('/tv') ? 'text-accent font-medium' : 'hover:text-accent font-medium'}`}
            >
              Serie TV
            </Link>
            <Link
              to="/oscar"
              className={`transition-colors ${isActive('/oscar') ? 'text-accent font-medium' : 'hover:text-accent font-medium'}`}
            >
              Oscar
            </Link>
            <Link
              to="/genres"
              className={`transition-colors ${isActive('/genres') ? 'text-accent font-medium' : 'hover:text-accent font-medium'}`}
            >
              Sfoglia
            </Link>
            {canAccess && (
              <Link
                to="/storico"
                className={`transition-colors ${isActive('/storico') ? 'text-accent font-medium' : 'hover:text-accent font-medium'}`}
              >
                Storico
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <form
            onSubmit={handleSearch}
            className="hidden md:flex relative items-center"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca titoli, persone..."
              className="bg-secondary/50 rounded-full px-4 py-2 pl-10 text-sm w-48 lg:w-64 focus:outline-none focus:ring-1 focus:ring-accent transition-all focus:w-80"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </form>

          <Button variant="ghost" className="md:hidden" size="icon" onClick={() => navigate('/search')}>
            <Search className="h-4 w-4" />
          </Button>

          {canAccess && (
            <>
              <Link to="/watchlist">
                <Button variant="ghost" className="text-accent hover:text-accent hover:bg-accent/10 relative px-2 sm:px-4">
                  <span className="hidden sm:inline">Watchlist</span>
                  {watchlistCount > 0 && (
                    <span className="bg-accent text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center sm:ml-2 sm:static absolute -top-1 -right-1">
                      {watchlistCount}
                    </span>
                  )}
                </Button>
              </Link>

              <Link to="/storico">
                <Button variant="ghost" className="text-accent hover:text-accent hover:bg-accent/10 relative px-2 sm:px-4">
                  <span className="hidden sm:inline">Storico</span>
                  {libraryCount > 0 && (
                    <span className="bg-accent text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center sm:ml-2 sm:static absolute -top-1 -right-1">
                      {libraryCount}
                    </span>
                  )}
                </Button>
              </Link>
            </>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border border-border hover:border-accent transition-colors">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                    <AvatarFallback className="bg-accent/10 text-accent">
                      {user.displayName?.charAt(0) || <UserIcon className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                {canAccess ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/watchlist')}>
                      Watchlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/storico')}>
                      Storico
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSendVerification}>
                      Invia email di verifica
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Esci</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                onClick={() => setAuthOpen(true)}
                className="bg-accent hover:bg-accent/90 text-white font-medium px-4 h-10 flex items-center gap-2"
              >
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Accedi</span>
              </Button>
              <Dialog open={authOpen} onOpenChange={setAuthOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Accedi o registrati</DialogTitle>
                  </DialogHeader>
                  <Tabs value={authTab} onValueChange={(value) => setAuthTab(value as "login" | "register")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">Accedi</TabsTrigger>
                      <TabsTrigger value="register">Registrati</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login">
                      <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            value={loginEmail}
                            onChange={(event) => setLoginEmail(event.target.value)}
                            autoComplete="email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            value={loginPassword}
                            onChange={(event) => setLoginPassword(event.target.value)}
                            autoComplete="current-password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Button type="submit" className="w-full" disabled={authLoading}>
                            Accedi con email
                          </Button>
                          <Button type="button" variant="ghost" className="w-full" onClick={handleResendVerification} disabled={authLoading}>
                            Reinvia verifica
                          </Button>
                          <Button type="button" variant="ghost" className="w-full" onClick={handleResetPassword} disabled={authLoading}>
                            Reset password
                          </Button>
                          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={authLoading}>
                            Accedi con Google
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                    <TabsContent value="register">
                      <form onSubmit={handleEmailRegister} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-username">Username</Label>
                          <Input
                            id="register-username"
                            value={registerUsername}
                            onChange={(event) => setRegisterUsername(event.target.value)}
                            autoComplete="username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-email">Email</Label>
                          <Input
                            id="register-email"
                            type="email"
                            value={registerEmail}
                            onChange={(event) => setRegisterEmail(event.target.value)}
                            autoComplete="email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-password">Password</Label>
                          <Input
                            id="register-password"
                            type="password"
                            value={registerPassword}
                            onChange={(event) => setRegisterPassword(event.target.value)}
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Button type="submit" className="w-full" disabled={authLoading}>
                            Crea account
                          </Button>
                          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={authLoading}>
                            Registrati con Google
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
