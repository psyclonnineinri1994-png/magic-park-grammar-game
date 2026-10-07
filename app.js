const levels = [
  { id: 1, icon: '🔎', ru: 'Найди', en: 'Find', title: 'Охота за предметами', titleEn: 'Object hunt', badge: 'Наблюдатель', tip: 'Нажимай на предметы, слушай предложения и собирай их в корзину.' },
  { id: 2, icon: '⚖️', ru: 'Выбери', en: 'Choose', title: 'Is или are?', titleEn: 'Is or are?', badge: 'Знаток', tip: 'Выбери правильную форму: is — для одного, are — для нескольких.' },
  { id: 3, icon: '🧩', ru: 'Собери', en: 'Build', title: 'Конструктор фраз', titleEn: 'Sentence builder', badge: 'Конструктор', tip: 'Нажимай на слова по порядку, чтобы собрать английское предложение.' },
  { id: 4, icon: '🧺', ru: 'Рассортируй', en: 'Sort', title: 'Пикниковая сортировка', titleEn: 'Picnic sorting', badge: 'Сортировщик', tip: 'Реши, какие слова дружат с there is, а какие — с there are.' },
  { id: 5, icon: '🕵️', ru: 'Проверь', en: 'Detect', title: 'Парковый детектив', titleEn: 'Park detective', badge: 'Детектив', tip: 'Сравни предложения с картинкой парка и выбери правда или неправда.' },
  { id: 6, icon: '🚫', ru: 'Отрицай', en: 'Negate', title: 'Чего в парке нет?', titleEn: 'What is not there?', badge: 'Следопыт', tip: 'Используй there isn’t для одного и there aren’t для нескольких.' },
  { id: 7, icon: '❓', ru: 'Ответь', en: 'Answer', title: 'Ворота вопросов', titleEn: 'Question gate', badge: 'Собеседник', tip: 'Ответь на вопросы по картинке: Yes или No.' },
  { id: 8, icon: '🎧', ru: 'Послушай', en: 'Listen', title: 'Звуковая тропа', titleEn: 'Listening trail', badge: 'Слушатель', tip: 'Прослушай предложение и выбери подходящую картинку.' },
  { id: 9, icon: '🌉', ru: 'Переведи', en: 'Translate', title: 'Мост перевода', titleEn: 'Translation bridge', badge: 'Переводчик', tip: 'Выбери точный английский перевод русского предложения.' },
  { id: 10, icon: '✨', ru: 'Создай', en: 'Create', title: 'Мой волшебный парк', titleEn: 'My magic park', badge: 'Автор', tip: 'Создай три собственных предложения, послушай и сохрани их.' }
];

