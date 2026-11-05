import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query } from 'firebase/firestore';

// 1. Initialize Firebase with a unique named app instance to avoid [DEFAULT] config conflicts
import firebaseConfigApp from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseConfigApp.apiKey,
  authDomain: firebaseConfigApp.authDomain,
  projectId: firebaseConfigApp.projectId,
  storageBucket: firebaseConfigApp.storageBucket,
  messagingSenderId: firebaseConfigApp.messagingSenderId,
  appId: firebaseConfigApp.appId
};

const appName = "floate-connection-app";
const existingApps = getApps();
const app = existingApps.find(a => a.name === appName) || initializeApp(firebaseConfig, appName);
const db = getFirestore(app, firebaseConfigApp.firestoreDatabaseId);

/**
 * 100% Real-Time Catalog Sync
 * Whenever a vendor uploads a product photo & price on WhatsApp, 
 * this callback fires instantly with the updated product list.
 */
export function connectLiveCatalog(onProductsUpdated: (products: any[]) => void) {
  try {
    const q = query(collection(db, "catalog"));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      if (products.length > 0) {
        onProductsUpdated(products);
      }
    }, (error) => {
      console.warn("Live Catalog Sync Warning (falling back to API/cache):", error);
    });
  } catch (err) {
    console.warn("Live Catalog Sync Init Error:", err);
    return () => {};
  }
}

/**
 * 100% Real-Time 24-Hour Status Stories Sync
 * Whenever a vendor sends a status update on WhatsApp, 
 * this syncs it live to their storefront profile.
 */
export function connectLiveStatuses(onStatusesUpdated: (statuses: any[]) => void) {
  try {
    const q = query(collection(db, "statuses"));
    return onSnapshot(q, (snapshot) => {
      const statuses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      if (statuses.length > 0) {
        onStatusesUpdated(statuses);
      }
    }, (error) => {
      console.warn("Live Status Sync Warning:", error);
    });
  } catch (err) {
    console.warn("Live Status Sync Init Error:", err);
    return () => {};
  }
}

/**
 * Helper to generate direct WhatsApp chat link for any vendor/product
 */
export function getVendorWhatsAppLink(phone?: string, productName?: string) {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '2348031234567';
  const text = encodeURIComponent(`Hello, I am interested in your product: ${productName || 'General Inquiry'}. I saw it on FLOATE.`);
  return `https://wa.me/${cleanPhone}?text=${text}`;
}
