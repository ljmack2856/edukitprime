import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";


/**
 * Create a basic application account for a newly
 * authenticated user, if one does not already exist.
 */
export async function ensureUserProfile(user) {

    if (!user) {
        throw new Error("A signed-in user is required.");
    }

    const userRef = doc(db, "users", user.uid);

    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
        return userSnapshot.data();
    }

    const accountData = {
        userId: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        role: "teacher",
        accountStatus: "active",
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(userRef, accountData);

    return accountData;
}


/**
 * Create a teacher profile during onboarding.
 */
export async function createTeacherProfile(user, profileData) {

    if (!user) {
        throw new Error("A signed-in user is required.");
    }

    const profileRef = doc(db, "teacherProfiles", user.uid);

    const profileSnapshot = await getDoc(profileRef);

    if (profileSnapshot.exists()) {
        throw new Error("A teacher profile already exists.");
    }

    const teacherProfile = {
        fullName: profileData.fullName.trim(),
        schoolName: profileData.schoolName?.trim() || "",
        county: profileData.county,
        subCounty: profileData.subCounty?.trim() || "",
        grades: profileData.grades || [],
        subjects: profileData.subjects || [],
        curriculumSystems: profileData.curriculumSystems || ["Kenya CBE"],
        teachingStyles: profileData.teachingStyles || [],
        preferredLanguage: profileData.preferredLanguage || "English",

        notificationPreferences: {
            curriculumUpdates: true,
            newResources: true,
            announcements: true
        },

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(profileRef, teacherProfile);

    return teacherProfile;
}