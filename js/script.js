/* =========================================
   EDUKITPRIME
   MAIN JAVASCRIPT
========================================= */


document.addEventListener("DOMContentLoaded", () => {


    /* -------------------------------------
       NAVBAR SCROLL BEHAVIOUR
    ------------------------------------- */

    const header = document.getElementById("site-header");


    function updateNavbar() {

        if (window.scrollY > 25) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }

    }


    window.addEventListener("scroll", updateNavbar);

    updateNavbar();



    /* -------------------------------------
       DESKTOP DROPDOWN
    ------------------------------------- */

    const desktopDropdown = document.querySelector(".dropdown");

    const dropdownTrigger = document.querySelector(".dropdown-trigger");


    if (desktopDropdown && dropdownTrigger) {

        dropdownTrigger.addEventListener("click", (event) => {

            event.stopPropagation();

            const isOpen = desktopDropdown.classList.toggle("open");

            dropdownTrigger.setAttribute("aria-expanded", isOpen);

        });


        // Close when clicking outside

        document.addEventListener("click", (event) => {

            if (!desktopDropdown.contains(event.target)) {

                desktopDropdown.classList.remove("open");

                dropdownTrigger.setAttribute("aria-expanded", "false");

            }

        });


        // Close with Escape

        document.addEventListener("keydown", (event) => {

            if (event.key === "Escape") {

                desktopDropdown.classList.remove("open");

                dropdownTrigger.setAttribute("aria-expanded", "false");

            }

        });

    }



    /* -------------------------------------
       MOBILE MENU
    ------------------------------------- */

    const mobileToggle = document.getElementById("mobile-menu-toggle");

    const mobileNav = document.getElementById("mobile-nav");


    if (mobileToggle && mobileNav) {

        mobileToggle.addEventListener("click", () => {

            const isOpen = mobileNav.classList.toggle("open");

            mobileToggle.classList.toggle("active");

            mobileToggle.setAttribute("aria-expanded", isOpen);

            mobileToggle.setAttribute(
                "aria-label",
                isOpen ? "Close navigation menu" : "Open navigation menu"
            );

        });


        // Close mobile menu when a normal navigation link is clicked

        const mobileLinks = mobileNav.querySelectorAll(
            ".mobile-nav-link, .mobile-grade-group a, .mobile-nav-actions a"
        );


        mobileLinks.forEach(link => {

            link.addEventListener("click", () => {

                mobileNav.classList.remove("open");

                mobileToggle.classList.remove("active");

                mobileToggle.setAttribute("aria-expanded", "false");

            });

        });

    }



    /* -------------------------------------
       MOBILE RESOURCE DROPDOWN
    ------------------------------------- */

    const mobileResourcesTrigger = document.getElementById(
        "mobile-resources-trigger"
    );

    const mobileResourcesContent = document.querySelector(
        ".mobile-dropdown-content"
    );


    if (mobileResourcesTrigger && mobileResourcesContent) {

        mobileResourcesTrigger.addEventListener("click", () => {

            const isOpen = mobileResourcesContent.classList.toggle("open");

            mobileResourcesTrigger.classList.toggle("active");

            mobileResourcesTrigger.setAttribute("aria-expanded", isOpen);

        });

    }



    /* -------------------------------------
       CLOSE MOBILE MENU ON RESIZE
    ------------------------------------- */

    window.addEventListener("resize", () => {

        if (window.innerWidth > 1100) {

            mobileNav?.classList.remove("open");

            mobileToggle?.classList.remove("active");

            mobileToggle?.setAttribute("aria-expanded", "false");

        }

    });



    /* -------------------------------------
       FOOTER YEAR
    ------------------------------------- */

    const yearElement = document.getElementById("current-year");

    if (yearElement) {

        yearElement.textContent = new Date().getFullYear();

    }


});