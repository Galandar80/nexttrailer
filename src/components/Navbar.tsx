
import { Search, User as UserIcon, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/auth-core";
import { tmdbApi, MediaItem } from "@/services/tmdbApi";
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
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 350);
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
  const [isNewsMenuOpen, setIsNewsMenuOpen] = useState(false);
  const watchlistCount = items.length;
  const libraryCount = libraryItems.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setIsSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    let isActive = true;
    const query = debouncedQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return () => {
        isActive = false;
      };
    }

    const runSearch = async () => {
      setIsSearching(true);
      try {
        const { results } = await tmdbApi.search(query, 1, { includePeople: true });
        if (!isActive) return;
        setSearchResults(results.slice(0, 10));
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    };

    runSearch();

    return () => {
      isActive = false;
    };
  }, [debouncedQuery]);

  const handleResultSelect = (item: MediaItem) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    if (item.media_type === "person") {
      navigate(`/person/${item.id}`);
      return;
    }
    navigate(`/${item.media_type}/${item.id}`);
  };

  const getResultTitle = (item: MediaItem) => {
    if (item.media_type === "movie") return item.title || "";
    return item.name || item.title || "";
  };

  const getResultTypeLabel = (item: MediaItem) => {
    if (item.media_type === "movie") return "Film";
    if (item.media_type === "tv") return "Serie TV";
    return "Persona";
  };

  const getResultImage = (item: MediaItem) => {
    const path = item.media_type === "person" ? item.profile_path || item.poster_path : item.poster_path;
    return path ? tmdbApi.getImageUrl(path, "w185") : "";
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };
  const isNewsActive = location.pathname.startsWith("/news");

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
            <div onMouseEnter={() => setIsNewsMenuOpen(true)} onMouseLeave={() => setIsNewsMenuOpen(false)}>
              <DropdownMenu open={isNewsMenuOpen} onOpenChange={setIsNewsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Link
                    to="/news"
                    className={`transition-colors ${isNewsActive ? 'text-accent font-medium' : 'hover:text-accent font-medium'}`}
                  >
                    News
                  </Link>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link to="/news">News</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/news/archivio">Archivio news</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Link
              to="/catalogo"
              className={`transition-colors ${isActive('/catalogo') ? 'text-accent font-medium' : 'hover:text-accent font-medium'}`}
            >
              Catalogo
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
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <form
            onSubmit={handleSearch}
            className="hidden md:flex relative items-center"
            onFocus={() => setIsSearchOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setIsSearchOpen(false);
              }
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Cerca titoli, persone..."
              className="bg-secondary/50 rounded-full px-4 py-2 pl-10 text-sm w-48 lg:w-64 focus:outline-none focus:ring-1 focus:ring-accent transition-all focus:w-80"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                {searchQuery.trim().length < 2 ? (
                  <div className="px-4 py-4 text-sm text-muted-foreground">Scrivi almeno 2 caratteri</div>
                ) : isSearching ? (
                  <div className="px-4 py-4 text-sm text-muted-foreground">Ricerca in corso...</div>
                ) : searchResults.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((item) => {
                      const imageUrl = getResultImage(item);

                      return (
                        <button
                          key={`${item.media_type}-${item.id}`}
                          type="button"
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/40 text-left"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleResultSelect(item)}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={getResultTitle(item)}
                              className="h-12 w-9 rounded object-cover bg-secondary/40"
                            />
                          ) : (
                            <div className="h-12 w-9 rounded bg-secondary/40 flex items-center justify-center text-xs text-muted-foreground">
                              {getResultTypeLabel(item).charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{getResultTitle(item)}</p>
                            <p className="text-xs text-muted-foreground">{getResultTypeLabel(item)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-muted-foreground">Nessun risultato</div>
                )}
              </div>
            )}
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
                    <DropdownMenuItem onClick={() => navigate('/preferenze')}>
                      Preferenze
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
