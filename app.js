const copy = {
  en: {
    brand:'Princess & the Dragon',
    home:'Home',
    sound:'Sound',
    chapter:'A tiny adventure',
    startTitle:'The dragon at the gate',
    start:'Princess Alisha hears a dragon crying outside the castle. What should she do?',
    startA:'Go speak to the dragon',
    startB:'Search the royal library',
    talkTitle:'A surprising request',
    talk:'The dragon lost its glowing star. It needs the star to find its way home.',
    talkA:'Help search the forest',
    talkB:'Offer the dragon a safe place to rest',
    libraryTitle:'The secret map',
    library:'An old book shows a fallen star near the forest. The royal guards are also waiting nearby.',
    libraryA:'Follow the star map',
    libraryB:'Ask the guards to protect the village',
    forestTitle:'The forest clearing',
    forest:'Alisha finds the star caught in thorny vines. The dragon watches hopefully.',
    forestA:'Free the star together',
    forestB:'Bring the star to the castle',
    restTitle:'A warm welcome',
    rest:'Alisha opens the castle garden. The dragon is safe and grateful.',
    restA:'Celebrate together',
    guardsTitle:'The village is safe',
    guards:'The guards gently guide the dragon to a quiet meadow. Alisha promises to visit.',
    guardsA:'See the ending',
    endingStarTitle:'The sky is home',
    endingStar:'Alisha and the dragon free the star. Its light leads the dragon home, and a new friendship shines across the sky.',
    endingCastleTitle:'A new castle friend',
    endingCastle:'The star lights the castle garden. The dragon chooses to stay, and Alisha gains a loyal friend.',
    endingVillageTitle:'The gentle guardian',
    endingVillage:'The dragon makes a home beside the village and helps keep everyone safe. Alisha visits every day.',
    replay:'Play again'
  },
  es: {
    brand:'La princesa y el dragón',
    home:'Inicio',
    sound:'Sonido',
    chapter:'Una pequeña aventura',
    startTitle:'El dragón en la puerta',
    start:'La princesa Alisha oye llorar a un dragón fuera del castillo. ¿Qué debe hacer?',
    startA:'Hablar con el dragón',
    startB:'Buscar en la biblioteca real',
    talkTitle:'Una petición sorprendente',
    talk:'El dragón perdió su estrella brillante. La necesita para encontrar el camino a casa.',
    talkA:'Buscar en el bosque',
    talkB:'Ofrecerle un lugar seguro para descansar',
    libraryTitle:'El mapa secreto',
    library:'Un libro antiguo muestra una estrella caída cerca del bosque. Los guardias reales también esperan cerca.',
    libraryA:'Seguir el mapa de la estrella',
    libraryB:'Pedir a los guardias que protejan la aldea',
    forestTitle:'El claro del bosque',
    forest:'Alisha encuentra la estrella atrapada entre espinas. El dragón la mira con esperanza.',
    forestA:'Liberar la estrella juntos',
    forestB:'Llevar la estrella al castillo',
    restTitle:'Una cálida bienvenida',
    rest:'Alisha abre el jardín del castillo. El dragón está a salvo y agradecido.',
    restA:'Celebrar juntos',
    guardsTitle:'La aldea está a salvo',
    guards:'Los guardias guían con cuidado al dragón a una pradera tranquila. Alisha promete visitarlo.',
    guardsA:'Ver el final',
    endingStarTitle:'El cielo es su hogar',
    endingStar:'Alisha y el dragón liberan la estrella. Su luz guía al dragón a casa y una nueva amistad brilla en el cielo.',
    endingCastleTitle:'Un nuevo amigo en el castillo',
    endingCastle:'La estrella ilumina el jardín. El dragón decide quedarse y Alisha gana un amigo fiel.',
    endingVillageTitle:'El guardián amable',
    endingVillage:'El dragón vive junto a la aldea y ayuda a proteger a todos. Alisha lo visita cada día.',
    replay:'Jugar otra vez'
  },
  fr: {
    brand:'La princesse et le dragon',
    home:'Accueil',
    sound:'Son',
    chapter:'Une petite aventure',
    startTitle:'Le dragon à la porte',
    start:'La princesse Alisha entend pleurer un dragon devant le château. Que doit-elle faire ?',
    startA:'Parler au dragon',
    startB:'Chercher dans la bibliothèque royale',
    talkTitle:'Une demande étonnante',
    talk:'Le dragon a perdu son étoile brillante. Il en a besoin pour retrouver son chemin.',
    talkA:'Chercher dans la forêt',
    talkB:'Lui offrir un endroit sûr pour se reposer',
    libraryTitle:'La carte secrète',
    library:'Un vieux livre montre une étoile tombée près de la forêt. Les gardes royaux attendent aussi tout près.',
    libraryA:'Suivre la carte de l’étoile',
    libraryB:'Demander aux gardes de protéger le village',
    forestTitle:'La clairière',
    forest:'Alisha trouve l’étoile prise dans des ronces. Le dragon la regarde avec espoir.',
    forestA:'Libérer l’étoile ensemble',
    forestB:'Apporter l’étoile au château',
    restTitle:'Un accueil chaleureux',
    rest:'Alisha ouvre le jardin du château. Le dragon est en sécurité et reconnaissant.',
    restA:'Fêter cela ensemble',
    guardsTitle:'Le village est en sécurité',
    guards:'Les gardes conduisent doucement le dragon vers une prairie tranquille. Alisha promet de lui rendre visite.',
    guardsA:'Voir la fin',
    endingStarTitle:'Le ciel est sa maison',
    endingStar:'Alisha et le dragon libèrent l’étoile. Sa lumière guide le dragon chez lui et une nouvelle amitié brille dans le ciel.',
    endingCastleTitle:'Un nouvel ami au château',
    endingCastle:'L’étoile éclaire le jardin. Le dragon choisit de rester et Alisha gagne un ami fidèle.',
    endingVillageTitle:'Le gentil gardien',
    endingVillage:'Le dragon s’installe près du village et aide à protéger tout le monde. Alisha lui rend visite chaque jour.',
    replay:'Rejouer'
  }
};

