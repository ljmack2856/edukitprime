import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import { auth } from "./firebase.js";
import { ensureUserProfile } from "./user-profile.js";
import { createTeacherProfile } from "./user-profile.js";

// --------------------------------------------------
// ELEMENTS
// --------------------------------------------------

const status = document.getElementById("status");
const message = document.getElementById("message");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const googleBtn = document.getElementById("googleBtn");


// --------------------------------------------------
// FIREBASE CONNECTION TEST
// --------------------------------------------------

status.textContent = "Firebase loaded successfully.";

console.log("Edullumia Firebase Auth initialized.");
console.log("Firebase Auth:", auth);


// --------------------------------------------------
// AUTH STATE
// --------------------------------------------------

onAuthStateChanged(auth, (user) => {

    if (user) {

        console.log("Currently signed in:", user);

        status.textContent =
            `Signed in as: ${user.email || user.displayName}`;

    } else {

        status.textContent = "Firebase connected. No user signed in.";

    }

});


// --------------------------------------------------
// EMAIL/PASSWORD SIGN UP
// --------------------------------------------------

signupBtn.addEventListener("click", async () => {

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        message.textContent = "Enter an email and password.";
        return;
    }

    try {

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        await ensureUserProfile(user);
    

        message.textContent =
            `Account created successfully: ${user.email}`;

    } catch (error) {

        console.error(error);

        message.textContent =
            `Error: ${error.message}`;

    }

});


// --------------------------------------------------
// EMAIL/PASSWORD LOGIN
// --------------------------------------------------

loginBtn.addEventListener("click", async () => {

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        message.textContent = "Enter an email and password.";
        return;
    }

    try {

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;
            await ensureUserProfile(user);

        console.log("Logged in:", user);

        message.textContent =
            `Login successful: ${user.email}`;

    } catch (error) {

        console.error(error);

        message.textContent =
            `Login error: ${error.message}`;

    }

});

// --------------------------------------------------
// GOOGLE SIGN IN
// --------------------------------------------------

googleBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();

    message.textContent = "Connecting to Google...";

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log("Google authentication successful:", {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        });

        message.textContent = "Google sign-in successful. Setting up your profile...";

        try {
            await ensureUserProfile(user);

            console.log("Firestore profile verified or created:", user.uid);

            message.textContent =
                `Google sign-in successful! Welcome ${user.displayName || user.email}.`;

        } catch (profileError) {
            console.error("Google authentication succeeded, but profile creation failed:", profileError);

            message.textContent =
                `Google sign-in succeeded, but saving your profile failed: ${profileError.code || profileError.message}`;
        }

    } catch (error) {
        console.error("Google sign-in failed:", error);

        message.textContent =
            `Google sign-in failed: ${error.code || error.message}`;
    }
});
// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

logoutBtn.addEventListener("click", async () => {

    try {

        await signOut(auth);

        message.textContent = "Logged out successfully.";

    } catch (error) {

        console.error(error);

        message.textContent =
            `Logout error: ${error.message}`;

    }

});
const createTeacherProfileBtn = document.getElementById(
    "createTeacherProfileBtn"
);

if (createTeacherProfileBtn) {
    createTeacherProfileBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        const message = document.getElementById("message");

        if (!user) {
            message.textContent =
                "Please sign in before creating a teacher profile.";
            return;
        }

        createTeacherProfileBtn.disabled = true;
        message.textContent = "Creating teacher profile...";

        try {
            const profileData = {
                fullName: "Test Teacher",
                schoolName: "Edullumia Test School",
                county: "Nakuru",
                subCounty: "Njoro",
                grades: ["Grade 4", "Grade 5"],
                subjects: ["Mathematics", "English"],
                curriculumSystems: ["Kenya CBE"],
                teachingStyles: ["Collaborative learning"],
                preferredLanguage: "English"
            };

            await createTeacherProfile(user, profileData);

            message.textContent =
                "Success! The teacher profile was created in Firestore.";
        } catch (error) {
            console.error("Teacher profile test failed:", error);

            message.textContent =
                "Profile creation failed: " +
                (error.code || error.message);
        } finally {
            createTeacherProfileBtn.disabled = false;
        }
    });
}