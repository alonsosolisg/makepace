import { markdown } from './chat-timeline.js';
export function researchDocument(finding) {
  const root = document.createElement('article');
  root.className = 'research-detail';
  const heading = document.createElement('h2');
  heading.textContent = finding.title;
  root.append(heading);
  const status = document.createElement('p');
  status.className = 'fine';
  status.textContent =
    finding.status === 'observed'
      ? 'Reported original-post observations'
      : 'Hypothesis · needs validation';
  root.append(status, markdown(finding.summary));
  for (const [key, title] of [
    ['audienceFit', 'Audience fit'],
    ['hook', 'Opening hook'],
    ['structure', 'Story structure'],
    ['nextTest', 'Next test'],
  ])
    if (finding[key]) {
      const h = document.createElement('h3');
      h.textContent = title;
      root.append(
        h,
        markdown(
          Array.isArray(finding[key]) ? finding[key].map((x) => '- ' + x).join('\n') : finding[key],
        ),
      );
    }
  if (finding.examples?.length) {
    const h = document.createElement('h3');
    h.textContent = 'Original sources';
    root.append(h);
  }
  for (const sample of finding.examples || []) {
    const section = document.createElement('section');
    section.className = 'research-detail-source';
    const h = document.createElement('h4');
    h.textContent = sample.title || 'Source';
    section.append(h);
    if (sample.observedAt) {
      const date = document.createElement('small');
      date.textContent = 'Observed ' + sample.observedAt;
      section.append(date);
    }
    if (sample.evidence) section.append(markdown(sample.evidence));
    if (typeof sample.url === 'string' && /^https?:\/\//i.test(sample.url)) {
      const a = document.createElement('a');
      a.href = sample.url;
      a.textContent = 'Open original ↗';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      section.append(a);
    }
    root.append(section);
  }
  return root;
}