// Each node names its title, text, and available choice destinations.
const nodes = {
  start: ['startTitle', 'start', [['startA', 'talk'], ['startB', 'library']]],
  talk: ['talkTitle', 'talk', [['talkA', 'forest'], ['talkB', 'rest']]],
  library: ['libraryTitle', 'library', [['libraryA', 'forest'], ['libraryB', 'guards']]],
  forest: ['forestTitle', 'forest', [['forestA', 'endingStar'], ['forestB', 'endingCastle']]],
  rest: ['restTitle', 'rest', [['restA', 'endingCastle']]],
  guards: ['guardsTitle', 'guards', [['guardsA', 'endingVillage']]],
  endingStar: ['endingStarTitle', 'endingStar', []],
  endingCastle: ['endingCastleTitle', 'endingCastle', []],
  endingVillage: ['endingVillageTitle', 'endingVillage', []]
};

const $ = id => document.getElementById(id);
const savedLanguage = localStorage.getItem('cyoa-language');
let lang = ['en', 'es', 'fr'].includes(savedLanguage) ? savedLanguage : 'en';
let node = 'start';
let audio;
let soundOn = true;
let musicTimer;
let princess = localStorage.getItem('cyoa-princess') === 'star' ? 'star' : 'adventure';

function tone(freq, duration = .12, type = 'sine', volume = .055) {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch {}
}

function music() {
  if (!soundOn || !audio) return;
  const notes = [392, 523, 587, 523, 440, 523, 392, 330];
  let i = 0;
  clearInterval(musicTimer);
  musicTimer = setInterval(() => tone(notes[i++ % notes.length], .42, 'sine', .012), 580);
}

function render() {
  const c = copy[lang];
  const n = nodes[node];
  document.documentElement.lang = lang;
  $('brand').textContent = c.brand;
  $('home').ariaLabel = c.home;
  $('sound').ariaLabel = c.sound;
  $('chapter').textContent = c.chapter;
  $('title').textContent = c[n[0]];
  $('story').textContent = c[n[1]];
  $('dragon').classList.toggle('hidden', node === 'start' || node === 'library');

  const choices = $('choices');
  choices.replaceChildren();
  const options = n[2].length ? n[2] : [['replay', 'start']];
  for (const [label, target] of options) {
    const button = document.createElement('button');
    button.className = 'choice';
    button.textContent = c[label];
    button.onclick = () => {
      node = target;
      tone(target.startsWith('ending') ? 784 : 523, .2);
      render();
    };
    choices.append(button);
  }
  $('sound').textContent = soundOn ? '♫' : '♪';
}

$('home').onclick = () => {
  node = 'start';
  tone(440);
  render();
};
$('sound').onclick = () => {
  soundOn = !soundOn;
  if (soundOn) {
    tone(660);
    music();
  } else {
    clearInterval(musicTimer);
  }
  render();
};

function updatePrincess() {
  $('princess-art').src = `assets/princess-${princess}.png`;
  document.querySelector(`input[name="princess"][value="${princess}"]`).checked = true;
}

$('language').value = lang;
$('language').onchange = event => {
  lang = event.target.value;
  localStorage.setItem('cyoa-language', lang);
  tone(660);
  render();
};
document.querySelectorAll('input[name="princess"]').forEach(input => input.onchange = event => {
  princess = event.target.value;
  localStorage.setItem('cyoa-princess', princess);
  updatePrincess();
  tone(660);
});

let gateAnswer = 0;
$('parents').onclick = () => {
  const a = 10 + Math.floor(Math.random() * 9);
  const b = 10 + Math.floor(Math.random() * 9);
  gateAnswer = a + b;
  $('gate-question').textContent = `What is ${a} + ${b}?`;
  $('gate-answer').value = '';
  $('gate-error').textContent = '';
  $('parent-gate').hidden = false;
  $('gate-answer').focus();
};
$('gate-enter').onclick = () => {
  if (Number($('gate-answer').value) === gateAnswer && $('gate-answer').value !== '') {
    $('parent-gate').hidden = true;
    $('parent-panel').hidden = false;
    updatePin();
  } else {
    $('gate-error').textContent = 'Please try again.';
  }
};
$('gate-answer').onkeydown = event => {
  if (event.key === 'Enter') $('gate-enter').click();
};
$('gate-cancel').onclick = () => { $('parent-gate').hidden = true; };
$('parent-close').onclick = () => { $('parent-panel').hidden = true; };

function updatePin() {
  const bridge = window.AndroidGameLock;
  $('pin-toggle').hidden = !bridge;
  $('pin-help').hidden = !bridge;
  if (bridge) {
    const pinned = bridge.isPinned();
    $('pin-toggle').textContent = `Keep game open: ${pinned ? 'On — turn off' : 'Off — turn on'}`;
    $('pin-toggle').setAttribute('aria-pressed', String(pinned));
  }
}

$('pin-toggle').onclick = () => window.AndroidGameLock?.toggle();
window.addEventListener('android-game-lock', updatePin);
document.addEventListener('pointerdown', () => {
  if (soundOn && !musicTimer) {
    tone(660);
    music();
  }
}, {once: true});
updatePrincess();
render();
