// Background particle field that drifts slowly and gets pushed away by the cursor.
document.addEventListener("DOMContentLoaded", () =>
{
    const canvas = document.getElementById("bg-particles");
    if (!canvas)
    {
        return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    {
        canvas.remove();
        return;
    }

    const context = canvas.getContext("2d");

    const LINK_DISTANCE = 118;
    const CURSOR_RADIUS = 170;
    const MAX_SPEED = 0.28;

    let width = 0;
    let height = 0;
    let particles = [];
    let color = [61, 70, 77];
    let targetColor = [61, 70, 77];
    let running = true;
    let frameRequest = 0;

    const pointer = { x: -9999, y: -9999, active: false };

    function readColor(animate)
    {
        const value = getComputedStyle(document.documentElement).getPropertyValue("--particle");
        targetColor = value.split(",").map(Number);

        // when the theme changes, the color eases toward the new value instead of snapping
        if (!animate)
        {
            color = targetColor.slice();
        }
    }

    function particleCount()
    {
        // about one particle per 14,000 px², within limits
        const byArea = Math.round((width * height) / 14000);
        return Math.max(36, Math.min(124, byArea));
    }

    function createParticle()
    {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * MAX_SPEED,
            vy: (Math.random() - 0.5) * MAX_SPEED,
            radius: 0.9 + Math.random() * 1.5
        };
    }

    function resize()
    {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const count = particleCount();
        while (particles.length < count)
        {
            particles.push(createParticle());
        }
        particles.length = count;

        for (const particle of particles)
        {
            if (particle.x > width)
            {
                particle.x = Math.random() * width;
            }

            if (particle.y > height)
            {
                particle.y = Math.random() * height;
            }
        }
    }

    function wrap(value, max)
    {
        if (value < -20)
        {
            return max + 20;
        }

        if (value > max + 20)
        {
            return -20;
        }

        return value;
    }

    function step()
    {
        context.clearRect(0, 0, width, height);

        color = color.map((channel, i) => channel + (targetColor[i] - channel) * 0.08);
        const rgb = color.map(Math.round).join(", ");

        for (let i = 0; i < particles.length; i++)
        {
            const particle = particles[i];

            if (pointer.active)
            {
                const dx = particle.x - pointer.x;
                const dy = particle.y - pointer.y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared < CURSOR_RADIUS * CURSOR_RADIUS && distanceSquared > 1)
                {
                    const distance = Math.sqrt(distanceSquared);
                    const push = (1 - distance / CURSOR_RADIUS) * 0.55;
                    particle.vx += (dx / distance) * push;
                    particle.vy += (dy / distance) * push;
                }
            }

            particle.vx *= 0.97;
            particle.vy *= 0.97;

            // keep a minimum drift so they never fully stop
            if (Math.hypot(particle.vx, particle.vy) < 0.04)
            {
                particle.vx += (Math.random() - 0.5) * 0.05;
                particle.vy += (Math.random() - 0.5) * 0.05;
            }

            particle.x = wrap(particle.x + particle.vx, width);
            particle.y = wrap(particle.y + particle.vy, height);

            context.beginPath();
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fillStyle = `rgba(${rgb}, 0.30)`;
            context.fill();

            for (let j = i + 1; j < particles.length; j++)
            {
                const other = particles[j];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared > LINK_DISTANCE * LINK_DISTANCE)
                {
                    continue;
                }

                const alpha = (1 - Math.sqrt(distanceSquared) / LINK_DISTANCE) * 0.11;

                context.beginPath();
                context.moveTo(particle.x, particle.y);
                context.lineTo(other.x, other.y);
                context.strokeStyle = `rgba(${rgb}, ${alpha})`;
                context.lineWidth = 1;
                context.stroke();
            }
        }

        frameRequest = requestAnimationFrame(step);
    }

    function start()
    {
        if (running)
        {
            return;
        }

        running = true;
        frameRequest = requestAnimationFrame(step);
    }

    function stop()
    {
        running = false;
        cancelAnimationFrame(frameRequest);
    }

    window.addEventListener("resize", resize, { passive: true });

    window.addEventListener("pointermove", event =>
    {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
    }, { passive: true });

    window.addEventListener("pointerleave", () =>
    {
        pointer.active = false;
    });

    document.addEventListener("visibilitychange", () =>
    {
        if (document.hidden)
        {
            stop();
        }
        else
        {
            start();
        }
    });

    window.addEventListener("themechange", () => readColor(true));

    readColor(false);
    resize();
    frameRequest = requestAnimationFrame(step);
});
