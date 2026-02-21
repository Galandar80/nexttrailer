
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="mt-16 border-t border-muted/20 py-8 px-4 md:px-8">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-poster text-accent">Next</span>
              <span className="text-2xl font-poster text-white">Trailer</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              News, catalogo e community per chi ama film e serie TV
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Esplora</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/catalogo" className="hover:text-accent">Catalogo</Link></li>
                <li><Link href="/news" className="hover:text-accent">News</Link></li>
                <li><Link href="/oscar" className="hover:text-accent">Oscar</Link></li>
                <li><Link href="/genres" className="hover:text-accent">Sfoglia</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Funzionalità</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/watchlist" className="hover:text-accent">Watchlist</Link></li>
                <li><Link href="/storico" className="hover:text-accent">Storico</Link></li>
                <li><Link href="/search" className="hover:text-accent">Cerca</Link></li>
                <li><Link href="/notifiche" className="hover:text-accent">Notifiche</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Community</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/community" className="hover:text-accent">Community</Link></li>
                <li><Link href="/profilo" className="hover:text-accent">Profilo</Link></li>
                <li><Link href="/preferenze" className="hover:text-accent">Preferenze</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Risorse</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/catalogo" className="hover:text-accent">Film e Serie</Link></li>
                <li><Link href="/news" className="hover:text-accent">Ultime news</Link></li>
                <li><Link href="/search" className="hover:text-accent">Ricerca titoli</Link></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-muted/20 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} NextTrailer. Tutti i diritti riservati.</p>
          <p className="mt-2 md:mt-0">
            Dati sui film forniti da <span className="text-muted-foreground/70">fonti di terze parti</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
