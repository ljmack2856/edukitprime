document.addEventListener("DOMContentLoaded", () => {

    const HOME_PAGE = "index.html";
    const INTRO_KEY = "edukitprime_intro_seen";

    const skipButton = document.querySelector(".skip-intro");

    // If the introduction has already played in this session,
    // proceed directly to the homepage.
    if (sessionStorage.getItem(INTRO_KEY) === "true") {
        window.location.replace(HOME_PAGE);
        return;
    }

    // Mark the introduction as viewed.
    sessionStorage.setItem(INTRO_KEY, "true");

    // Duration of the welcome animation.
    const INTRO_DURATION = 5500;

    // Automatically proceed after the animation.
    const introTimer = setTimeout(() => {
        window.location.replace(HOME_PAGE);
    }, INTRO_DURATION);

    // Allow visitors to skip the animation.
    if (skipButton) {

        skipButton.addEventListener("click", () => {

            clearTimeout(introTimer);

            window.location.replace(HOME_PAGE);

        });

    }

});