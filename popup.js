// popup.js
const textarea = document.getElementById('profiles');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const indexSpan = document.getElementById('index');
const totalSpan = document.getElementById('total');
const currentUrlDiv = document.getElementById('currentUrl');

let profiles = [];
let currentIndex = 0;
let intervalId = null;
const INTERVAL_MS = 3000; // 3 Sekunden

// Helper: normalisiere Zeile zu vollständiger URL
function normalizeToInstagramUrl(line) {
  line = line.trim();
  if (!line) return null;
  // falls bereits vollständige URL
  if (line.startsWith('http://') || line.startsWith('https://')) {
    return line;
  }
  // möglicherweise nur mit führendem slash
  line = line.replace(/^\/+|\/+$/g, '');
  return `https://www.instagram.com/${encodeURIComponent(line)}/`;
}

function updateStatus() {
  indexSpan.textContent = currentIndex;
  totalSpan.textContent = profiles.length;
  currentUrlDiv.textContent = profiles[currentIndex] ? profiles[currentIndex].url : '';
}

function loadStored() {
  chrome.storage.local.get(['ig_profiles_text', 'ig_current_index'], (res) => {
    if (res.ig_profiles_text) {
      textarea.value = res.ig_profiles_text;
    }
    currentIndex = res.ig_current_index || 0;
    updateStatus();
  });
}

function saveStored() {
  chrome.storage.local.set({
    ig_profiles_text: textarea.value,
    ig_current_index: currentIndex
  });
}

function prepareProfilesFromTextarea() {
  const lines = textarea.value.split(/\r?\n/).map(l => l.trim()).filter(l => l.length>0);
  const parsed = [];
  for (const ln of lines) {
    const url = normalizeToInstagramUrl(ln);
    if (url) parsed.push({raw: ln, url});
  }
  return parsed;
}

function openCurrentProfile() {
  if (!profiles.length) {
    stopOpening();
    return;
  }
  if (currentIndex >= profiles.length) {
    // fertig — stoppe
    stopOpening();
    return;
  }
  const target = profiles[currentIndex].url;
  currentUrlDiv.textContent = target;

  // Öffne neues Tab. active:false öffnet im Hintergrund (abhängig von Browser-Einstellungen).
  chrome.tabs.create({ url: target, active: false }, (tab) => {
    // optional: hier könnten wir die Tab-ID speichern oder weitere Aktionen ausführen
  });

  currentIndex++;
  updateStatus();
  saveStored();
}

function startOpening() {
  // Lese und parse Profile
  profiles = prepareProfilesFromTextarea();
  if (!profiles.length) {
    alert('Bitte mindestens ein Profil eingeben.');
    return;
  }
  startBtn.disabled = true;
  stopBtn.disabled = false;

  // setze Index ggf. zurück
  if (currentIndex >= profiles.length) currentIndex = 0;
  updateStatus();

  // setInterval läuft nur solange das popup offen ist.
  intervalId = setInterval(() => {
    openCurrentProfile();
  }, INTERVAL_MS);

  // öffne direkt das erste (so der erste Klick nicht 5s warten muss)
  openCurrentProfile();
}

function stopOpening() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
  updateStatus();
  saveStored();
}

startBtn.addEventListener('click', () => {
  startOpening();
});

stopBtn.addEventListener('click', () => {
  stopOpening();
});

// Save textarea on change
textarea.addEventListener('input', () => {
  chrome.storage.local.set({ ig_profiles_text: textarea.value });
});

// load stored on open
loadStored();