const vocab = [
  ['🌳', 'tree', 'дерево'], ['🪑', 'bench', 'скамейка'], ['⛲', 'fountain', 'фонтан'], ['🌊', 'pond', 'пруд'],
  ['🦆', 'duck', 'утка'], ['🐕', 'dog', 'собака'], ['🧒', 'child', 'ребёнок'], ['🧒🧒', 'children', 'дети'],
  ['🪁', 'kite', 'воздушный змей'], ['🌸', 'flower', 'цветок'], ['🚲', 'bicycle', 'велосипед'], ['🛤️', 'path', 'дорожка'],
  ['🛝', 'playground', 'детская площадка'], ['🐦', 'bird', 'птица'], ['🌉', 'bridge', 'мост'], ['🐿️', 'squirrel', 'белка']
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

let state = {
  current: 1,
  completed: new Set(store.get('parkQuestCompleted', [])),
  basket: store.get('parkQuestBasket', []),
  found: new Set(),
  creators: [],
  audioIndex: 0,
  audioCorrect: 0,
  activeBasketTab: 'all'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function toast(message) {
  const box = $('#toast');
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove('show'), 2200);
}

function chooseVoice() {
  const voices = speechSynthesis.getVoices();
  const preferred = ['Sonia', 'Serena', 'Samantha', 'Google UK English Female', 'Microsoft Libby', 'Ava'];
  return voices.find(v => preferred.some(name => v.name.includes(name))) ||
    voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || null;
}

function speak(text) {
  if (!('speechSynthesis' in window)) {
    toast('Озвучка не поддерживается этим браузером');
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.88;
  utterance.pitch = 1.04;
  utterance.volume = 1;
  const voice = chooseVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

function addToBasket(type, en, ru) {
  if (state.basket.some(item => item.type === type && item.en === en)) {
    toast('Уже в корзине • Already in the basket');
    return;
  }
  state.basket.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, en, ru });
  store.set('parkQuestBasket', state.basket);
  updateBasketCount();
  toast('Добавлено в корзину • Added to basket');
}

function updateBasketCount() { $('#basketCount').textContent = state.basket.length; }

function markComplete(id) {
  const wasNew = !state.completed.has(id);
  state.completed.add(id);
  store.set('parkQuestCompleted', [...state.completed]);
  renderLevelMap();
  updateProgress();
  if (wasNew) {
    confetti();
    toast(`Уровень ${id} пройден! • Level complete!`);
  }
}

function confetti() {
  const colors = ['#ff7e68', '#79d7df', '#ffd66f', '#42a66f', '#8169c9'];
  for (let i = 0; i < 34; i++) {
    const dot = document.createElement('i');
    dot.className = 'confetti';
    dot.style.left = `${Math.random() * 100}vw`;
    dot.style.background = colors[i % colors.length];
    dot.style.animationDelay = `${Math.random() * .45}s`;
    document.body.append(dot);
    setTimeout(() => dot.remove(), 2400);
  }
}

function updateProgress() {
  const count = state.completed.size;
  $('#progressText').textContent = `${count} / 10`;
  $('#progressBar').style.width = `${count * 10}%`;
}

function renderLevelMap() {
  $('#levelMap').innerHTML = levels.map(level => `
    <button class="level-btn ${level.id === state.current ? 'active' : ''} ${state.completed.has(level.id) ? 'done' : ''}" data-level="${level.id}" type="button" aria-label="Уровень ${level.id}: ${level.title}">
      <span>${state.completed.has(level.id) ? '✓' : level.icon}</span><b>${level.id}. ${level.ru}</b><small>${level.en}</small>
    </button>`).join('');
}

function selectLevel(id, scroll = false) {
  state.current = id;
  state.found = new Set();
  state.creators = [];
  state.audioIndex = 0;
  state.audioCorrect = 0;
  renderLevelMap();
  const level = levels[id - 1];
  $('#missionNumber').textContent = `Уровень ${id} • Level ${id}`;
  $('#missionBadge').textContent = level.badge;
  $('#missionIcon').textContent = level.icon;
  $('#missionTitle').textContent = level.title;
  $('#missionTranslation').textContent = level.titleEn;
  $('#missionTip').textContent = level.tip;
  renderLevel(id);
  if (scroll) $('#quest').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stageHeader(title, translation, score = '') {
  return `<div class="stage-head"><div><h3>${title}</h3><p>${translation}</p></div>${score ? `<span class="score-pill">${score}</span>` : ''}</div>`;
}

function feedback(message, success = true) {
  const box = $('#levelFeedback');
  if (!box) return;
  box.className = `feedback show ${success ? 'success' : 'error'}`;
  box.innerHTML = message;
}

function renderLevel(id) {
  ({ 1: renderLevel1, 2: renderLevel2, 3: renderLevel3, 4: renderLevel4, 5: renderLevel5,
     6: renderLevel6, 7: renderLevel7, 8: renderLevel8, 9: renderLevel9, 10: renderLevel10 })[id]();
}

function renderLevel1() {
  const objects = [
    ['🌳', 'trees', 'деревья', 'There are three trees in the park.', 'В парке есть три дерева.'],
    ['🪑', 'benches', 'скамейки', 'There are two benches near the path.', 'Рядом с дорожкой есть две скамейки.'],
    ['⛲', 'fountain', 'фонтан', 'There is a fountain in the middle of the park.', 'В центре парка есть фонтан.'],
    ['🦆', 'ducks', 'утки', 'There are four ducks in the pond.', 'В пруду есть четыре утки.'],
    ['🐕', 'dog', 'собака', 'There is a dog near the bench.', 'Рядом со скамейкой есть собака.'],
    ['🧒', 'children', 'дети', 'There are two children in the park.', 'В парке есть двое детей.']
  ];
  $('#gameStage').innerHTML = `${stageHeader('Найди 6 объектов', 'Find 6 objects', 'Найдено: 0 / 6')}
    <div class="instruction"><b>Нажми на каждую карточку.</b><small>Tap every card. You will hear a complete sentence.</small></div>
    <div class="object-grid">${objects.map((o, i) => `<button class="object-card" data-find="${i}" type="button"><span class="found-mark">✓</span><span class="emoji">${o[0]}</span><b>${o[1]}</b><small>${o[2]}</small></button>`).join('')}</div>
    <div class="discovery" id="discovery"><b>Начни исследование!</b><small>Start exploring!</small></div>
    <div id="levelFeedback" class="feedback"></div>`;
  $$('.object-card').forEach(btn => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.find);
    const o = objects[i];
    state.found.add(i);
    btn.classList.add('found');
    speak(o[3]);
    $('.score-pill').textContent = `Найдено: ${state.found.size} / 6`;
    $('#discovery').innerHTML = `<b>${o[3]}</b><small>${o[4]}</small><div class="mini-controls"><button type="button" data-add-discovery>🧺 В корзину • Add</button><button type="button" data-speak-discovery>🔊 Ещё раз • Again</button></div>`;
    $('[data-add-discovery]').onclick = () => addToBasket('sentence', o[3], o[4]);
    $('[data-speak-discovery]').onclick = () => speak(o[3]);
    if (state.found.size === objects.length) {
      feedback('<b>Отлично! Все предметы найдены.</b><small>Great! You found everything.</small>');
      markComplete(1);
    }
  }));
}

