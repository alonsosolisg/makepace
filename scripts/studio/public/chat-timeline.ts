const node = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  cls?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
// DOM-only Markdown subset: model text is never interpreted as HTML.
export function inline(parent, text) {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g;
  let start = 0;
  for (const m of text.matchAll(pattern)) {
    parent.append(document.createTextNode(text.slice(start, m.index)));
    const token = m[0];
    if (token.startsWith('`')) parent.append(node('code', token.slice(1, -1)));
    else if (token.startsWith('**')) parent.append(node('strong', token.slice(2, -2)));
    else {
      const [, label, url] = token.match(/^\[([^\]]+)\]\((.+)\)$/);
      if (/^https?:\/\//i.test(url)) {
        const a = node('a', label);
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        parent.append(a);
      } else parent.append(node('span', label + ' (' + url + ')'));
    }
    start = m.index + token.length;
  }
  parent.append(document.createTextNode(text.slice(start)));
}
export function markdown(text) {
  const root = node('div', undefined, 'message-prose'),
    lines = String(text || '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith('```')) {
      const pre = node('pre'),
        code = node('code');
      let value = [];
      while (++i < lines.length && !lines[i].startsWith('```')) value.push(lines[i]);
      code.textContent = value.join('\n');
      pre.append(code);
      root.append(pre);
      continue;
    }
    if (line.includes('|') && /^\s*\|?\s*:?-{3}/.test(lines[i + 1] || '')) {
      const wrap = node('div', undefined, 'message-table'),
        table = node('table');
      const cells = (l) =>
        l
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((s) => s.trim());
      const head = node('thead'),
        tr = node('tr');
      cells(line).forEach((t) => {
        const c = node('th');
        inline(c, t);
        tr.append(c);
      });
      head.append(tr);
      table.append(head);
      i++;
      const body = node('tbody');
      while (i + 1 < lines.length && lines[i + 1].includes('|')) {
        const r = node('tr');
        cells(lines[++i]).forEach((t) => {
          const c = node('td');
          inline(c, t);
          r.append(c);
        });
        body.append(r);
      }
      table.append(body);
      wrap.append(table);
      root.append(wrap);
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)/);
    if (heading) {
      const h = node(('h' + Math.min(heading[1].length + 1, 4)) as 'h2' | 'h3' | 'h4');
      inline(h, heading[2]);
      root.append(h);
      continue;
    }
    if (/^\s*(?:[-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\s*\d+\./.test(line),
        list = node(ordered ? 'ol' : 'ul');
      do {
        const li = node('li');
        inline(li, lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
        list.append(li);
        i++;
      } while (i < lines.length && (ordered ? /^\s*\d+\.\s/ : /^\s*[-*]\s/).test(lines[i]));
      i--;
      root.append(list);
      continue;
    }
    const p = node(line.startsWith('> ') ? 'blockquote' : 'p');
    inline(p, line.replace(/^> /, ''));
    root.append(p);
  }
  return root;
}
export function renderTimeline(box: HTMLElement, messages, active, key) {
  const switched = box.dataset.conversation !== key;
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const lastUser = messages.filter((m) => m.role === 'user').at(-1)?.id;
  const sent = !switched && lastUser !== box.dataset.lastUser;
  const opened = new Set(
    [...box.querySelectorAll<HTMLElement>('details[open]')].map((e) => e.dataset.group),
  );
  const oldScroll = box.scrollTop,
    fragment = document.createDocumentFragment();
  let group: HTMLDetailsElement | null = null;
  for (const [index, m] of messages.entries()) {
    if (m.role === 'tool') {
      if (!group) {
        group = node('details', undefined, 'tool-group');
        group.dataset.group = m.id || String(index);
        group.open = opened.has(group.dataset.group);
        group.append(node('summary'), node('div', undefined, 'tool-list'));
        fragment.append(group);
      }
      const row = node('div', undefined, 'tool-row');
      row.dataset.status = m.status;
      if (['OneUp', 'Apify'].includes(m.service)) {
        const image = node('img');
        image.src = '/__studio/providers/' + m.service.toLowerCase() + '.svg';
        image.alt = m.service;
        row.append(image);
      } else row.append(node('span', m.service, 'tool-service'));
      row.append(
        node('span', m.label, 'tool-label'),
        node(
          'span',
          m.status === 'running'
            ? 'Working'
            : m.status === 'failed'
              ? 'Failed'
              : m.status === 'interrupted'
                ? 'Interrupted'
                : 'Done',
          'tool-state',
        ),
      );
      group.lastElementChild.append(row);
      const count = group.lastElementChild.children.length,
        running = !!group.querySelector<HTMLElement>('[data-status="running"]'),
        failed = !!group.querySelector<HTMLElement>('[data-status="failed"]');
      group.firstChild.textContent =
        (running ? 'Working' : failed ? 'Activity needs attention' : 'Activity') +
        ' · ' +
        count +
        ' ' +
        (count === 1 ? 'step' : 'steps');
      continue;
    }
    group = null;
    if (m.role === 'output' && m.output) {
      const card = node('button', undefined, 'chat-output-card');
      card.append(
        node('span', m.output.kind + ' · Saved output', 'output-kind'),
        node('strong', m.output.title + ' ↗'),
      );
      card.onclick = () =>
        document.dispatchEvent(
          new CustomEvent('makepace-open-output', { detail: { id: m.output.id } }),
        );
      fragment.append(card);
      continue;
    }
    const e = node('article', undefined, 'message ' + m.role);
    e.dataset.message = m.id || String(index);
    if (m.role === 'assistant') e.append(markdown(m.text));
    else e.append(node('div', m.text, 'message-text'));
    fragment.append(e);
  }
  if (active) {
    const live = node('div', undefined, 'turn-live');
    live.setAttribute('role', 'status');
    live.append(
      node('span', undefined, 'working-dot'),
      node('span', active.activity || 'Thinking through your request…'),
    );
    fragment.append(live);
  }
  fragment.append(node('div', undefined, 'conversation-breathing-room'));
  box.replaceChildren(fragment);
  box.dataset.conversation = key;
  box.dataset.lastUser = lastUser || '';
  if (switched || sent || near) box.scrollTop = box.scrollHeight;
  else box.scrollTop = oldScroll;
  let jump = box.parentElement.querySelector<HTMLElement>('.jump-latest');
  if (!jump) {
    jump = node('button', '↓ Latest', 'jump-latest');
    jump.onclick = () => {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    };
    box.after(jump);
    box.addEventListener(
      'scroll',
      () => {
        jump.hidden = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
      },
      { passive: true },
    );
  }
  jump.hidden = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
}
