
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ShieldCheck, Sparkles, Rocket, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { tmdbApi, MediaItem } from "@/services/tmdbApi";
import Navbar from "@/components/Navbar";
import ContentRow from "@/components/ContentRow";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const Home = () => {
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularTvShows, setPopularTvShows] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setLoadingError(null);

      try {
        const [popMovies, popTV] = await Promise.all([
          tmdbApi.getPopular("movie"),
          tmdbApi.getPopular("tv")
        ]);

        if (!popMovies.length && !popTV.length) {
          throw new Error("Nessun dato ricevuto dall'API");
        }

        setPopularMovies(popMovies);
        setPopularTvShows(popTV);
      } catch (error) {
        console.error("Errore nel caricamento dei contenuti della homepage:", error);
        setLoadingError("Si è verificato un errore nel caricamento dei contenuti.");
        toast({
          title: "Errore nel caricamento dei contenuti",
          description: "Utilizzando contenuti di esempio. Per utilizzare dati reali, è necessaria una API key valida.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [toast]);

  const handleRetry = () => {
    localStorage.removeItem('lastContentRefresh');
    window.location.reload();
  };

  const calendarDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const calendarNumbers = Array.from({ length: 28 }, (_, index) => index + 1);
  const episodeHighlights: Record<number, string[]> = {
    3: ["The Bear"],
    7: ["One Piece"],
    12: ["Loki"],
    18: ["The Last of Us"],
    24: ["Stranger Things"]
  };

  const renderSkeletonLoader = () => (
    <div className="space-y-8 px-4 md:px-8 py-10">
      <Skeleton className="h-[420px] w-full rounded-3xl" />
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="NextTrailer" description="Scopri film e serie, organizza la visione e non perdere nessuna uscita." />
      <Navbar />

      {isLoading ? (
        renderSkeletonLoader()
      ) : loadingError && popularMovies.length === 0 && popularTvShows.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className="text-lg text-muted-foreground">{loadingError}</p>
          <p className="text-sm text-muted-foreground mb-2">
            L'API key di TMDB non è valida. Controlla il file src/services/tmdbApi.ts per aggiornare con un API key valida.
          </p>
          <Button
            onClick={handleRetry}
            variant="default"
            className="bg-accent hover:bg-accent/90 text-white"
          >
            Riprova
          </Button>
        </div>
      ) : (
        <main className="flex flex-col gap-16">
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/25 via-background to-background" />
            <div className="absolute -top-28 -right-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
            <div className="relative max-w-screen-2xl mx-auto px-4 md:px-8 pt-16 pb-12">
              <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div className="space-y-6">
                  <Badge variant="secondary" className="w-fit">LA HOME DELLA TUA VISIONE</Badge>
                  <h1 className="text-4xl md:text-6xl font-bold">
                    Tutto ciò che ti serve per guardare, salvare e condividere la tua visione.
                  </h1>
                  <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
                    NextTrailer unisce news aggiornate, trailer, catalogo, community e notifiche.
                    Organizza watchlist, storico e liste personali mentre segui amici e profili.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => navigate("/storico")} className="bg-accent hover:bg-accent/90">
                      Crea account gratuito
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/catalogo")}>
                      Esplora il catalogo
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      "Notifiche quando qualcuno ti segue",
                      "Liste personali modificabili dal profilo",
                      "Watchlist, storico e news sempre aggiornati"
                    ].map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-accent mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Card className="bg-secondary/30 border-muted/40">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Calendario episodi</p>
                        <h2 className="text-2xl font-semibold">Febbraio</h2>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
                      {calendarDays.map((day) => (
                        <div key={day} className="text-center">{day}</div>
                      ))}
                      {calendarNumbers.map((day) => (
                        <div key={day} className="rounded-lg border border-muted/30 bg-background/70 p-2 min-h-[64px]">
                          <div className="text-xs font-medium text-foreground">{day}</div>
                          <div className="mt-1 space-y-1">
                            {(episodeHighlights[day] || []).map((title) => (
                              <span key={title} className="block rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
                                {title}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          <section className="max-w-screen-2xl mx-auto px-4 md:px-8 grid gap-8 lg:grid-cols-[1fr_1fr] items-start">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit">COS’È NEXTTRAILER</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">La tua cabina di regia per cinema, serie e community.</h2>
              <p className="text-muted-foreground">
                Raccogli tutto in un unico spazio: trailer, news, catalogo, profili e notifiche.
                Segui altri utenti, crea liste personali e tieni traccia di ciò che guardi.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="default" onClick={() => navigate("/search")}>
                  Inizia a cercare
                </Button>
                <Button variant="outline" onClick={() => navigate("/news")}>
                  Leggi le news
                </Button>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-secondary/20 border-muted/40">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold">Calendario intelligente</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Un’agenda sempre aggiornata con gli episodi e le uscite che ti interessano davvero.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/20 border-muted/40">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold">News sempre attive</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Leggi notizie aggiornate e approfondimenti per restare sul pezzo.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/20 border-muted/40">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <Rocket className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold">Community e profili</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Segui altri utenti, scopri nuove liste e tieni vive le tue preferenze.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/20 border-muted/40">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold">Liste sotto controllo</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Crea, modifica e gestisci liste personali in modo semplice e sicuro.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="rounded-3xl border border-muted/30 bg-secondary/30 p-8 md:p-12">
              <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div className="space-y-4">
                  <Badge variant="outline" className="w-fit">PERCHÉ REGISTRARSI</Badge>
                  <h2 className="text-3xl md:text-4xl font-bold">Sblocca community, notifiche e liste personali.</h2>
                  <p className="text-muted-foreground">
                    La registrazione ti permette di seguire altri utenti, ricevere notifiche
                    e tenere sincronizzate watchlist, storico e liste personali.
                  </p>
                  <div className="grid gap-3">
                    {[
                      "Notifiche per nuovi follower e attività",
                      "Liste personali editabili dal profilo",
                      "Storico e watchlist sempre sincronizzati"
                    ].map((point) => (
                      <div key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-accent mt-0.5" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-accent hover:bg-accent/90" onClick={() => navigate("/storico")}>
                      Registrati gratis
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/watchlist")}>
                      Prova la watchlist
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <Badge variant="outline" className="w-fit">COME FUNZIONA</Badge>
                  <h3 className="text-2xl font-semibold">Tre passaggi e sei operativo.</h3>
                  <div className="grid gap-4">
                    {[
                      "Crea l’account in pochi secondi.",
                      "Segui profili e crea le tue liste personali.",
                      "Consulta news, notifiche e storico ovunque."
                    ].map((step, index) => (
                      <div key={step} className="flex items-start gap-3 rounded-xl border border-muted/30 bg-background/70 p-4">
                        <div className="h-8 w-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <p className="text-sm text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="max-w-screen-2xl mx-auto px-4 md:px-8">
            {popularTvShows.length > 0 && (
              <ContentRow title="Alcune serie TV popolari" items={popularTvShows.slice(0, 15)} />
            )}
            {popularMovies.length > 0 && (
              <div className="mt-8">
                <ContentRow title="Film popolari da aggiungere allo storico" items={popularMovies.slice(0, 15)} />
              </div>
            )}
          </section>

          <section className="max-w-screen-2xl mx-auto px-4 md:px-8 pb-16">
            <div className="rounded-3xl border border-muted/30 bg-secondary/30 p-8 md:p-12 text-center space-y-4">
              <h2 className="text-3xl font-bold">Pronto a guardare con metodo?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Unisciti a NextTrailer e rendi più semplice la tua routine di visione,
                senza perdere episodi o nuovi titoli importanti.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button className="bg-accent hover:bg-accent/90" onClick={() => navigate("/storico")}>
                  Registrati gratis
                </Button>
                <Button variant="outline" onClick={() => navigate("/catalogo")}>
                  Scopri cosa guardare
                </Button>
              </div>
            </div>
          </section>
        </main>
      )}

      <Footer />
    </div>
  );
};

export default Home;
