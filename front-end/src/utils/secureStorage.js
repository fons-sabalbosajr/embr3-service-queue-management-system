/**
 * secureStorage.js
 * AES-256 encrypted wrappers for localStorage and sessionStorage.
 *
 * Keys are HMAC-SHA256 hashed so they are never stored in plain text.
 * Values are AES-CBC encrypted so they are never readable in storage.
 *
 * The encryption secret comes from the VITE_STORAGE_SECRET env var at
 * build time, with a hard-coded fallback.  In production, set the env var.
 */

import CryptoJS from 'crypto-js';

const APP_KEY =
  import.meta.env.VITE_STORAGE_SECRET || 'sqms-embr3-2026-x9k2z';

/** Deterministic hash of the logical key so lookups still work. */
function hashKey(key) {
  return CryptoJS.HmacSHA256(key, APP_KEY).toString(CryptoJS.enc.Hex);
}

/** AES-256 CBC encrypt any JSON-serialisable value. */
function encrypt(value) {
  return CryptoJS.AES.encrypt(JSON.stringify(value), APP_KEY).toString();
}

/** Decrypt and deserialise.  Returns null if the cipher is invalid. */
function decrypt(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, APP_KEY);
    const plain = bytes.toString(CryptoJS.enc.Utf8);
    if (!plain) return null;
    return JSON.parse(plain);
  } catch {
    return null;
  }
}

function makeStore(store) {
  return {
    setItem(key, value) {
      store.setItem(hashKey(key), encrypt(value));
    },

    getItem(key) {
      const raw = store.getItem(hashKey(key));
      if (raw === null) return null;
      return decrypt(raw);
    },

    removeItem(key) {
      store.removeItem(hashKey(key));
    },

    clear() {
      store.clear();
    },
  };
}

/** Encrypted localStorage — persists across tabs/browser restarts. */
export const secureLocal = makeStore(localStorage);

/** Encrypted sessionStorage — cleared when the tab is closed. */
export const secureSession = makeStore(sessionStorage);
