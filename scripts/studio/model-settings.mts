export const MODEL = 'gpt-6.1-sol';
export const MODELS = ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-luna'];
export function modelSettings(fast = false, model = MODEL) {
  if (!MODELS.includes(model)) throw Error('Choose Sol, Astra or Luna.');
  return { model, serviceTier: fast ? 'fast' : 'default' };
}
// The harness owns effort; the UI only chooses the model and service speed.
export function taskEffort(task, text = '') {
  if (task === 'research') return 'medium';
  if (/\b(analy[sz]e|strategy|research|batch|campaign|compare|audit)\b/i.test(text)) return 'high';
  if (
    text.length < 240 &&
    /\b(rename|typo|replace|shorten|reword|change the colou?r)\b/i.test(text)
  )
    return 'low';
  return 'medium';
}
export function turnSettings(settings, task, text = '') {
  const checked = modelSettings(settings.serviceTier === 'fast', settings.model);
  const requested = taskEffort(task, text);
  return {
    ...checked,
    effort: checked.model === 'gpt-6-astra' && requested === 'high' ? 'medium' : requested,
  };
}
