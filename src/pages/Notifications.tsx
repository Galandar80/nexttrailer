import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-core";
import { useToast } from "@/hooks/use-toast";
import { getDb, getFirestoreModule, isFirebaseEnabled } from "@/services/firebase";

type NotificationType = "follow" | "like" | "comment" | "share";

type NotificationItem = {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  actorPhoto?: string;
  type: NotificationType;
  thoughtId?: string | null;
  thoughtText?: string;
  commentText?: string;
  createdAt?: Date | null;
  readAt?: Date | null;
};

const loadFirestore = async () => {
  if (!isFirebaseEnabled) return null;
  const [db, firestore] = await Promise.all([getDb(), getFirestoreModule()]);
  if (!db) return null;
  return { db, ...firestore };
};

const NotificationsPage = () => {
  const { user, canAccess } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const unreadNotifications = notifications.filter((item) => !item.readAt);
  const readNotifications = notifications.filter((item) => item.readAt);

  const resolveTimestamp = (value?: { toDate?: () => Date } | string | Date | null) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") return new Date(value);
    if (value.toDate) return value.toDate();
    return null;
  };

  useEffect(() => {
    if (!canAccess || !user) {
      setIsLoading(false);
      return;
    }
    const loadNotifications = async () => {
      setIsLoading(true);
      setError(null);
      const firestore = await loadFirestore();
      if (!firestore) {
        setError("Firebase non configurato");
        setIsLoading(false);
        return;
      }
      try {
        const { db, collection, getDocs, query, where, orderBy, limit } = firestore;
        let snapshot: Awaited<ReturnType<typeof getDocs>>;
        try {
          snapshot = await getDocs(query(
            collection(db, "user_notifications"),
            where("recipientId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(50)
          ));
        } catch {
          snapshot = await getDocs(query(
            collection(db, "user_notifications"),
            where("recipientId", "==", user.uid),
            limit(50)
          ));
        }
        const items = snapshot.docs.map((entry: (typeof snapshot.docs)[number]) => {
          const data = entry.data() as Omit<NotificationItem, "id" | "createdAt" | "readAt"> & {
            createdAt?: { toDate?: () => Date } | string | Date | null;
            readAt?: { toDate?: () => Date } | string | Date | null;
          };
          const createdAt = resolveTimestamp(data.createdAt);
          const readAt = resolveTimestamp(data.readAt);
          return {
            id: entry.id,
            recipientId: data.recipientId,
            actorId: data.actorId,
            actorName: data.actorName || "Utente",
            actorPhoto: data.actorPhoto || "",
            type: data.type,
            thoughtId: data.thoughtId ?? null,
            thoughtText: data.thoughtText || "",
            commentText: data.commentText || "",
            createdAt,
            readAt
          };
        });
        setNotifications(items);
      } catch (err) {
        setError("Impossibile caricare le notifiche");
      } finally {
        setIsLoading(false);
      }
    };
    void loadNotifications();
  }, [canAccess, user]);

  const handleMarkRead = async (notificationId: string) => {
    if (!canAccess || !user) return;
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      const { db, doc, updateDoc, serverTimestamp } = firestore;
      await updateDoc(doc(db, "user_notifications", notificationId), {
        readAt: serverTimestamp()
      });
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, readAt: new Date() } : item
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operazione non riuscita";
      toast({ title: message, variant: "destructive" });
    }
  };

  const handleMarkAllRead = async () => {
    if (!canAccess || !user) return;
    const unreadIds = notifications.filter((item) => !item.readAt).map((item) => item.id);
    if (unreadIds.length === 0) {
      toast({ title: "Nessuna notifica da aggiornare" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsMarkingAll(true);
    try {
      const { db, writeBatch, doc, serverTimestamp } = firestore;
      const batch = writeBatch(db);
      unreadIds.forEach((id) => {
        batch.update(doc(db, "user_notifications", id), { readAt: serverTimestamp() });
      });
      await batch.commit();
      setNotifications((prev) => prev.map((item) => item.readAt ? item : { ...item, readAt: new Date() }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operazione non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getNotificationLabel = (item: NotificationItem) => {
    if (item.type === "follow") return "ha iniziato a seguirti";
    if (item.type === "like") return "ha messo like al tuo pensiero";
    if (item.type === "comment") return "ha commentato il tuo pensiero";
    if (item.type === "share") return "ha condiviso il tuo pensiero";
    return "ha interagito con te";
  };

  const renderTargetLink = (item: NotificationItem) => {
    if (item.type === "follow") {
      return (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/profilo/${item.actorId}`}>Vedi profilo</Link>
        </Button>
      );
    }
    return (
      <Button variant="outline" size="sm" asChild>
        <Link to="/community">Apri community</Link>
      </Button>
    );
  };

  const renderNotificationCard = (item: NotificationItem) => {
    const isUnread = !item.readAt;
    return (
      <div
        key={item.id}
        className={`rounded-lg border p-4 flex flex-col gap-3 ${isUnread ? "border-accent/60 bg-accent/5" : "border-white/5 bg-secondary/10"}`}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={item.actorPhoto || undefined} alt={item.actorName} />
            <AvatarFallback className="bg-accent/10 text-accent text-lg">
              {item.actorName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm">
              <Link to={`/profilo/${item.actorId}`} className="font-semibold hover:text-accent">
                {item.actorName}
              </Link>{" "}
              {getNotificationLabel(item)}
            </p>
            {item.thoughtText && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.thoughtText}
              </p>
            )}
            {item.commentText && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.commentText}
              </p>
            )}
          </div>
          {isUnread && <div className="h-2 w-2 rounded-full bg-accent mt-2" />}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {renderTargetLink(item)}
          <Button variant="ghost" size="sm" onClick={() => handleMarkRead(item.id)} disabled={!isUnread}>
            {isUnread ? "Segna come letta" : "Letta"}
          </Button>
        </div>
      </div>
    );
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEO title="Notifiche" description="Le tue notifiche social" />
        <Navbar />
        <main className="max-w-screen-lg mx-auto px-4 py-12 text-center space-y-4">
          <h1 className="text-2xl font-semibold">Notifiche</h1>
          <p className="text-muted-foreground">Accedi per vedere le notifiche.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Notifiche" description="Le tue notifiche social" />
      <Navbar />
      <main className="max-w-screen-lg mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifiche</h1>
            <p className="text-sm text-muted-foreground">Aggiornamenti sulle interazioni nella community.</p>
          </div>
          <Button variant="outline" onClick={handleMarkAllRead} disabled={isMarkingAll || unreadNotifications.length === 0}>
            Segna tutte come lette
          </Button>
        </div>

        {isLoading && (
          <div className="h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        )}

        {error && <div className="text-sm text-destructive">{error}</div>}

        {!isLoading && !error && notifications.length === 0 && (
          <div className="text-muted-foreground">Nessuna notifica disponibile.</div>
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <div className="grid gap-6">
            {unreadNotifications.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Non lette</h2>
                <div className="grid gap-4">
                  {unreadNotifications.map(renderNotificationCard)}
                </div>
              </div>
            )}
            {readNotifications.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Già lette</h2>
                <div className="grid gap-4">
                  {readNotifications.map(renderNotificationCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default NotificationsPage;
