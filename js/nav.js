document.addEventListener("DOMContentLoaded", () =>
{
    const nav = document.querySelector(".main-nav");
    if (!nav)
    {
        return;
    }

    const list = nav.querySelector("ul");
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const sections = links.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);

    const indicator = document.createElement("span");
    indicator.className = "nav-indicator";
    indicator.setAttribute("aria-hidden", "true");
    list.appendChild(indicator);

    let activeLink = null;
    let hoveredLink = null;

    function moveIndicator(link)
    {
        if (!link)
        {
            indicator.classList.remove("is-on");
            return;
        }

        const linkRect = link.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();

        // the first time it shows up, place it without sliding
        const firstShow = !indicator.classList.contains("is-on");
        if (firstShow)
        {
            indicator.style.transition = "none";
        }

        indicator.style.width = `${linkRect.width}px`;
        indicator.style.transform = `translate(${linkRect.left - listRect.left}px, ${linkRect.bottom - listRect.top - 1}px)`;

        if (firstShow)
        {
            indicator.getBoundingClientRect();
            indicator.style.transition = "";
        }

        indicator.classList.add("is-on");
    }

    function highlight(link)
    {
        hoveredLink = link;
        moveIndicator(link);
    }

    function releaseHighlight()
    {
        hoveredLink = null;
        moveIndicator(activeLink);
    }

    links.forEach(link =>
    {
        link.addEventListener("mouseenter", () => highlight(link));
        link.addEventListener("focus", () => highlight(link));
    });

    list.addEventListener("mouseleave", releaseHighlight);
    list.addEventListener("focusout", event =>
    {
        if (!list.contains(event.relatedTarget))
        {
            releaseHighlight();
        }
    });

    // the current section is the last one whose top has crossed 45% of the viewport
    function updateActiveLink()
    {
        const line = window.innerHeight * 0.45;
        let currentSection = null;

        for (const section of sections)
        {
            if (section.getBoundingClientRect().top <= line)
            {
                currentSection = section;
            }
        }

        let link = null;
        if (currentSection)
        {
            link = links.find(candidate => candidate.getAttribute("href") === `#${currentSection.id}`);
        }

        if (link === activeLink)
        {
            return;
        }

        links.forEach(candidate => candidate.classList.toggle("is-active", candidate === link));
        activeLink = link;

        if (!hoveredLink)
        {
            moveIndicator(activeLink);
        }
    }

    let scrollQueued = false;

    window.addEventListener("scroll", () =>
    {
        if (scrollQueued)
        {
            return;
        }

        scrollQueued = true;
        requestAnimationFrame(() =>
        {
            scrollQueued = false;
            updateActiveLink();
        });
    }, { passive: true });

    function refreshIndicator()
    {
        if (indicator.classList.contains("is-on"))
        {
            moveIndicator(hoveredLink || activeLink);
        }
    }

    // link widths change after the web fonts load
    new ResizeObserver(refreshIndicator).observe(list);
    document.fonts.ready.then(refreshIndicator);

    updateActiveLink();

    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    nav.parentElement.insertBefore(sentinel, nav);

    const stickyObserver = new IntersectionObserver(([entry]) =>
    {
        nav.classList.toggle("is-stuck", !entry.isIntersecting);
    });

    stickyObserver.observe(sentinel);
});