const level2Items = [
  ['There ___ a fountain in the park.', 'В парке есть фонтан.', 'is'],
  ['There ___ three trees near the path.', 'Рядом с дорожкой есть три дерева.', 'are'],
  ['There ___ a dog near the bench.', 'Рядом со скамейкой есть собака.', 'is'],
  ['There ___ four ducks in the pond.', 'В пруду есть четыре утки.', 'are'],
  ['There ___ an ice cream cart in the park.', 'В парке есть киоск с мороженым.', 'is'],
  ['There ___ two bicycles under the tree.', 'Под деревом есть два велосипеда.', 'are'],
  ['There ___ some water in the fountain.', 'В фонтане есть вода.', 'is']
];

function choiceRows(items, labels) {
  return `<div class="quiz-list">${items.map((q, i) => `<div class="quiz-row" data-row="${i}"><div class="question-copy"><b>${q[0]}</b><small>${q[1]}</small></div><div class="option-pair">${labels.map(label => `<button class="option-btn" type="button" data-choice="${label}">${label}</button>`).join('')}</div></div>`).join('')}</div>`;
}

function bindChoiceRows() {
  $$('.quiz-row .option-btn').forEach(btn => btn.addEventListener('click', () => {
    const row = btn.closest('.quiz-row');
    $$('.option-btn', row).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }));
}

function checkRows(items, levelId) {
  let correct = 0;
  $$('.quiz-row').forEach((row, i) => {
    const selected = $('.option-btn.selected', row)?.dataset.choice;
    row.classList.remove('correct', 'wrong');
    if (selected === String(items[i][2])) { row.classList.add('correct'); correct++; }
    else row.classList.add('wrong');
  });
  if (correct === items.length) {
    feedback(`<b>Все ${correct} ответов правильные!</b><small>All ${correct} answers are correct.</small>`);
    markComplete(levelId);
  } else feedback(`<b>Правильно: ${correct} из ${items.length}.</b><small>Green answers are correct. Try the red ones again.</small>`, false);
}

function renderLevel2() {
  $('#gameStage').innerHTML = `${stageHeader('Выбери is или are', 'Choose is or are')}
    <div class="instruction"><b><i>is</i> — один предмет; <i>are</i> — несколько.</b><small>Use <i>is</i> for one thing and <i>are</i> for more than one.</small></div>
    ${choiceRows(level2Items, ['is', 'are'])}<div class="level-actions"><span></span><button class="primary-btn check-btn" id="checkLevel" type="button">Проверить • Check</button></div><div id="levelFeedback" class="feedback"></div>`;
  bindChoiceRows();
  $('#checkLevel').onclick = () => checkRows(level2Items, 2);
}

const builderItems = [
  { ru: 'Рядом со скамейкой есть собака.', answer: ['There', 'is', 'a', 'dog', 'near', 'the', 'bench.'], scrambled: ['dog', 'the', 'There', 'bench.', 'a', 'near', 'is'] },
  { ru: 'В пруду есть четыре утки.', answer: ['There', 'are', 'four', 'ducks', 'in', 'the', 'pond.'], scrambled: ['pond.', 'four', 'There', 'the', 'ducks', 'are', 'in'] },
  { ru: 'Рядом с дорожкой есть киоск с мороженым.', answer: ['There', 'is', 'an', 'ice', 'cream', 'cart', 'near', 'the', 'path.'], scrambled: ['cream', 'the', 'There', 'path.', 'cart', 'is', 'near', 'an', 'ice'] },
  { ru: 'Под деревом есть два велосипеда.', answer: ['There', 'are', 'two', 'bicycles', 'under', 'the', 'tree.'], scrambled: ['bicycles', 'There', 'tree.', 'two', 'under', 'are', 'the'] }
];

