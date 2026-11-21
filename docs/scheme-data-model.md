# Saved schemes and per-lesson edits: Firestore data model (v1)

## 1. Design rules

1. **Save settings and the teacher's edits, never the generated scheme.** The scheme is recalculated from settings plus the curriculum bundle every time it is opened.
2. **Edits belong to a stable lesson key**, `<subStrandId>#<k>` (for example `5.3.1#2`, the second lesson of sub-strand 5.3.1). Not a date, not a position in the scheme.
3. **One document per edited lesson**, so autosave writes one small document and two devices editing different lessons never overwrite each other.
4. **Money and exports are server-only.** The browser cannot create entitlements, exports or the `finalized` status.
5. **Store the minimum status** and derive the rest (section 5).

## 2. Paths

```
users/{uid}/schemes/{schemeId}                      settings + status        (browser reads/writes)
users/{uid}/schemes/{schemeId}/edits/{editId}       one per edited lesson    (browser reads/writes)
users/{uid}/schemes/{schemeId}/exports/{exportId}   snapshot per export      (server writes, browser reads)
entitlements/{id}, aiOperations/{id}, aiCreditLedger/{id}                    (server only, as already planned)
```

Why nested under the user, not a top-level `schemes` collection: the path itself proves ownership, so the security rules need no extra `get()` call (each `get()` in a rule is a billed read). The cost is that sharing a scheme with a head teacher later needs a copy or a server-made share; that is acceptable because sharing is not in version 1.

`editId` is the lesson key with `.` changed to `-` and `#` to `_`: `5.3.1#2` becomes `5-3-1_2`. Writing the same lesson twice updates one document.

## 3. Scheme settings document

```json
{
  "ownerId": "uid",
  "schemaVersion": 1,
  "version": 7,
  "title": "Grade 6 English, Term 1 2027",
  "status": "draft",
  "bundleId": "ke-cbe_grade-6_english_v1",
  "grade": "Grade 6",
  "subject": "English",
  "year": 2027,
  "term": "Term 1",
  "calendar": {
    "start": "2027-01-04",
    "end": "2027-04-09",
    "source": "official | school | teacher",
    "sourceNote": "checked against the MoE circular on <date>"
  },
  "timetable": {
    "periods": { "mon": [1, 2], "wed": [3], "fri": [2, 5], "sat": [1] }
  },
  "blocks": [
    {
      "id": "b1",
      "from": "2027-02-15",
      "to": "2027-02-19",
      "periods": null,
      "reason": "Half-term",
      "repeat": null
    },
    {
      "id": "b2",
      "from": "2027-01-04",
      "to": "2027-04-09",
      "periods": [2],
      "reason": "Assembly",
      "repeat": { "weekday": "wed" }
    }
  ],
  "plan": {
    "startSubStrandId": "1.1.1",
    "mode": "squeeze",
    "priorities": { "Grammar in Use": "more" },
    "locks": { "5.3.1": 2 },
    "skips": { "6.1.1": true }
  },
  "styles": ["Collaborative learning", "Practical learning"],
  "ai": { "enabled": true },
  "header": { "school": "", "teacher": "", "className": "Grade 6" },
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "finalizedAt": null,
  "archivedAt": null
}
```

`timetable.periods` and `blocks` are the "per-day lesson-number model": a lesson slot is identified by `(date, period)`. A block with `periods: null` removes the whole day; `periods: [2]` removes only period 2; `repeat` turns it into a weekly rule. Keep this document well under 50 KB.

## 4. Edit document

```json
{
  "lessonKey": "5.3.1#2",
  "subStrandId": "5.3.1",
  "k": 2,
  "fields": {
    "learningExperiences": "...",
    "resources": "Oxford Learner's Book 6, pages 40-41",
    "assessment": "...",
    "reflection": "..."
  },
  "basis": "n3|o1-3|e2-4",
  "source": "manual",
  "style": null,
  "editedAt": "timestamp"
}
```

- `fields` holds only what the teacher changed. `reflection` is teacher-only text and is never regenerated.
- `basis` is a fingerprint of what the generated lesson contained when the teacher edited it (which outcomes and activities, and how many lessons the sub-strand had).
- AI text the teacher accepts is saved here with `source: "ai"`. AI text the teacher does not accept is not stored in the scheme; the server may cache it separately by hash.
- Textbook titles and page numbers are always teacher input.

## 5. Status

Store only `draft`, `finalized`, `archived`. Show your five labels in the interface, derived:

| Label shown    | How it is derived                                               |
| -------------- | --------------------------------------------------------------- |
| Draft          | status = draft and no export exists                             |
| Generated      | status = draft and an export exists                             |
| Teacher-edited | any edit document exists (a flag shown beside the status)       |
| Finalized      | status = finalized (set by the server after payment and export) |
| Archived       | status = archived                                               |

