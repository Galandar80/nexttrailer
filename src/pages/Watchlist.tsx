import { Link } from "react-router-dom";
import { Film, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-core";

const Watchlist = () => {
    const { items, removeItem, clearWatchlist } = useWatchlistStore();
    const { toast } = useToast();
    const { user, canAccess, signInWithGoogle, sendVerificationEmail } = useAuth();

    const handleRemove = (id: number, mediaType: 'movie' | 'tv', title: string) => {
        removeItem(id, mediaType);
        toast({
            title: "Rimosso dalla Watchlist",
            description: `${title} è stato rimosso dalla tua watchlist`,
        });
    };

    const handleClearAll = () => {
        if (items.length === 0) return;

        if (confirm(`Sei sicuro di voler rimuovere tutti i ${items.length} elementi dalla watchlist?`)) {
            clearWatchlist();
            toast({
                title: "Watchlist svuotata",
                description: "Tutti gli elementi sono stati rimossi",
            });
        }
    };

    const movieCount = items.filter(item => item.media_type === 'movie').length;
    const tvCount = items.filter(item => item.media_type === 'tv').length;

    if (!canAccess) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-20">
                    <div className="text-center max-w-xl mx-auto">
                        <h1 className="text-3xl md:text-4xl font-bold mb-4">
                            {user ? "Verifica la tua email" : "La Mia Watchlist"}
                        </h1>
                        <p className="text-muted-foreground mb-6">
                            {user
                                ? "Conferma l'account via email per usare la watchlist."
                                : "Accedi per vedere e gestire la tua watchlist personale."}
                        </p>
                        <Button
                            onClick={() => (user ? sendVerificationEmail() : signInWithGoogle())}
                            className="bg-accent hover:bg-accent/90 text-white font-medium px-6 h-11"
                        >
                            {user ? "Invia email di verifica" : "Accedi"}
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">La Mia Watchlist</h1>
                            <p className="text-muted-foreground">
                                {items.length === 0
                                    ? "La tua watchlist è vuota"
                                    : `${items.length} ${items.length === 1 ? 'elemento' : 'elementi'} salvati`}
                            </p>
                        </div>

                        {items.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleClearAll}
                                className="gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Svuota tutto
                            </Button>
                        )}
                    </div>

                    {/* Stats */}
                    {items.length > 0 && (
                        <div className="flex gap-4 flex-wrap">
                            <div className="bg-secondary/20 rounded-lg px-4 py-2 flex items-center gap-2">
                                <Film className="h-4 w-4 text-accent" />
                                <span className="text-sm">
                                    <strong>{movieCount}</strong> {movieCount === 1 ? 'Film' : 'Film'}
                                </span>
                            </div>
                            <div className="bg-secondary/20 rounded-lg px-4 py-2 flex items-center gap-2">
                                <Film className="h-4 w-4 text-accent" />
                                <span className="text-sm">
                                    <strong>{tvCount}</strong> {tvCount === 1 ? 'Serie TV' : 'Serie TV'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                {items.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mb-6">
                            <Film className="h-16 w-16 mx-auto text-muted-foreground/50" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Nessun contenuto salvato</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Inizia ad aggiungere film e serie TV alla tua watchlist per tenerli sempre a portata di mano
                        </p>
                        <Link to="/">
                            <Button className="gap-2">
                                <Film className="h-4 w-4" />
                                Esplora contenuti
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="content-grid">
                        {items.map((item) => (
                            <div key={`${item.media_type}-${item.id}`} className="relative group">
                                <MovieCard media={item} />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    onClick={() => handleRemove(
                                        item.id,
                                        item.media_type as "movie" | "tv",
                                        item.title || item.name || 'Contenuto'
                                    )}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Watchlist;
