(() => {
  const state = {
    xp: 240,
    streak: 7,
    questDone: 3,
    questGoal: 5,
    wotdLearned: false,
    dark: false,
    jamoTab: 'consonants',
    selectedJamo: HANGUL_CONSONANTS[0],
    builderC: HANGUL_CONSONANTS[0],
    builderV: HANGUL_VOWELS[0],
    quickIdx: 0,
    flashcardIdx: 0,
    flashcardFlipped: false,
    quizIdx: 0,
    vocabFilter: 'all',
    vocabQuery: '',
    favorites: new Set([1, 5, 11]),
    matchSelected: [],
    matchedIds: new Set(),
    speechRate: 0.88,
    accent: 'indigo',
    avatars: ['🦊', '🐼', '🐯', '🐰', '🦁'],
    avatarIdx: 0
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Speech helper (Korean ko-KR with graceful toast fallback)
  function speakKorean(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ko-KR';
      utter.rate = state.speechRate;
      window.speechSynthesis.speak(utter);
    }
    showToast(`🔊 ${text}`);
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  function addXP(amount) {
    state.xp += amount;
    $('#xpCount').textContent = state.xp;
    if (state.questDone < state.questGoal) {
      state.questDone += 1;
      updateQuestRing();
    }
    syncProfile();
  }

  function updateQuestRing() {
    const circumference = 207.35;
    const ratio = Math.min(state.questDone / state.questGoal, 1);
    $('#questRingCircle').style.strokeDashoffset = circumference * (1 - ratio);
    $('#questDoneCount').textContent = state.questDone;
  }

  // Navigation
  function switchTab(tabName) {
    $$('.tab-view').forEach((v) => v.classList.remove('active'));
    $$('.nav-item').forEach((n) => n.classList.remove('active'));
    $(`#tab-${tabName}`).classList.add('active');
    $(`.nav-item[data-tab="${tabName}"]`).classList.add('active');
    $('#appMain').scrollTop = 0;
    if (tabName === 'profile') syncProfile();
  }

  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Home Tile Actions
  $$('[data-action]').forEach((el) => {
    el.addEventListener('click', () => {
      const action = el.dataset.action;
      if (action === 'go-hangul') switchTab('hangul');
      if (action === 'go-practice') switchTab('practice');
      if (action === 'go-vocab') switchTab('vocab');
      if (action === 'go-flashcards') {
        switchTab('practice');
        switchPracticeMode('flashcards');
      }
    });
  });

  // Theme Toggle (shared between header and profile tab)
  function toggleTheme() {
    state.dark = !state.dark;
    document.body.classList.toggle('dark', state.dark);
    $('#themeToggle').textContent = state.dark ? '☀️' : '🌙';
    syncProfile();
  }

  $('#themeToggle').addEventListener('click', toggleTheme);

  // Word of the Day
  $('#wotdLearnBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.wotdLearned) return;
    state.wotdLearned = true;
    const btn = $('#wotdLearnBtn');
    btn.classList.add('done');
    btn.setAttribute('aria-pressed', 'true');
    btn.innerHTML = '<span>Вивчено ✓</span>';
    addXP(15);
    showToast('✦ +15 XP! Слово дня засвоєно');
  });

  // Generic data-speak buttons
  document.addEventListener('click', (e) => {
    const speakBtn = e.target.closest('[data-speak]');
    if (speakBtn) {
      e.stopPropagation();
      speakKorean(speakBtn.dataset.speak);
    }
  });

  // Quick Challenge on Home
  function renderQuickChallenge() {
    const item = QUICK_CHALLENGES[state.quickIdx % QUICK_CHALLENGES.length];
    $('#quickKrWord').textContent = item.kr;
    const container = $('#quickOptions');
    container.innerHTML = '';
    item.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'quick-opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (opt === item.answer) {
          btn.classList.add('correct');
          addXP(10);
          speakKorean(item.kr);
          setTimeout(() => {
            state.quickIdx += 1;
            renderQuickChallenge();
          }, 750);
        } else {
          btn.classList.add('wrong');
          showToast('Спробуй ще раз!');
          setTimeout(() => btn.classList.remove('wrong'), 550);
        }
      });
      container.appendChild(btn);
    });
  }

  $('#quickAudioBtn').addEventListener('click', () => {
    const item = QUICK_CHALLENGES[state.quickIdx % QUICK_CHALLENGES.length];
    speakKorean(item.kr);
  });

  // Topic Rail
  function renderTopicRail() {
    const rail = $('#topicRail');
    rail.innerHTML = TOPIC_MODULES.map((m) => `
      <div class="topic-card" data-sheet="${m.id}">
        <span class="topic-card-icon">${m.icon}</span>
        <span class="topic-card-kr">${m.kr}</span>
        <span class="topic-card-title">${m.title}</span>
      </div>
    `).join('');
  }

  // Bottom Sheet Drawer
  function openSheet(packKey) {
    const pack = SHEET_PACKS[packKey];
    if (!pack) return;
    $('#sheetBadge').textContent = pack.badge;
    $('#sheetTitle').textContent = pack.title;
    $('#sheetContent').innerHTML = pack.items.map((item) => `
      <div class="phrase-tile">
        <div>
          <div class="phrase-kr">${item.kr}</div>
          <div class="phrase-tr">${item.tr}</div>
          <div class="phrase-uk">${item.uk}</div>
        </div>
        <button class="audio-btn" data-speak="${item.kr}" aria-label="Слухати">🔊</button>
      </div>
    `).join('');
    $('#sheetBackdrop').classList.add('open');
    $('#bottomSheet').classList.add('open');
  }

  function closeSheet() {
    $('#sheetBackdrop').classList.remove('open');
    $('#bottomSheet').classList.remove('open');
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-sheet]');
    if (trigger) openSheet(trigger.dataset.sheet);
  });
  $('#closeSheetBtn').addEventListener('click', closeSheet);
  $('#sheetBackdrop').addEventListener('click', closeSheet);

  // HANGUL TAB
  function updateInspector(item, isVowel) {
    state.selectedJamo = item;
    $('#inspChar').textContent = item.char;
    $('#inspType').textContent = isVowel ? 'Голосний · 모음' : 'Приголосний · 자음';
    $('#inspSound').textContent = `[${item.uk}] · ${item.rom}`;
    $('#inspTip').textContent = item.tip;
    $('#inspExWord').textContent = item.ex;
    $('#inspExTr').textContent = item.exTr;
  }

  function renderJamoGrid() {
    const isVowel = state.jamoTab === 'vowels';
    const list = isVowel ? HANGUL_VOWELS : HANGUL_CONSONANTS;
    const grid = $('#jamoGrid');
    grid.innerHTML = list.map((item) => `
      <button class="jamo-tile ${state.selectedJamo.char === item.char ? 'selected' : ''}" data-char="${item.char}">
        <span class="jamo-char">${item.char}</span>
        <span class="jamo-sub">[${item.uk.split(' ')[0]}]</span>
      </button>
    `).join('');

    grid.querySelectorAll('.jamo-tile').forEach((tile, idx) => {
      tile.addEventListener('click', () => {
        const picked = list[idx];
        updateInspector(picked, isVowel);
        renderJamoGrid();
        speakKorean(picked.ex);
      });
    });
  }

  $('#inspAudioBtn').addEventListener('click', () => {
    speakKorean(state.selectedJamo.ex);
  });

  $$('[data-jamo-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-jamo-tab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.jamoTab = btn.dataset.jamoTab;

      const isBuilder = state.jamoTab === 'builder';
      $('#jamoGrid').classList.toggle('hidden', isBuilder);
      $('#hangulInspector').classList.toggle('hidden', isBuilder);
      $('#builderPanel').classList.toggle('hidden', !isBuilder);

      if (!isBuilder) {
        const list = state.jamoTab === 'vowels' ? HANGUL_VOWELS : HANGUL_CONSONANTS;
        updateInspector(list[0], state.jamoTab === 'vowels');
        renderJamoGrid();
      } else {
        renderSyllableBuilder();
      }
    });
  });

  function renderSyllableBuilder() {
    const c = state.builderC;
    const v = state.builderV;
    const code = 0xAC00 + (c.idx * 21 + v.idx) * 28;
    const syllable = String.fromCharCode(code);

    $('#slotC').textContent = c.char;
    $('#slotV').textContent = v.char;
    $('#builtSyllable').textContent = syllable;
    $('#builtReading').textContent = `[${c.ukStart}${v.uk.split(' ')[0]}] · ${c.romStart}${v.rom}`;

    $('#builderConsonants').innerHTML = HANGUL_CONSONANTS.map((item) => `
      <button class="mini-jamo-btn ${item.char === c.char ? 'active' : ''}" data-bc="${item.char}">${item.char}</button>
    `).join('');

    $('#builderVowels').innerHTML = HANGUL_VOWELS.map((item) => `
      <button class="mini-jamo-btn ${item.char === v.char ? 'active' : ''}" data-bv="${item.char}">${item.char}</button>
    `).join('');

    $$('[data-bc]').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        state.builderC = HANGUL_CONSONANTS[i];
        renderSyllableBuilder();
        speakKorean($('#builtSyllable').textContent);
      });
    });

    $$('[data-bv]').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        state.builderV = HANGUL_VOWELS[i];
        renderSyllableBuilder();
        speakKorean($('#builtSyllable').textContent);
      });
    });
  }

  $('#builtAudioBtn').addEventListener('click', () => {
    speakKorean($('#builtSyllable').textContent);
  });

  // PRACTICE TAB
  function switchPracticeMode(mode) {
    $$('[data-practice-mode]').forEach((b) => {
      b.classList.toggle('active', b.dataset.practiceMode === mode);
    });
    ['flashcards', 'match', 'quiz'].forEach((m) => {
      $(`#pane-${m}`).classList.toggle('hidden', m !== mode);
    });
    if (mode === 'match') initMatchGame();
    if (mode === 'quiz') renderQuiz();
  }

  $$('[data-practice-mode]').forEach((btn) => {
    btn.addEventListener('click', () => switchPracticeMode(btn.dataset.practiceMode));
  });

  // Flashcards
  const deck = VOCAB_DATA.slice(0, 8);
  function renderFlashcard() {
    const card = deck[state.flashcardIdx % deck.length];
    state.flashcardFlipped = false;
    $('#flashcard').classList.remove('flipped');
    $('#cardProgressText').textContent = `Картка ${(state.flashcardIdx % deck.length) + 1} з ${deck.length}`;
    $('#fcCategory').textContent = card.cat.toUpperCase();
    $('#fcKorean').textContent = card.kr;
    $('#fcUkrainian').textContent = card.uk;
    $('#fcPhonetic').textContent = card.tr;
    $('#fcNote').textContent = card.note;
  }

  $('#flashcardWrap').addEventListener('click', (e) => {
    if (e.target.closest('#fcAudioBtn')) return;
    state.flashcardFlipped = !state.flashcardFlipped;
    $('#flashcard').classList.toggle('flipped', state.flashcardFlipped);
  });

  $('#fcAudioBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    speakKorean(deck[state.flashcardIdx % deck.length].kr);
  });

  $('#fcKnowBtn').addEventListener('click', () => {
    addXP(10);
    showToast('✓ Чудово! +10 XP');
    state.flashcardIdx += 1;
    renderFlashcard();
  });

  $('#fcRepeatBtn').addEventListener('click', () => {
    state.flashcardIdx += 1;
    renderFlashcard();
  });

  // Matching Game
  function initMatchGame() {
    const sample = [...VOCAB_DATA].sort(() => Math.random() - 0.5).slice(0, 4);
    const tiles = [];
    sample.forEach((item) => {
      tiles.push({ id: item.id, type: 'kr', label: item.kr });
      tiles.push({ id: item.id, type: 'uk', label: item.uk });
    });
    tiles.sort(() => Math.random() - 0.5);

    state.matchSelected = [];
    state.matchedIds = new Set();
    $('#matchComplete').classList.add('hidden');

    const grid = $('#matchGrid');
    grid.innerHTML = tiles.map((t, i) => `
      <button class="match-tile ${t.type}" data-idx="${i}" data-id="${t.id}" data-type="${t.type}">
        ${t.label}
      </button>
    `).join('');

    grid.querySelectorAll('.match-tile').forEach((btn) => {
      btn.addEventListener('click', () => handleMatchClick(btn));
    });
  }

  function handleMatchClick(btn) {
    if (btn.classList.contains('matched') || btn.classList.contains('selected')) return;
    if (state.matchSelected.length >= 2) return;

    btn.classList.add('selected');
    state.matchSelected.push(btn);

    if (btn.dataset.type === 'kr') speakKorean(btn.textContent.trim());

    if (state.matchSelected.length === 2) {
      const [first, second] = state.matchSelected;
      const isPair = first.dataset.id === second.dataset.id && first.dataset.type !== second.dataset.type;

      if (isPair) {
        first.classList.remove('selected');
        second.classList.remove('selected');
        first.classList.add('matched');
        second.classList.add('matched');
        state.matchedIds.add(first.dataset.id);
        state.matchSelected = [];

        if (state.matchedIds.size === 4) {
          addXP(25);
          $('#matchComplete').classList.remove('hidden');
        }
      } else {
        first.classList.add('error');
        second.classList.add('error');
        setTimeout(() => {
          first.classList.remove('selected', 'error');
          second.classList.remove('selected', 'error');
          state.matchSelected = [];
        }, 500);
      }
    }
  }

  $('#resetMatchBtn').addEventListener('click', initMatchGame);
  $('#playAgainMatchBtn').addEventListener('click', initMatchGame);

  // Quiz
  function renderQuiz() {
    const q = QUIZ_ITEMS[state.quizIdx % QUIZ_ITEMS.length];
    $('#quizStepLabel').textContent = `Питання ${(state.quizIdx % QUIZ_ITEMS.length) + 1} / ${QUIZ_ITEMS.length}`;
    $('#quizKr').textContent = q.kr;
    $('#quizTr').textContent = q.tr;

    const opts = $('#quizOptions');
    opts.innerHTML = '';
    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (opt === q.answer) {
          btn.classList.add('correct');
          addXP(15);
          speakKorean(q.kr);
          setTimeout(() => {
            state.quizIdx += 1;
            renderQuiz();
          }, 800);
        } else {
          btn.classList.add('wrong');
          setTimeout(() => btn.classList.remove('wrong'), 500);
        }
      });
      opts.appendChild(btn);
    });
  }

  $('#quizSpeakBtn').addEventListener('click', () => {
    speakKorean(QUIZ_ITEMS[state.quizIdx % QUIZ_ITEMS.length].kr);
  });

  // VOCABULARY TAB
  function renderVocab() {
    const query = state.vocabQuery.trim().toLowerCase();
    const filtered = VOCAB_DATA.filter((item) => {
      const matchCat = state.vocabFilter === 'all'
        ? true
        : state.vocabFilter === 'fav'
          ? state.favorites.has(item.id)
          : item.cat === state.vocabFilter;
      const matchQuery = !query ||
        item.kr.includes(query) ||
        item.uk.toLowerCase().includes(query) ||
        item.tr.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    const grid = $('#vocabGrid');
    if (filtered.length === 0) {
      grid.innerHTML = `<div class="tile tile-wide"><p>Нічого не знайдено. Спробуйте інше слово.</p></div>`;
      return;
    }

    grid.innerHTML = filtered.map((item) => `
      <article class="vocab-tile">
        <div class="vocab-top">
          <button class="audio-btn" data-speak="${item.kr}" aria-label="Слухати ${item.kr}">🔊</button>
          <button class="fav-btn ${state.favorites.has(item.id) ? 'active' : ''}" data-fav="${item.id}" aria-label="Додати в обране">⭐</button>
        </div>
        <div>
          <div class="vocab-kr">${item.kr}</div>
          <div class="vocab-tr">${item.tr}</div>
        </div>
        <div class="vocab-uk">${item.uk}</div>
      </article>
    `).join('');

    grid.querySelectorAll('[data-fav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.fav);
        if (state.favorites.has(id)) {
          state.favorites.delete(id);
        } else {
          state.favorites.add(id);
        }
        renderVocab();
        syncProfile();
      });
    });
  }

  // PROFILE TAB
  function syncProfile() {
    const levelGoal = 500;
    const level = Math.floor(state.xp / levelGoal) + 2;
    const xpInLevel = state.xp % levelGoal;
    const pct = Math.min(Math.round((xpInLevel / levelGoal) * 100), 100);

    $('#profileLevelChip').textContent = `Рівень ${level} · TOPIK 1`;
    $('#profileXpProgressText').textContent = `${state.xp} / ${(level - 1) * levelGoal} XP`;
    $('#profileXpFill').style.width = `${pct}%`;
    $('#profileStreakVal').textContent = state.streak;
    $('#profileFavCount').textContent = state.favorites.size;
    $('#profileQuestVal').textContent = state.questDone;

    const unlockedMaster = state.xp >= 300;
    $('#badgeMaster').classList.toggle('unlocked', unlockedMaster);
    $('#badgeSummary').textContent = unlockedMaster ? '4 / 4' : '3 / 4';

    const themeBtn = $('#profileThemeBtn');
    themeBtn.classList.toggle('active', state.dark);
    themeBtn.setAttribute('aria-pressed', String(state.dark));
    themeBtn.textContent = state.dark ? 'Увімкнено' : 'Вимкнено';
  }

  $('#avatarCycleBtn').addEventListener('click', () => {
    state.avatarIdx = (state.avatarIdx + 1) % state.avatars.length;
    $('#avatarCycleBtn').textContent = state.avatars[state.avatarIdx];
  });

  $('#editNameBtn').addEventListener('click', () => {
    const current = $('#profileNameText').textContent;
    const next = window.prompt('Введіть ваше ім’я для профілю:', current);
    if (next && next.trim()) {
      $('#profileNameText').textContent = next.trim().slice(0, 24);
      showToast('Ім’я профілю оновлено');
    }
  });

  $$('#accentSwatches .swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accent = btn.dataset.accent;
      state.accent = accent;
      document.body.classList.remove('accent-rose', 'accent-mint', 'accent-amber');
      if (accent !== 'indigo') {
        document.body.classList.add(`accent-${accent}`);
      }
      $$('#accentSwatches .swatch').forEach((s) => s.classList.remove('active'));
      btn.classList.add('active');
      showToast('Палітру оновлено 🎨');
    });
  });

  $('#profileThemeBtn').addEventListener('click', toggleTheme);

  $('#speechRateBtn').addEventListener('click', () => {
    state.speechRate = state.speechRate === 0.88 ? 0.7 : 0.88;
    $('#speechRateBtn').textContent = state.speechRate === 0.7 ? '0.70x (Повільно)' : '0.88x (Стандарт)';
    showToast(`Швидкість вимови: ${state.speechRate}x`);
  });

  $('#vocabSearch').addEventListener('input', (e) => {
    state.vocabQuery = e.target.value;
    renderVocab();
  });

  $$('#vocabFilters .filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('#vocabFilters .filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.vocabFilter = chip.dataset.filter;
      renderVocab();
    });
  });

  // Init
  updateQuestRing();
  renderQuickChallenge();
  renderTopicRail();
  renderJamoGrid();
  renderFlashcard();
  renderVocab();
  syncProfile();
})();
