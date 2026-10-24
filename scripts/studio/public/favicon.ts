export function faviconWebsite(value) {
  try {
    value = value.trim();
    if (!value || /\s/.test(value)) return '';
    const url = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
    const labels = url.hostname.split('.');
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      labels.length < 2
    )
      return '';
    if (!labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return '';
    if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/i.test(labels.at(-1))) return '';
    return url.origin;
  } catch {
    return '';
  }
}
export function liveFavicon(input) {
  const slot = document.createElement('span');
  slot.className = 'website-favicon';
  slot.setAttribute('aria-hidden', 'true');
  const fallback = input.previousElementSibling;
  fallback.replaceWith(slot);
  slot.append(fallback);
  let timer,
    controller,
    version = 0,
    last = '',
    complete = false,
    pending = false,
    retries = 0;
  const websiteValue = () => faviconWebsite(input.value);
  function loadIcon(url, signal) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.alt = '';
      image.referrerPolicy = 'no-referrer';
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        image.onload = image.onerror = null;
        error ? reject(error) : resolve(image);
      };
      const abort = () => {
        image.src = '';
        finish(Error('Cancelled'));
      };
      const timeout = setTimeout(() => finish(Error('Icon timed out')), 3500);
      signal.addEventListener('abort', abort, { once: true });
      image.onerror = () => finish(Error('Icon unavailable'));
      image.onload = async () => {
        try {
          await image.decode();
          if (signal.aborted || !image.naturalWidth) throw Error('Invalid icon');
          finish();
        } catch (e) {
          finish(e);
        }
      };
      image.src = url;
    });
  }
  function update() {
    const website = websiteValue();
    if (website === last && (pending || complete)) return;
    if (website !== last) {
      last = website;
      retries = 0;
    }
    const request = ++version;
    clearTimeout(timer);
    controller?.abort();
    complete = false;
    pending = Boolean(website);
    slot.replaceChildren(fallback);
    slot.classList.remove('has-favicon');
    if (!website) return;
    timer = setTimeout(async () => {
      const abort = new AbortController();
      controller = abort;
      try {
        const r = await fetch('/api/studio/favicon?website=' + encodeURIComponent(website), {
          signal: abort.signal,
        });
        if (!r.ok) throw Error('Lookup unavailable');
        const { icons } = await r.json();
        // A broken first candidate must not block a working favicon for several seconds.
        const image = await Promise.any(icons.map((url) => loadIcon(url, abort.signal)));
        if (request !== version || !input.isConnected) return;
        slot.replaceChildren(image);
        slot.classList.add('has-favicon');
        complete = true;
      } catch {
        /* Keep the fallback and retry a transient first lookup without requiring blur. */
      } finally {
        abort.abort();
        if (request === version) {
          pending = false;
          if (!complete && input.isConnected && retries < 2) {
            retries++;
            timer = setTimeout(update, 900);
          }
        }
      }
    }, 450);
  }
  input.addEventListener('input', update);
  input.addEventListener('change', update);
  input.addEventListener('paste', () => setTimeout(update, 0));
  // Autofill may populate the field just after mounting without an input event.
  const autofill = setInterval(() => {
    if (!input.isConnected) {
      clearInterval(autofill);
      clearTimeout(timer);
      controller?.abort();
      return;
    }
    if (websiteValue() !== last) update();
  }, 350);
  update();
}
