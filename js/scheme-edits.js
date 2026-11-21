/* EduKitPrime: scheme-edits.js (canonical copy, v2)
   Stable lesson keys, per-lesson content splitting, field validation, and reconciling a teacher's
   saved edits with a recalculated schedule.
   Works in the browser (window.SchemeEdits) and in Node (module.exports).
   Self-test:  node scheme-edits.js --test

   API matches scheme-builder.html and docs/scheme-data-model.md:
     edit document = { lessonKey, subStrandId, k, fields, basis, source, style, editedAt }
     reconcile(lessons, edits) -> { placed, stale, unplaced, dormant }
   No Firestore code lives here.                                                                    */
(function () {
  "use strict";

  // Fields a teacher may edit. Outcome wording and sub-strand identity come from KICD and are not editable.
  const ALLOWED_EDIT_FIELDS = ["learningExperiences", "activities", "resources", "assessment", "reflection"];
  const FIELD_LABELS = {
    learningExperiences: "Learning experiences", activities: "Teaching activities", resources: "Learning resources",
    assessment: "Assessment methods", reflection: "Reflection"
  };
  const MAX_FIELD_CHARS = 4000;   // Firestore rules cannot measure string length, so the app enforces it
  const MAX_FIELDS = 8;           // matches the security rule: fields.size() <= 8

  const lessonKey = (subStrandId, k) => subStrandId + "#" + k;
  const editDocId = key => key.replace(/\./g, "-").replace("#", "_");

  // Which items [a, b) of `total` items does lesson k of n cover? Even split, at least one item each.
  // When there are fewer items than lessons, neighbouring lessons share an item.
  function splitRange(total, n, k) {
    if (!total || !n) return [0, 0];
    let a = Math.floor(((k - 1) * total) / n), b = Math.floor((k * total) / n);
    if (a >= total) a = total - 1;
    if (b <= a) b = a + 1;
    return [a, Math.min(b, total)];
  }

  // Fingerprint of what a generated lesson contains. Changes when the sub-strand's lesson count changes.
  function splitSignature(counts, k, of) {
    const r = t => splitRange(t, of, k).join("-");
    return "n" + of + "|o" + r(counts.outcomes) + "|e" + r(counts.experiences);
  }

  // items come from the engine's assign(): { u: unit | null, k, of }.
  // countsById: { subStrandId: { outcomes, experiences } }.
  // k and of are decided by the engine; for a term slice of a longer sub-strand, k must be the lesson
  // number within the whole sub-strand allocation, not within the term, so keys stay stable across terms.
  function lessonsFromItems(items, countsById) {
    let rev = 0;
    return items.map(it => {
      if (!it.u) { rev++; return { lessonKey: "revision#" + rev, subStrandId: "revision", k: rev, of: null, basis: "revision" }; }
      const c = countsById[it.u.id] || { outcomes: 0, experiences: 0 };
      return { lessonKey: lessonKey(it.u.id, it.k), subStrandId: it.u.id, k: it.k, of: it.of, basis: splitSignature(c, it.k, it.of) };
    });
  }

  // Sort every saved edit into placed / stale / unplaced / dormant. Nothing is ever deleted here.
  function reconcile(lessons, edits) {
    const byKey = new Map(lessons.map(l => [l.lessonKey, l])), present = new Set(lessons.map(l => l.subStrandId));
    const out = { placed: [], stale: [], unplaced: [], dormant: [] };
    edits.forEach(e => {
      const l = byKey.get(e.lessonKey);
      if (l) (e.basis && e.basis !== l.basis ? out.stale : out.placed).push({ edit: e, lesson: l });
      else if (present.has(e.subStrandId)) out.unplaced.push({ edit: e, reason: "lesson-removed" });
      else out.dormant.push({ edit: e, reason: "sub-strand-not-in-scheme" });
    });
    return out;
  }

  const suggestTargets = (edit, lessons) => lessons.filter(l => l.subStrandId === edit.subStrandId).map(l => l.lessonKey);

  // Combine two field sets without losing text: empty takes the other, strings are joined, arrays concatenated.
  function mergeFields(a, b) {
    const out = { ...a };
    Object.keys(b || {}).forEach(f => {
      if (out[f] == null || out[f] === "") out[f] = b[f];
      else if (typeof out[f] === "string" && typeof b[f] === "string" && b[f]) out[f] = out[f] + "\n\n" + b[f];
      else if (Array.isArray(out[f]) && Array.isArray(b[f])) out[f] = out[f].concat(b[f]);
    });
    return out;
  }

  // Move an unplaced edit onto a lesson; if that lesson already has an edit, merge the two.
  function moveEdit(edit, lesson, existing) {
    const moved = { ...edit, lessonKey: lesson.lessonKey, subStrandId: lesson.subStrandId, k: lesson.k, basis: lesson.basis };
    if (existing) moved.fields = mergeFields(existing.fields, edit.fields);
    return moved;
  }

  // Checks a `fields` object before it is saved. The error text is written for the teacher.
  function validateEditFields(fields) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) return { valid: false, error: "Edit fields must be an object." };
    const keys = Object.keys(fields);
    if (keys.length > MAX_FIELDS) return { valid: false, error: "Too many fields in one edit." };
    for (const key of keys) {
      const label = FIELD_LABELS[key] || key;
      if (!ALLOWED_EDIT_FIELDS.includes(key)) return { valid: false, error: "The field \u201c" + key + "\u201d cannot be edited." };
      if (typeof fields[key] !== "string") return { valid: false, error: label + " must be text." };
      if (fields[key].length > MAX_FIELD_CHARS) return { valid: false, error: label + " is too long (" + fields[key].length + " characters; the limit is " + MAX_FIELD_CHARS + ")." };
    }
    return { valid: true };
  }

  const api = {
    lessonKey, editDocId, splitRange, splitSignature, lessonsFromItems, reconcile, suggestTargets,
    mergeFields, moveEdit, validateEditFields, ALLOWED_EDIT_FIELDS, FIELD_LABELS, MAX_FIELD_CHARS
  };
  if (typeof window !== "undefined") window.SchemeEdits = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  /* ---------------- self-test: node scheme-edits.js --test ---------------- */
  if (typeof process !== "undefined" && process.argv && process.argv.includes("--test")) {
    let pass = 0, fail = 0;
    const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || "not equal") + ": got " + JSON.stringify(a) + ", expected " + JSON.stringify(b)); };
    const ok = (c, m) => { if (!c) throw new Error(m || "assertion failed"); };
    const test = (name, fn) => { try { fn(); pass++; console.log("PASS", name); } catch (e) { fail++; console.log("FAIL", name, "-", e.message); } };

    test("lesson key and document id", () => {
      eq(lessonKey("5.3.1", 2), "5.3.1#2"); eq(editDocId("5.3.1#2"), "5-3-1_2");
      ok(editDocId("1.1.1#1") !== editDocId("11.1#1"), "ids collide");
    });
    test("splitRange: 5 items over 3 lessons", () => { eq([1, 2, 3].map(k => splitRange(5, 3, k)), [[0, 1], [1, 3], [3, 5]]); });
    test("splitRange: no gaps or overlaps whenever lessons <= items", () => {
      for (let total = 1; total <= 12; total++) for (let n = 1; n <= total; n++) {
        let prev = 0;
        for (let k = 1; k <= n; k++) { const [a, b] = splitRange(total, n, k); eq(a, prev, "gap/overlap at " + total + "/" + n + "/" + k); ok(b > a, "empty range"); prev = b; }
        eq(prev, total, "items not all covered for " + total + "/" + n);
      }
    });
    test("splitRange: fewer items than lessons still gives each lesson something", () => {
      for (let k = 1; k <= 4; k++) { const [a, b] = splitRange(2, 4, k); ok(b > a && a >= 0 && b <= 2, "lesson " + k); }
    });
    test("splitRange: no items", () => { eq(splitRange(0, 3, 1), [0, 0]); });
    test("signature changes when the lesson count changes", () => {
      const c = { outcomes: 5, experiences: 7 };
      ok(splitSignature(c, 1, 3) !== splitSignature(c, 1, 2));
      eq(splitSignature(c, 1, 3), splitSignature(c, 1, 3));
    });
    test("lessonsFromItems: keys, basis, revision lessons", () => {
      const u = { id: "5.3.1" };
      const ls = lessonsFromItems([{ u, k: 1, of: 2 }, { u, k: 2, of: 2 }, { u: null }, { u: null }], { "5.3.1": { outcomes: 3, experiences: 5 } });
      eq(ls.map(l => l.lessonKey), ["5.3.1#1", "5.3.1#2", "revision#1", "revision#2"]);
      eq(ls[2].basis, "revision");
    });
    test("reconcile: placed, stale, unplaced, dormant", () => {
      const u = { id: "5.3.1" }, counts = { "5.3.1": { outcomes: 3, experiences: 5 } };
      const ls = lessonsFromItems([{ u, k: 1, of: 2 }, { u, k: 2, of: 2 }], counts);
      const r = reconcile(ls, [
        { lessonKey: "5.3.1#1", subStrandId: "5.3.1", basis: ls[0].basis },
        { lessonKey: "5.3.1#2", subStrandId: "5.3.1", basis: "n3|o0-1|e0-2" },
        { lessonKey: "5.3.1#3", subStrandId: "5.3.1", basis: "x" },
        { lessonKey: "6.1.1#1", subStrandId: "6.1.1", basis: "x" }
      ]);
      eq([r.placed.length, r.stale.length, r.unplaced.length, r.dormant.length], [1, 1, 1, 1]);
      eq(r.unplaced[0].reason, "lesson-removed");
    });
    test("reconcile: an edit with no basis counts as placed", () => {
      const ls = lessonsFromItems([{ u: { id: "1.1.1" }, k: 1, of: 1 }], {});
      eq(reconcile(ls, [{ lessonKey: "1.1.1#1", subStrandId: "1.1.1" }]).placed.length, 1);
    });
    test("reconcile: a dormant edit returns when its sub-strand is added back", () => {
      const e = { lessonKey: "6.1.1#1", subStrandId: "6.1.1" };
      eq(reconcile([], [e]).dormant.length, 1);
      eq(reconcile(lessonsFromItems([{ u: { id: "6.1.1" }, k: 1, of: 1 }], {}), [e]).placed.length, 1);
    });
    test("suggestTargets only offers lessons of the same sub-strand", () => {
      const ls = lessonsFromItems([{ u: { id: "5.3.1" }, k: 1, of: 2 }, { u: { id: "5.3.1" }, k: 2, of: 2 }, { u: { id: "6.1.1" }, k: 1, of: 1 }], {});
      eq(suggestTargets({ subStrandId: "5.3.1" }, ls), ["5.3.1#1", "5.3.1#2"]);
    });
    test("mergeFields keeps both texts", () => {
      eq(mergeFields({ resources: "Book A", reflection: "" }, { resources: "Book B", reflection: "Went well", assessment: "Quiz" }),
        { resources: "Book A\n\nBook B", reflection: "Went well", assessment: "Quiz" });
    });
    test("moveEdit retargets the edit and merges with an existing one", () => {
      const lesson = { lessonKey: "5.3.1#2", subStrandId: "5.3.1", k: 2, basis: "b" };
      const m = moveEdit({ lessonKey: "5.3.1#3", subStrandId: "5.3.1", k: 3, fields: { reflection: "mine" } }, lesson, { fields: { reflection: "theirs" } });
      eq([m.lessonKey, m.k, m.basis], ["5.3.1#2", 2, "b"]); eq(m.fields.reflection, "theirs\n\nmine");
    });
    test("validateEditFields", () => {
      ok(validateEditFields({ reflection: "x", resources: "y" }).valid);
      ok(validateEditFields({ reflection: "a".repeat(4000) }).valid, "4000 allowed");
      ok(!validateEditFields({ reflection: "a".repeat(4001) }).valid, "4001 rejected");
      ok(!validateEditFields({ password: "1" }).valid, "unknown field");
      ok(!validateEditFields({ reflection: 5 }).valid, "non-text");
      ok(!validateEditFields(null).valid && !validateEditFields([]).valid);
      ok(/Reflection/.test(validateEditFields({ reflection: "a".repeat(4001) }).error), "error names the field");
    });
    console.log("\n" + pass + " passed, " + fail + " failed");
    if (fail) process.exitCode = 1;
  }
})();