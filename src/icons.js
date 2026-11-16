const ICONS={
 insights:'<path d="M4 19V5M4 19h16M8 15l4-5 4 2 4-7"/><circle cx="12" cy="10" r="1"/>',
 overview:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 3h4M12 3v3M18 7l1.5-1.5"/>',
 journal:'<rect x="4.5" y="4.5" width="15" height="16" rx="1.5"/><path d="M9 3h6v3H9zM8 11h8M8 15h5"/>',
 progress:'<path d="M2 12h20"/><rect x="5" y="6.5" width="2.6" height="11" rx=".6"/><rect x="8.4" y="8.5" width="1.8" height="7" rx=".5"/><rect x="16.4" y="6.5" width="2.6" height="11" rx=".6"/><rect x="13.8" y="8.5" width="1.8" height="7" rx=".5"/>',
 body:'<circle cx="12" cy="4.6" r="2.3"/><path d="M12 8.2V15M12 15l-3.2 6M12 15l3.2 6M12 9.6 5.5 13M12 9.6l6.5 3.4"/>',
 goals:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
 kettlebell:'<path d="M6 14 4.8 7.6Q4.4 4 8 4h8q3.6 0 3.2 3.6L18 14" stroke-width="2.4"/><path d="M8.6 21.5A6.6 6.6 0 1 1 15.4 21.5Z" fill="currentColor" stroke="none"/>',
 barbell:'<path d="M1.5 12h21"/><rect x="4" y="5.5" width="3" height="13" rx=".7"/><rect x="17" y="5.5" width="3" height="13" rx=".7"/><path d="M8.5 9v6M15.5 9v6"/>'
};
export const icon=name=>`<svg viewBox="0 0 24 24" class="ico" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
