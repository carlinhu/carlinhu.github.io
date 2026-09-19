// Painting over the subtitle reveals the hidden text behind it.
// The visible text is drawn on a canvas and erased by the brush, so nothing depends
// on a css mask image being swapped every frame.
document.addEventListener("DOMContentLoaded", () =>
{
    const host = document.querySelector(".paint-reveal");
    if (!host)
    {
        return;
    }

    const front = host.querySelector(".paint-front");
    const back = host.querySelector(".paint-back");

    if (!front || !back)
    {
        return;
    }

    const BRUSH_RADIUS = 16; // matches the cursor in css/paint.css

    const canvas = document.createElement("canvas");
    canvas.className = "paint-layer";
    canvas.setAttribute("aria-hidden", "true");

    const context = canvas.getContext("2d");
    if (!context)
    {
        return;
    }

    // each text and the brush live on their own canvas, so the texts can be redrawn
    // after a resize or a theme change without losing what was already painted
    const frontCanvas = document.createElement("canvas");
    const frontContext = frontCanvas.getContext("2d");
    const backCanvas = document.createElement("canvas");
    const backContext = backCanvas.getContext("2d");
    const eraseCanvas = document.createElement("canvas");
    const eraseContext = eraseCanvas.getContext("2d");
    const scratchCanvas = document.createElement("canvas");
    const scratchContext = scratchCanvas.getContext("2d");

    let width = 0;
    let height = 0;
    let scale = 1;
    let painting = false;
    let lastPoint = null;
    let frameRequest = 0;

    function copyOf(source)
    {
        if (!width || !height)
        {
            return null;
        }

        const copy = document.createElement("canvas");
        copy.width = source.width;
        copy.height = source.height;
        copy.getContext("2d").drawImage(source, 0, 0);

        return copy;
    }

    // the browser already laid the text out, so read the lines back from it instead
    // of wrapping again and risking a different break
    function lines(span)
    {
        const node = span.firstChild;
        if (!node)
        {
            return [];
        }

        const text = node.textContent;
        const origin = host.getBoundingClientRect();
        const range = document.createRange();
        const result = [];

        let start = 0;
        let top = null;

        function push(end)
        {
            range.setStart(node, start);
            range.setEnd(node, end);

            const box = range.getBoundingClientRect();
            const content = text.slice(start, end);

            if (content.trim())
            {
                result.push({
                    text: content,
                    x: box.left - origin.left,
                    y: box.top - origin.top + box.height / 2
                });
            }
        }

        for (let i = 0; i < text.length; i++)
        {
            range.setStart(node, i);
            range.setEnd(node, i + 1);

            const box = range.getBoundingClientRect();
            if (!box.width && !box.height)
            {
                continue;
            }

            if (top === null)
            {
                top = box.top;
            }

            // a new line started
            if (Math.abs(box.top - top) > 1)
            {
                push(i);
                start = i;
                top = box.top;
            }
        }

        push(text.length);

        return result;
    }

    function renderText(target, span, color)
    {
        const style = getComputedStyle(host);

        target.setTransform(scale, 0, 0, scale, 0, 0);
        target.clearRect(0, 0, width, height);
        target.font = `${style.fontStyle} ${style.fontWeight} ${parseFloat(style.fontSize)}px ${style.fontFamily}`;
        target.fillStyle = color;
        target.textAlign = "left";
        target.textBaseline = "middle";

        for (const line of lines(span))
        {
            target.fillText(line.text, line.x, line.y);
        }
    }

    function renderTexts()
    {
        renderText(frontContext, front, getComputedStyle(host).color);
        renderText(backContext, back, getComputedStyle(back).color);
    }

    function compose()
    {
        // the visible text, minus whatever has been painted over
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = "source-over";
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(frontCanvas, 0, 0);
        context.globalCompositeOperation = "destination-out";
        context.drawImage(eraseCanvas, 0, 0);

        // the hidden text, only inside what has been painted
        scratchContext.setTransform(1, 0, 0, 1, 0, 0);
        scratchContext.globalCompositeOperation = "source-over";
        scratchContext.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
        scratchContext.drawImage(backCanvas, 0, 0);
        scratchContext.globalCompositeOperation = "destination-in";
        scratchContext.drawImage(eraseCanvas, 0, 0);

        context.globalCompositeOperation = "source-over";
        context.drawImage(scratchCanvas, 0, 0);
    }

    function resize()
    {
        const rect = host.getBoundingClientRect();
        const newWidth = Math.max(1, Math.round(rect.width));
        const newHeight = Math.max(1, Math.round(rect.height));
        const newScale = Math.min(window.devicePixelRatio || 1, 2);

        if (newWidth === width && newHeight === height && newScale === scale)
        {
            return;
        }

        // keep what was already painted
        const previous = copyOf(eraseCanvas);

        width = newWidth;
        height = newHeight;
        scale = newScale;

        for (const target of [canvas, frontCanvas, backCanvas, eraseCanvas, scratchCanvas])
        {
            target.width = Math.round(width * scale);
            target.height = Math.round(height * scale);
        }

        eraseContext.setTransform(scale, 0, 0, scale, 0, 0);

        if (previous)
        {
            eraseContext.drawImage(previous, 0, 0, width, height);
        }

        renderTexts();
        compose();
    }

    function refresh()
    {
        renderTexts();
        compose();
    }

    function stamp(x, y)
    {
        const gradient = eraseContext.createRadialGradient(x, y, 0, x, y, BRUSH_RADIUS);
        gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
        gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.85)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        eraseContext.fillStyle = gradient;
        eraseContext.beginPath();
        eraseContext.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
        eraseContext.fill();
    }

    function paintTo(x, y)
    {
        // fill the gap between pointer events so the stroke stays continuous
        if (lastPoint)
        {
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.hypot(dx, dy);
            const step = BRUSH_RADIUS * 0.3;

            for (let t = step; t < distance; t += step)
            {
                stamp(lastPoint.x + (dx * t) / distance, lastPoint.y + (dy * t) / distance);
            }
        }

        stamp(x, y);
        lastPoint = { x, y };
        requestCompose();
    }

    function requestCompose()
    {
        if (frameRequest)
        {
            return;
        }

        frameRequest = requestAnimationFrame(() =>
        {
            frameRequest = 0;
            compose();
        });
    }

    function pointerPosition(event)
    {
        const rect = host.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function stopPainting()
    {
        painting = false;
        lastPoint = null;
    }

    host.addEventListener("pointerdown", event =>
    {
        if (event.button !== 0)
        {
            return;
        }

        event.preventDefault();
        painting = true;
        lastPoint = null;
        host.setPointerCapture(event.pointerId);

        const point = pointerPosition(event);
        paintTo(point.x, point.y);
    });

    host.addEventListener("pointermove", event =>
    {
        if (!painting)
        {
            return;
        }

        const point = pointerPosition(event);
        paintTo(point.x, point.y);
    });

    host.addEventListener("pointerup", stopPainting);
    host.addEventListener("pointercancel", stopPainting);

    new ResizeObserver(resize).observe(host);
    window.addEventListener("themechange", refresh);
    document.fonts.ready.then(refresh);

    host.appendChild(canvas);
    resize();
    host.classList.add("is-ready");
});
