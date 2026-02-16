
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const isFirebaseEnabled = Object.values(firebaseConfig).every(Boolean);
export { isFirebaseEnabled };

let appPromise: Promise<import("firebase/app").FirebaseApp | null> | null = null;
let authPromise: Promise<import("firebase/auth").Auth | null> | null = null;
let dbPromise: Promise<import("firebase/firestore").Firestore | null> | null = null;
let storagePromise: Promise<import("firebase/storage").FirebaseStorage | null> | null = null;

const getFirebaseApp = async () => {
    if (!isFirebaseEnabled) return null;
    if (!appPromise) {
        appPromise = import("firebase/app").then(({ initializeApp }) => initializeApp(firebaseConfig));
    }
    return appPromise;
};

export const getAuthModule = () => import("firebase/auth");
export const getFirestoreModule = () => import("firebase/firestore");
export const getStorageModule = () => import("firebase/storage");

export const getAuth = async () => {
    if (!isFirebaseEnabled) return null;
    if (!authPromise) {
        authPromise = Promise.all([getFirebaseApp(), getAuthModule()]).then(([app, authModule]) => {
            if (!app) return null;
            return authModule.getAuth(app);
        });
    }
    return authPromise;
};

export const getDb = async () => {
    if (!isFirebaseEnabled) return null;
    if (!dbPromise) {
        dbPromise = Promise.all([getFirebaseApp(), getFirestoreModule()]).then(([app, firestoreModule]) => {
            if (!app) return null;
            return firestoreModule.getFirestore(app);
        });
    }
    return dbPromise;
};

export const getStorage = async () => {
    if (!isFirebaseEnabled) return null;
    if (!storagePromise) {
        storagePromise = Promise.all([getFirebaseApp(), getStorageModule()]).then(([app, storageModule]) => {
            if (!app) return null;
            return storageModule.getStorage(app);
        });
    }
    return storagePromise;
};