function renderLevel3() {
  $('#gameStage').innerHTML = `${stageHeader('Собери 4 предложения', 'Build 4 sentences')}
    <div class="instruction"><b>Начинай с There, затем выбери is или are.</b><small>Start with There, then choose is or are.</small></div>
    ${builderItems.map((item, i) => `<div class="builder-card" data-builder="${i}"><p class="builder-translation">${item.ru}</p><div class="answer-line" aria-label="Собранное предложение"></div><div class="token-bank">${item.scrambled.map((t, j) => `<button class="token" type="button" data-token="${j}" data-word="${escapeHtml(t)}">${t}</button>`).join('')}</div><div class="mini-controls"><button type="button" data-reset-builder>↻ Сбросить • Reset</button><button type="button" data-speak-answer>🔊 Послушать ответ</button></div></div>`).join('')}
    <div class="level-actions"><span></span><button class="primary-btn check-btn" id="checkLevel" type="button">Проверить • Check</button></div><div id="levelFeedback" class="feedback"></div>`;
  $$('.builder-card').forEach(card => {
    const line = $('.answer-line', card);
    $$('.token', card).forEach(token => token.addEventListener('click', () => {
      if (token.classList.contains('used')) return;
      token.classList.add('used');
      const placed = document.createElement('button');
      placed.type = 'button'; placed.className = 'token answer-token'; placed.textContent = token.dataset.word; placed.dataset.source = token.dataset.token;
      placed.addEventListener('click', () => { token.classList.remove('used'); placed.remove(); });
      line.append(placed);
    }));
    $('[data-reset-builder]', card).onclick = () => { line.innerHTML = ''; $$('.token', card).forEach(t => t.classList.remove('used')); card.classList.remove('correct', 'wrong'); };
    $('[data-speak-answer]', card).onclick = () => speak(builderItems[Number(card.dataset.builder)].answer.join(' '));
  });
  $('#checkLevel').onclick = () => {
    let correct = 0;
    $$('.builder-card').forEach(card => {
      const i = Number(card.dataset.builder);
      const built = $$('.answer-token', card).map(t => t.textContent).join(' ');
      const answer = builderItems[i].answer.join(' ');
      card.classList.remove('correct', 'wrong');
      if (built === answer) { card.classList.add('correct'); correct++; addToBasket('sentence', answer, builderItems[i].ru); }
      else card.classList.add('wrong');
    });
    if (correct === builderItems.length) { feedback('<b>Все предложения собраны правильно!</b><small>Every sentence is in the correct order.</small>'); markComplete(3); }
    else feedback(`<b>Готово ${correct} из ${builderItems.length}.</b><small>Check the order in the highlighted cards.</small>`, false);
  };
}

const sortItems = [
  ['fountain', 'фонтан', 'is'], ['bench', 'скамейка', 'is'], ['child', 'ребёнок', 'is'], ['water', 'вода', 'is'],
  ['trees', 'деревья', 'are'], ['ducks', 'утки', 'are'], ['flowers', 'цветы', 'are'], ['bicycles', 'велосипеды', 'are']
];

function renderLevel4() {
  $('#gameStage').innerHTML = `${stageHeader('Рассортируй 8 слов', 'Sort 8 words')}
    <div class="instruction"><b>Для воды используем there is: слово water неисчисляемое.</b><small>Use there is with water because it is uncountable.</small></div>
    <div class="quiz-list">${sortItems.map((item, i) => `<div class="quiz-row" data-row="${i}"><div class="question-copy"><b>${item[0]}</b><small>${item[1]}</small></div><div class="option-pair"><button class="option-btn" data-choice="is" type="button">There is</button><button class="option-btn" data-choice="are" type="button">There are</button></div></div>`).join('')}</div>
    <div class="level-actions"><span></span><button class="primary-btn check-btn" id="checkLevel" type="button">Проверить • Check</button></div><div id="levelFeedback" class="feedback"></div>`;
  bindChoiceRows();
  $('#checkLevel').onclick = () => checkRows(sortItems.map(i => [i[0], i[1], i[2]]), 4);
}

const detectiveItems = [
  ['There are four ducks in the pond.', 'В пруду есть четыре утки.', 'true'],
  ['There is a cat on the bench.', 'На скамейке есть кошка.', 'false'],
  ['There are two bicycles under the tree.', 'Под деревом есть два велосипеда.', 'true'],
  ['There is an ice cream cart in the park.', 'В парке есть киоск с мороженым.', 'true'],
  ['There are five children near the path.', 'Рядом с дорожкой есть пятеро детей.', 'false'],
  ['There are three trees in the park.', 'В парке есть три дерева.', 'true']
];

