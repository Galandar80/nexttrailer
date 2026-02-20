import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-core";
import { getDb, getFirestoreModule, isFirebaseEnabled } from "@/services/firebase";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

type ProfileSummary = {
  id: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
};

const loadFirestore = async () => {
  if (!isFirebaseEnabled) return null;
  const [db, firestore] = await Promise.all([getDb(), getFirestoreModule()]);
  if (!db) return null;
  return { db, ...firestore };
};

const FollowingPage = () => {
  const { id } = useParams<{ id?: string }>();
  const { user, canAccess } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const createNotification = async (
    firestore: Awaited<ReturnType<typeof loadFirestore>>,
    recipientId: string
  ) => {
    if (!firestore || !user) return;
    if (!recipientId || recipientId === user.uid) return;
    const { db, addDoc, collection, serverTimestamp } = firestore;
    await addDoc(collection(db, "user_notifications"), {
      recipientId,
      actorId: user.uid,
      actorName: user.displayName || user.email || "Utente",
      actorPhoto: user.photoURL || "",
      type: "follow",
      thoughtId: null,
      thoughtText: "",
      commentText: "",
      createdAt: serverTimestamp(),
      readAt: null
    });
  };

  const profileId = id || user?.uid || "";

  useEffect(() => {
    if (!profileId) {
      setIsLoading(false);
      return;
    }
    const loadFollowing = async () => {
      setIsLoading(true);
      setError(null);
      const firestore = await loadFirestore();
      if (!firestore) {
        setError("Firebase non configurato");
        setIsLoading(false);
        return;
      }
      try {
        const { db, collection, getDocs, query, where, doc, getDoc } = firestore;
        const followingSnapshot = await getDocs(query(
          collection(db, "user_follows"),
          where("followerId", "==", profileId)
        ));
        const followedIdsList = followingSnapshot.docs.map((entry) => entry.data()?.followedId).filter(Boolean) as string[];
        const userProfiles = await Promise.all(followedIdsList.map(async (followedId) => {
          const userDoc = await getDoc(doc(db, "users", followedId));
          const data = userDoc.exists() ? userDoc.data() : {};
          const profile = (data?.profile || {}) as Partial<ProfileSummary>;
          return {
            id: followedId,
            displayName: profile.displayName || data?.displayName || "Utente",
            photoURL: profile.photoURL || "",
            bio: profile.bio || ""
          };
        }));
        setProfiles(userProfiles);
        if (canAccess && user) {
          const myFollowingSnapshot = await getDocs(query(
            collection(db, "user_follows"),
            where("followerId", "==", user.uid)
          ));
          const myFollowingIds = myFollowingSnapshot.docs.map((entry) => entry.data()?.followedId).filter(Boolean) as string[];
          setFollowedIds(new Set(myFollowingIds));
        } else {
          setFollowedIds(new Set());
        }
      } catch (err) {
        setError("Impossibile caricare i seguiti");
      } finally {
        setIsLoading(false);
      }
    };
    void loadFollowing();
  }, [profileId, canAccess, user]);

  const handleToggleFollow = async (targetId: string) => {
    if (!canAccess || !user) {
      toast({ title: "Accedi per seguire", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      const { db, doc, setDoc, deleteDoc, serverTimestamp } = firestore;
      const followRef = doc(db, "user_follows", `${user.uid}_${targetId}`);
      if (followedIds.has(targetId)) {
        await deleteDoc(followRef);
        setFollowedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followedId: targetId,
          createdAt: serverTimestamp()
        });
        setFollowedIds((prev) => new Set(prev).add(targetId));
        await createNotification(firestore, targetId);
      }
    } catch (err) {
      toast({ title: "Operazione non riuscita", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Seguiti" description="Elenco dei profili seguiti" />
      <Navbar />
      <main className="max-w-screen-lg mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Seguiti</h1>
          {profileId && (
            <Link to={`/profilo/${profileId}`} className="text-sm text-accent hover:underline">
              Torna al profilo
            </Link>
          )}
        </div>

        {isLoading && (
          <div className="h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        )}

        {error && <div className="text-sm text-destructive">{error}</div>}

        {!isLoading && !error && profiles.length === 0 && (
          <div className="text-muted-foreground">Nessun seguito disponibile.</div>
        )}

        {!isLoading && !error && profiles.length > 0 && (
          <div className="grid gap-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="bg-secondary/10 rounded-lg p-4 border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName} />
                    <AvatarFallback className="bg-accent/10 text-accent text-lg">
                      {profile.displayName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link to={`/profilo/${profile.id}`} className="font-semibold hover:text-accent">
                      {profile.displayName}
                    </Link>
                    {profile.bio && <div className="text-xs text-muted-foreground line-clamp-2">{profile.bio}</div>}
                  </div>
                </div>
                {canAccess && user?.uid !== profile.id && (
                  <Button
                    variant={followedIds.has(profile.id) ? "outline" : "default"}
                    onClick={() => handleToggleFollow(profile.id)}
                  >
                    {followedIds.has(profile.id) ? "Seguito" : "Segui"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FollowingPage;
