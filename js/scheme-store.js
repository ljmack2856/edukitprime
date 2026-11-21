// js/scheme-store.js
// Firestore storage for saved schemes and per-lesson edits (see scheme-data-model.md).
//   users/{uid}/schemes/{schemeId}                 settings
//   users/{uid}/schemes/{schemeId}/edits/{editId}  one document per edited lesson
// The page passes in what it already has: your Firestore instance (db), the signed-in uid, and the
// Firestore functions (fs), for example:  import * as fs from ".../firebase-firestore.js"
export class ConflictError extends Error {
  constructor(message) { super(message); this.name = "ConflictError"; }
}

export function createCloudStore({ db, uid, fs }) {
  if (!db || !uid || !fs) throw new Error("createCloudStore needs db, uid and fs");
  const schemeRef = id => fs.doc(db, "users", uid, "schemes", id);
  const editsCol = id => fs.collection(db, "users", uid, "schemes", id, "edits");
  return {
    kind: "cloud",
    async loadSettings(id) {
      const snap = await fs.getDoc(schemeRef(id));
      return snap.exists() ? snap.data() : null;
    },
    // settings.version must be the previous version + 1 (the security rules enforce it).
    async saveSettings(id, settings, meta = {}) {
      const data = {
        ...settings,
        ownerId: uid, schemaVersion: 1, status: "draft",       // "finalized" is set by the server only
        title: String(meta.title || "Untitled scheme").slice(0, 120),
        bundleId: meta.bundleId ?? null,
        updatedAt: fs.serverTimestamp()
      };
      try { await fs.setDoc(schemeRef(id), data); }
      catch (e) {
        if (e && e.code === "permission-denied") throw new ConflictError("This scheme was saved from another device, or the save was refused.");
        throw e;
      }
    },
    async putEdit(id, docId, edit) { await fs.setDoc(fs.doc(editsCol(id), docId), edit); },
    async delEdit(id, docId) { await fs.deleteDoc(fs.doc(editsCol(id), docId)); },
    async loadEdits(id) {
      const q = await fs.getDocs(editsCol(id)), out = {};
      q.forEach(d => { out[d.id] = d.data(); });
      return out;
    },
    async clear(id) {                                          // deletes the edits, then the scheme (drafts only)
      const q = await fs.getDocs(editsCol(id));
      await Promise.all(q.docs.map(d => fs.deleteDoc(d.ref)));
      await fs.deleteDoc(schemeRef(id));
    },
        async listSchemes() {
      const q = await fs.getDocs(fs.collection(db, "users", uid, "schemes")), out = [];
      q.forEach(d => {
        const x = d.data();
        out.push({ id: d.id, title: x.title, bundleId: x.bundleId, year: x.year, term: x.term,
          status: x.status, version: x.version,
          updatedAt: x.updatedAt && x.updatedAt.toDate ? x.updatedAt.toDate().toISOString() : "" });
      });
      return out;
    },
  };
  
}