function renderLevel5() {
  $('#gameStage').innerHTML = `${stageHeader('Правда или неправда?', 'True or false?')}
    <img src="assets/park-scene.svg" alt="Картинка парка для задания" style="width:100%;max-height:260px;object-fit:cover;border-radius:18px;margin-bottom:15px">
    ${choiceRows(detectiveItems, ['true', 'false'])}<div class="level-actions"><span></span><button class="primary-btn check-btn" id="checkLevel" type="button">Проверить • Check</button></div><div id="levelFeedback" class="feedback"></div>`;
  $$('.option-btn').forEach(btn => { btn.textContent = btn.dataset.choice === 'true' ? '✓ Правда • True' : '× Неправда • False'; });
  bindChoiceRows();
  $('#checkLevel').onclick = () => checkRows(detectiveItems, 5);
}

const negativeItems = [
  ['There ___ a cat in the park.', 'В парке нет кошки.', "isn't"],
  ['There ___ any elephants near the pond.', 'Рядом с прудом нет слонов.', "aren't"],
  ['There ___ a car on the path.', 'На дорожке нет машины.', "isn't"],
  ['There ___ any boats in the pond.', 'В пруду нет лодок.', "aren't"],
  ['There ___ a supermarket in the park.', 'В парке нет супермаркета.', "isn't"],
  ['There ___ any lions under the trees.', 'Под деревьями нет львов.', "aren't"]
];

function renderLevel6() {
  $('#gameStage').innerHTML = `${stageHeader('Выбери isn’t или aren’t', 'Choose isn’t or aren’t')}
    <div class="instruction"><b>there isn’t = одного нет; there aren’t = нескольких нет.</b><small>There isn’t is singular; there aren’t is plural.</small></div>
    ${choiceRows(negativeItems, ["isn't", "aren't"])}<div class="level-actions"><span></span><button class="primary-btn check-btn" id="checkLevel" type="button">Проверить • Check</button></div><div id="levelFeedback" class="feedback"></div>`;
  bindChoiceRows();
  $('#checkLevel').onclick = () => checkRows(negativeItems, 6);
}

const questionItems = [
  ['Is there a fountain in the park?', 'Есть ли в парке фонтан?', 'Yes, there is.'],
  ['Are there four ducks in the pond?', 'Есть ли в пруду четыре утки?', 'Yes, there are.'],
  ['Is there a cat on the bench?', 'Есть ли кошка на скамейке?', "No, there isn't."],
  ['Are there two children in the park?', 'Есть ли в парке двое детей?', 'Yes, there are.'],
  ['Are there any elephants near the path?', 'Есть ли рядом с дорожкой слоны?', "No, there aren't."]
];