Stored "generated" and "teacher-edited" statuses can disagree with reality (delete all edits and the label is wrong). Derived ones cannot.

## 6. What happens to edits when settings change

After every recalculation the app builds the list of lessons and compares edits with it (`reconcile` in `scheme-edits.js`):

| Situation                                                                                                           | Result                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Dates, holidays or timetable change; allocations unchanged                                                          | **placed**, nothing changes                                                                                             |
| The key exists but the lesson now covers different outcomes or activities (the sub-strand went from 3 lessons to 2) | **stale**: still applied, flagged "content changed since you edited it"                                                 |
| The sub-strand is in the scheme but that lesson number no longer exists (3 lessons became 2, edit was on lesson 3)  | **unplaced**: shown in a tray; the teacher moves it to another lesson of the same sub-strand, merges it, or discards it |
| The sub-strand is not in the scheme (skipped, before the start point, dropped)                                      | **dormant**: kept, hidden, and it reappears automatically if the sub-strand comes back                                  |

Nothing is deleted without the teacher's say-so.

## 7. Loading and saving

- **Open:** read the scheme document, its edit documents (only edited lessons), and the curriculum parts the schedule needs. Cache the parts on the device by `bundleId` and import time.
- **Autosave an edit:** debounce 1 to 2 seconds, then one write to one edit document.
- **Save settings:** write with `version = previous + 1`. The rules reject the write if another device saved first; the app reloads and asks the teacher to review.
- **Delete a draft:** the browser may delete only the scheme document; deleting its edits is done by a Cloud Function (or by the app first, edit by edit).

## 8. Export and finalize (server only)

1. Teacher presses Create. The function checks sign-in, entitlement or wallet, and the scheme `version`.
2. It builds the schedule, applies the edits, generates DOCX and PDF, and stores them privately with a short-lived link.
3. It writes `exports/{id}` with a copy of the settings, a hash of the edits, the bundle id and the format.
4. If the teacher chose "Finalize", it sets `status: "finalized"`. Further changes to the same scheme are a new version (a copy), not an overwrite. What a new version costs is still open (section 11).

## 9. Security rules (not yet tested: try them in the console Rules Playground or the emulator)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function mine(uid) { return request.auth != null && request.auth.uid == uid; }
    function okSettings(d) {
      return d.ownerId == request.auth.uid
        && d.status in ['draft', 'archived']
        && d.title is string && d.title.size() <= 120
        && d.version is int;
    }
    match /users/{uid}/schemes/{schemeId} {
      allow read: if mine(uid);
      allow create: if mine(uid) && okSettings(request.resource.data)
                    && request.resource.data.status == 'draft' && request.resource.data.version == 1;
      allow update: if mine(uid)
                    && request.resource.data.ownerId == resource.data.ownerId
                    && request.resource.data.version == resource.data.version + 1
                    && ( (resource.data.status != 'finalized' && okSettings(request.resource.data))
                      || (resource.data.status == 'finalized' && request.resource.data.status == 'archived'
                          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'version', 'updatedAt'])) );
      allow delete: if mine(uid) && resource.data.status == 'draft';

      match /edits/{editId} {
        allow read, delete: if mine(uid);
        allow create, update: if mine(uid)
          && request.resource.data.keys().hasOnly(['lessonKey', 'subStrandId', 'k', 'fields', 'basis', 'source', 'style', 'editedAt'])
          && request.resource.data.lessonKey is string && request.resource.data.lessonKey.size() <= 40
          && request.resource.data.fields is map && request.resource.data.fields.size() <= 8
          && request.resource.data.source in ['manual', 'ai'];
      }
      match /exports/{exportId} {
        allow read: if mine(uid);
        allow write: if false;
      }
    }
  }
}
```

Rules cannot measure string length inside `fields`, so the app must cap each field (for example 4,000 characters) and the number of edits per scheme. Entitlements, AI operations and the credit ledger stay closed to browsers (`allow read, write: if false`).

## 10. Cost per action (documents read or written)

| Action                     | Reads                                                                                                               | Writes                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Open a scheme              | 1 + E (edited lessons) + P (curriculum parts needed, up to 13 for English, fewer when starting mid-year; cacheable) | 0                                  |
| Change settings            | 0                                                                                                                   | 1                                  |
| Edit one lesson (autosave) | 0                                                                                                                   | 1                                  |
| Export                     | server-side reads                                                                                                   | 1 export document + 1 status write |

## 11. Decisions still open

1. After finalizing, is a changed scheme a paid new version, a free re-export of the same version, or a discounted copy?
2. How long are exports kept, and can a teacher delete their data?
3. Sharing a scheme with a head teacher or colleague (not in version 1).
4. Which fields a teacher may edit on an AI-generated lesson, and whether "reset to generated" is offered per field.
