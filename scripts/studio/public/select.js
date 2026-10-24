// Native elements retain form values; all visible interaction uses this listbox.
export function customSelect(select, renderTrigger, renderOption) {
  if (select.dataset.customSelect) return;
  select.dataset.customSelect = 'true';
  const wrapper = document.createElement('span');
  wrapper.className = 'custom-select';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'select-trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const label = [...(select.labels?.[0]?.childNodes || [])].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
  trigger.setAttribute('aria-label', select.getAttribute('aria-label') || label || 'Choose an option');
  const menu = document.createElement('span');
  menu.className = 'select-menu';
  menu.id = `${select.id}-options`;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', trigger.getAttribute('aria-label'));
  menu.hidden = true;
  trigger.setAttribute('aria-controls', menu.id);
  select.before(wrapper);
  wrapper.append(select, trigger, menu);
  select.hidden = true;
  let active = 0, search = '', timer;
  const options = () => [...select.options];
  function highlight(index) {
    active = index;
    [...menu.children].forEach((item, i) => item.classList.toggle('highlighted', i === active));
    if (!menu.hidden && menu.children[active]) {
      trigger.setAttribute('aria-activedescendant', menu.children[active].id);
      menu.children[active].scrollIntoView({block:'nearest'});
    }
  }
  function close() {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
  }
  function sync() {
    if (typeof renderTrigger === 'function') renderTrigger(trigger, select.selectedOptions[0]);
    else trigger.textContent = select.selectedOptions[0]?.textContent || 'Choose…';
    trigger.disabled = select.disabled || !select.options.length;
    menu.replaceChildren(...options().map((option, i) => {
      const item = document.createElement('span');
      item.id = `${menu.id}-${i}`;
      item.className = 'select-option';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.selected));
      item.setAttribute('aria-disabled', String(option.disabled));
      if (typeof renderOption === 'function') renderOption(item, option);
      else item.textContent = option.textContent;
      item.onpointerdown = e => e.preventDefault();
      item.onpointermove = () => { if (!option.disabled) highlight(i); };
      item.onclick = () => choose(i);
      return item;
    }));
  }
  function choose(index) {
    if (!options()[index] || options()[index].disabled) return;
    const changed = select.selectedIndex !== index;
    select.selectedIndex = index;
    sync(); close(); trigger.focus();
    if (changed) select.dispatchEvent(new Event('change', {bubbles:true}));
  }
  function open() {
    if (trigger.disabled) return;
    sync(); menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    highlight(Math.max(0, select.selectedIndex));
  }
  trigger.onclick = () => menu.hidden ? open() : close();
  trigger.onkeydown = e => {
    if (e.key === 'Escape' || e.key === 'Tab') { close(); return; }
    if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
      e.preventDefault();
      const wasClosed = menu.hidden;
      if (wasClosed) open();
      const enabled = options().map((o,i) => o.disabled ? -1 : i).filter(i => i >= 0);
      const position = enabled.indexOf(active);
      const index = e.key === 'Home' ? enabled[0] : e.key === 'End' ? enabled.at(-1) : enabled[Math.max(0, Math.min(enabled.length-1, position + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (index !== undefined && (!wasClosed || ['Home','End'].includes(e.key))) highlight(index);
    } else if (e.key === 'Enter' || (e.key === ' ' && !search)) {
      e.preventDefault(); menu.hidden ? open() : choose(active);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); if (menu.hidden) open();
      search += e.key.toLowerCase(); clearTimeout(timer);
      timer = setTimeout(() => search = '', 600);
      const index = options().findIndex(o => !o.disabled && o.textContent.toLowerCase().startsWith(search));
      if (index >= 0) highlight(index);
    }
  };
  document.addEventListener('pointerdown', e => { if (!wrapper.contains(e.target)) close(); });
  wrapper.addEventListener('focusout', e => { if (!wrapper.contains(e.relatedTarget)) close(); });
  select.addEventListener('change', sync);
  new MutationObserver(sync).observe(select, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled','selected']});
  sync();
}