function renderLevel7() {
  const all = ['Yes, there is.', 'No, there isn’t.', 'Yes, there are.', 'No, there aren’t.'];
  $('#gameStage').innerHTML = `${stageHeader('Ответь на 5 вопросов', 'Answer 5 questions')}
    <div class="instruction"><b>В коротком ответе повторяем is или are.</b><small>Repeat is or are in a short answer.</small></div>
    <div class="quiz-list">${questionItems.map((q, i) => `<div class="quiz-row" data-row="${i}"><div class="question-copy"><b>${q[0]}</b><small>${q[1]}</small></div><div class="option-pair">${all.map(a => `<button class="option-btn" data-choice="${a.replace('’', "'")}" type="button">${a}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="level-actions"><span></span><button class="primary-btn check-btn" id="checkLevel" type="button">Проверить • Check</button></div><div id="levelFeedback" class="feedback"></div>`;
  bindChoiceRows();
  $('#checkLevel').onclick = () => checkRows(questionItems, 7);
}

const audioItems = [
  { en: 'There is a fountain in the park.', ru: 'В парке есть фонтан.', answer: '⛲', options: [['⛲','fountain','фонтан'],['🪑','bench','скамейка'],['🐕','dog','собака']] },
  { en: 'There are four ducks in the pond.', ru: 'В пруду есть четыре утки.', answer: '🦆', options: [['🦆','ducks','утки'],['🐦','birds','птицы'],['🚲','bicycles','велосипеды']] },
  { en: 'There are two children near the path.', ru: 'Рядом с дорожкой есть двое детей.', answer: '🧒', options: [['🧒','children','дети'],['🌳','trees','деревья'],['🌸','flowers','цветы']] },
  { en: 'There is a dog near the bench.', ru: 'Рядом со скамейкой есть собака.', answer: '🐕', options: [['🐕','dog','собака'],['🐈','cat','кошка'],['🐿️','squirrel','белка']] },
  { en: 'There are two bicycles under the tree.', ru: 'Под деревом есть два велосипеда.', answer: '🚲', options: [['🚲','bicycles','велосипеды'],['🍦','ice cream cart','киоск с мороженым'],['🪁','kite','воздушный змей']] }
];

function renderLevel8() {
  const item = audioItems[state.audioIndex];
  if (!item) {
    $('#gameStage').innerHTML = `${stageHeader('Звуковая тропа пройдена!', 'Listening trail complete!', `${state.audioCorrect} / ${audioItems.length}`)}<div class="created-sentence"><b>Все фразы услышаны и поняты.</b><small>You listened to and understood every sentence.</small><button class="primary-btn" id="replayAudio" type="button">Пройти ещё раз • Play again</button></div>`;
    markComplete(8);
    $('#replayAudio').onclick = () => { state.audioIndex = 0; state.audioCorrect = 0; renderLevel8(); };
    return;
  }
  $('#gameStage').innerHTML = `${stageHeader(`Фраза ${state.audioIndex + 1} из ${audioItems.length}`, 'Listen and choose', `${state.audioCorrect} верно`)}
    <div class="audio-card"><button class="big-listen" id="playAudio" type="button" aria-label="Прослушать фразу">▶</button><p class="translation-reveal">${item.ru}<br><small>Русский перевод • Russian translation</small></p><div class="audio-options">${item.options.map(o => `<button class="audio-option" type="button" data-audio-answer="${o[0]}">${o[0]}<small>${o[1]}<br>${o[2]}</small></button>`).join('')}</div></div>
    <div id="levelFeedback" class="feedback"></div>`;
  $('#playAudio').onclick = () => speak(item.en);
  $$('.audio-option').forEach(btn => btn.onclick = () => {
    const ok = btn.dataset.audioAnswer === item.answer;
    if (ok) {
      state.audioCorrect++;
      addToBasket('sentence', item.en, item.ru);
      feedback(`<b>${item.en}</b><small>${item.ru}</small>`);
      setTimeout(() => { state.audioIndex++; renderLevel8(); speak(audioItems[state.audioIndex]?.en || 'Great job!'); }, 900);
    } else {
      feedback('<b>Послушай ещё раз.</b><small>Listen once more and try again.</small>', false);
      speak(item.en);
    }
  });
  setTimeout(() => speak(item.en), 250);
}

const translationItems = [
  { ru: 'В парке есть фонтан.', correct: 'There is a fountain in the park.', options: ['There is a fountain in the park.', 'There are a fountain in the park.', 'Is there a fountain in the park?'] },
  { ru: 'В пруду есть четыре утки.', correct: 'There are four ducks in the pond.', options: ['There is four ducks in the pond.', 'There are four ducks in the pond.', 'There are four duck in the pond.'] },
  { ru: 'Рядом со скамейкой нет кошки.', correct: "There isn't a cat near the bench.", options: ["There aren't a cat near the bench.", "There isn't a cat near the bench.", 'There is a cat near the bench.'] },
  { ru: 'Есть ли в парке дети?', correct: 'Are there any children in the park?', options: ['Is there any children in the park?', 'There are any children in the park?', 'Are there any children in the park?'] },
  { ru: 'Под деревом есть два велосипеда.', correct: 'There are two bicycles under the tree.', options: ['There are two bicycles under the tree.', 'There is two bicycles under the tree.', 'Are there two bicycles under the tree.'] }
];

function renderLevel9() {
  $('#gameStage').innerHTML = `${stageHeader('Выбери точный перевод', 'Choose the exact translation')}
    <div class="instruction"><b>Сначала выбери ответ. Правильная пара откроется после проверки.</b><small>Choose first. The correct bilingual pair will appear after checking.</small></div>
    <div class="quiz-list">${translationItems.map((q, i) => `<div class="quiz-row" data-row="${i}" style="grid-template-columns:1fr"><div class="question-copy"><b>${q.ru}</b><small>Translate into English • Переведи на английский</small></div><div class="option-pair">${q.options.map(o => `<button class="option-btn" type="button" data-choice="${escapeHtml(o)}">${o}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="level-actions"><span></span><button class="primary-btn check-btn" id="checkLevel" type="button">Проверить • Check</button></div><div id="levelFeedback" class="feedback"></div>`;
  bindChoiceRows();
  $('#checkLevel').onclick = () => {
    let correct = 0;
    $$('.quiz-row').forEach((row, i) => {
      const selected = $('.option-btn.selected', row)?.dataset.choice;
      row.classList.remove('correct', 'wrong');
      if (selected === translationItems[i].correct) { row.classList.add('correct'); correct++; addToBasket('sentence', translationItems[i].correct, translationItems[i].ru); }
      else row.classList.add('wrong');
    });
    const pairs = translationItems.map(q => `<b>${q.correct}</b><small>${q.ru}</small>`).join('<br>');
    if (correct === translationItems.length) { feedback(`<b>Отличный перевод!</b><small>Excellent translation!</small><br>${pairs}`); markComplete(9); }
    else feedback(`<b>Правильно: ${correct} из ${translationItems.length}.</b><small>Correct answers: ${correct} of ${translationItems.length}. Check the red cards.</small>`, false);
  };
}

const creatorObjects = [
  { s:'dog', p:'dogs', ruS:'собака', ruFew:'собаки', ruMany:'собак', two:'две' },
  { s:'bench', p:'benches', ruS:'скамейка', ruFew:'скамейки', ruMany:'скамеек', two:'две' },
  { s:'tree', p:'trees', ruS:'дерево', ruFew:'дерева', ruMany:'деревьев', two:'два' },
  { s:'duck', p:'ducks', ruS:'утка', ruFew:'утки', ruMany:'уток', two:'две' },
  { s:'bicycle', p:'bicycles', ruS:'велосипед', ruFew:'велосипеда', ruMany:'велосипедов', two:'два' },
  { s:'fountain', p:'fountains', ruS:'фонтан', ruFew:'фонтана', ruMany:'фонтанов', two:'два' }
];
const creatorPlaces = [
  { en:'near the bench', ru:'рядом со скамейкой' }, { en:'under the tree', ru:'под деревом' },
  { en:'near the path', ru:'рядом с дорожкой' }, { en:'in the park', ru:'в парке' }, { en:'near the pond', ru:'рядом с прудом' }
];

function creatorSentence() {
  const qty = Number($('#creatorQty').value);
  const obj = creatorObjects[Number($('#creatorObject').value)];
  const place = creatorPlaces[Number($('#creatorPlace').value)];
  if (qty === 1) return { en: `There is a ${obj.s} ${place.en}.`, ru: `${capitalize(place.ru)} есть ${obj.ruS}.` };
  const qEn = qty === 4 ? 'many' : qty === 2 ? 'two' : 'three';
  const qRu = qty === 4 ? 'много' : qty === 2 ? obj.two : 'три';
  const nounRu = qty === 4 ? obj.ruMany : obj.ruFew;
  return { en: `There are ${qEn} ${obj.p} ${place.en}.`, ru: `${capitalize(place.ru)} есть ${qRu} ${nounRu}.` };
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function updateCreatorPreview() {
  const sentence = creatorSentence();
  $('#creatorEn').textContent = sentence.en;
  $('#creatorRu').textContent = sentence.ru;
}

function renderLevel10() {
  $('#gameStage').innerHTML = `${stageHeader('Создай 3 предложения', 'Create 3 sentences', '0 / 3')}
    <div class="instruction"><b>Выбирай количество, предмет и место. Форма is/are изменится сама.</b><small>Choose a quantity, an object and a place. Is/are will change automatically.</small></div>
    <div class="creator-grid">
      <div class="field"><label>Количество <small>Quantity</small></label><select id="creatorQty"><option value="1">1 — один • one</option><option value="2">2 — два • two</option><option value="3">3 — три • three</option><option value="4">много • many</option></select></div>
      <div class="field"><label>Предмет <small>Object</small></label><select id="creatorObject">${creatorObjects.map((o,i) => `<option value="${i}">${o.s} • ${o.ruS}</option>`).join('')}</select></div>
      <div class="field"><label>Место <small>Place</small></label><select id="creatorPlace">${creatorPlaces.map((p,i) => `<option value="${i}">${p.en} • ${p.ru}</option>`).join('')}</select></div>
    </div>
    <div class="created-sentence"><b id="creatorEn"></b><small id="creatorRu"></small><div class="hero-buttons" style="justify-content:center;margin-top:10px"><button class="secondary-btn" id="creatorSpeak" type="button">🔊 Послушать • Listen</button><button class="primary-btn" id="creatorSave" type="button">🧺 Создать и сохранить • Create & save</button></div></div>
    <div class="creator-log" id="creatorLog"></div><div id="levelFeedback" class="feedback"></div>`;
  ['creatorQty','creatorObject','creatorPlace'].forEach(id => $(`#${id}`).onchange = updateCreatorPreview);
  updateCreatorPreview();
  $('#creatorSpeak').onclick = () => speak(creatorSentence().en);
  $('#creatorSave').onclick = () => {
    const sentence = creatorSentence();
    if (!state.creators.some(s => s.en === sentence.en)) state.creators.push(sentence);
    else { toast('Создай другое предложение • Make a different sentence'); return; }
    addToBasket('sentence', sentence.en, sentence.ru);
    speak(sentence.en);
    $('.score-pill').textContent = `${Math.min(state.creators.length, 3)} / 3`;
    $('#creatorLog').innerHTML = state.creators.map(s => `<div><b>${s.en}</b><small>${s.ru}</small></div>`).join('');
    if (state.creators.length >= 3) { feedback('<b>Твой волшебный парк готов!</b><small>Your magic park is ready!</small>'); markComplete(10); }
  };
}

function renderVocabulary() {
  $('#wordGrid').innerHTML = vocab.map((word, i) => `<article class="word-card"><span class="word-emoji">${word[0]}</span><div><b>${word[1]}</b><small>${word[2]}</small></div><div class="word-actions"><button class="icon-btn" type="button" data-vocab-speak="${i}" aria-label="Послушать ${word[1]}">🔊</button><button class="icon-btn" type="button" data-vocab-add="${i}" aria-label="Добавить ${word[1]} в корзину">＋</button></div></article>`).join('');
  $$('[data-vocab-speak]').forEach(btn => btn.onclick = () => speak(vocab[Number(btn.dataset.vocabSpeak)][1]));
  $$('[data-vocab-add]').forEach(btn => { btn.onclick = () => { const w = vocab[Number(btn.dataset.vocabAdd)]; addToBasket('word', w[1], w[2]); }; });
}

function renderBasket() {
  const items = state.basket.filter(item => state.activeBasketTab === 'all' || item.type === state.activeBasketTab);
  $('#basketItems').innerHTML = items.length ? items.map(item => `<div class="basket-item"><span class="type">${item.type === 'word' ? '🌱' : '💬'}</span><div><b>${escapeHtml(item.en)}</b><small>${escapeHtml(item.ru)}</small></div><button class="audio-mini" type="button" data-basket-speak="${item.id}" aria-label="Прослушать">🔊</button><button type="button" data-basket-remove="${item.id}" aria-label="Удалить">×</button></div>`).join('') : `<div class="empty-state"><span>🧺</span><b>Корзина пока пуста</b><p>Add words and sentences during the quest.<br>Добавляй слова и предложения во время квеста.</p></div>`;
  $$('[data-basket-speak]').forEach(btn => btn.onclick = () => speak(state.basket.find(i => String(i.id) === btn.dataset.basketSpeak).en));
  $$('[data-basket-remove]').forEach(btn => btn.onclick = () => {
    state.basket = state.basket.filter(i => String(i.id) !== btn.dataset.basketRemove);
    store.set('parkQuestBasket', state.basket); updateBasketCount(); renderBasket();
  });
}

function openDialog(id) {
  const dialog = $(`#${id}`);
  if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
}

document.addEventListener('click', event => {
  const speakButton = event.target.closest('.speak-btn');
  if (speakButton?.dataset.speak) speak(speakButton.dataset.speak);
  const levelButton = event.target.closest('[data-level]');
  if (levelButton) selectLevel(Number(levelButton.dataset.level));
  const closeButton = event.target.closest('[data-close-dialog]');
  if (closeButton) $(`#${closeButton.dataset.closeDialog}`).close();
});

$('#startBtn').onclick = () => selectLevel(1, true);
$('#resetLevelBtn').onclick = () => selectLevel(state.current);
$('#soundTestBtn').onclick = () => speak('There is a beautiful park in our city.');
$('#openBasketBtn').onclick = () => { renderBasket(); openDialog('basketDialog'); };
$('#openMemoBtn').onclick = () => $('#memo').scrollIntoView({ behavior: 'smooth' });
$('#memoPreview').onclick = () => openDialog('memoDialog');
$('#addAllWordsBtn').onclick = () => vocab.slice(0, 8).forEach(w => addToBasket('word', w[1], w[2]));

$$('[data-basket-tab]').forEach(btn => btn.onclick = () => {
  state.activeBasketTab = btn.dataset.basketTab;
  $$('[data-basket-tab]').forEach(b => b.classList.toggle('active', b === btn));
  renderBasket();
});

$('#copyBasketBtn').onclick = async () => {
  if (!state.basket.length) { toast('Корзина пока пуста'); return; }
  const text = state.basket.map(item => `${item.en} — ${item.ru}`).join('\n');
  try { await navigator.clipboard.writeText(text); toast('Список скопирован • List copied'); }
  catch { const area = document.createElement('textarea'); area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); toast('Список скопирован • List copied'); }
};
$('#clearBasketBtn').onclick = () => {
  if (!confirm('Очистить корзину? • Clear the basket?')) return;
  state.basket = []; store.set('parkQuestBasket', []); updateBasketCount(); renderBasket();
};
$('#resetAllBtn').onclick = () => {
  if (!confirm('Сбросить весь прогресс и корзину? • Reset all progress and the basket?')) return;
  localStorage.removeItem('parkQuestCompleted'); localStorage.removeItem('parkQuestBasket');
  state.completed = new Set(); state.basket = []; updateBasketCount(); updateProgress(); renderLevelMap(); selectLevel(1); toast('Прогресс сброшен • Progress reset');
};

renderVocabulary();
updateBasketCount();
updateProgress();
selectLevel(1);
