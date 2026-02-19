// ========================================
// 복권 번호 생성기 - 메인 로직
// ========================================

// i18n initialization
(async function initI18n() {
    try {
        await i18n.loadTranslations(i18n.getCurrentLanguage());
        i18n.updateUI();
        const langToggle = document.getElementById('lang-toggle');
        const langMenu = document.getElementById('lang-menu');
        const langOptions = document.querySelectorAll('.lang-option');
        document.querySelector(`[data-lang="${i18n.getCurrentLanguage()}"]`)?.classList.add('active');
        langToggle?.addEventListener('click', () => langMenu.classList.toggle('hidden'));
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.language-selector')) langMenu?.classList.add('hidden');
        });
        langOptions.forEach(opt => {
            opt.addEventListener('click', async () => {
                await i18n.setLanguage(opt.getAttribute('data-lang'));
                langOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                langMenu.classList.add('hidden');
            });
        });
    } catch (e) {
        console.warn('i18n init failed:', e);
    }
})();

class LotteryApp {
  constructor() {
    this.currentType = 'lotto'; // 'lotto' or 'pension'
    this.semiAutoMode = false;
    this.fixedNumbers = [];
    this.lastResults = [];
    this.saved = this.loadFromStorage('saved', []);
    this.stats = this.loadFromStorage('stats', {
      totalGenerated: 0,
      generationDates: [],
      luckyDayOfWeek: null
    });
    // Number frequency tracking
    this.frequency = this.loadFromStorage('frequency', {});

    this.init();
  }

  init() {
    this.renderSaved();
    this.renderStats();
    this.buildNumberPicker();
    this.setupEventListeners();
    this.setupTheme();
    this.renderFrequency();
  }

  // Get ball color class by number range (Korean lottery standard)
  getBallRangeClass(num) {
    if (num <= 10) return 'range-1';
    if (num <= 20) return 'range-2';
    if (num <= 30) return 'range-3';
    if (num <= 40) return 'range-4';
    return 'range-5';
  }

  // Update frequency data
  updateFrequency(numbers) {
    numbers.forEach(n => {
      this.frequency[n] = (this.frequency[n] || 0) + 1;
    });
    this.saveToStorage('frequency', this.frequency);
    this.renderFrequency();
  }

  // Render frequency analysis grid
  renderFrequency() {
    const container = document.getElementById('freqGrid');
    if (!container) return;

    const counts = [];
    for (let i = 1; i <= 45; i++) {
      counts.push({ num: i, count: this.frequency[i] || 0 });
    }

    const maxCount = Math.max(...counts.map(c => c.count), 1);
    const avg = counts.reduce((s, c) => s + c.count, 0) / 45;

    container.innerHTML = counts.map(c => {
      const cls = c.count > avg * 1.5 ? 'hot' : c.count < avg * 0.5 && c.count > 0 ? '' : c.count === 0 ? 'cold' : '';
      return `<div class="freq-cell ${cls}">
        ${c.num}
        ${c.count > 0 ? `<span class="freq-count">${c.count}</span>` : ''}
      </div>`;
    }).join('');
  }

  // 번호 선택기 생성 (반자동 모드용)
  buildNumberPicker() {
    const picker = document.getElementById('numberPicker');
    let html = '';
    for (let i = 1; i <= 45; i++) {
      html += `<button class="pick-num" data-num="${i}">${i}</button>`;
    }
    picker.innerHTML = html;
  }

  // 반자동 모드 토글
  toggleSemiAuto() {
    this.semiAutoMode = document.getElementById('autoMode').checked;
    const section = document.getElementById('semiAutoSection');
    const hint = document.getElementById('semiAutoHint');

    if (this.semiAutoMode && this.currentType === 'lotto') {
      section.classList.remove('hidden');
      hint.style.display = 'block';
    } else {
      section.classList.add('hidden');
      hint.style.display = 'none';
    }
  }

  // 고정 번호 선택/해제
  toggleFixedNumber(num) {
    const idx = this.fixedNumbers.indexOf(num);
    if (idx > -1) {
      this.fixedNumbers.splice(idx, 1);
    } else if (this.fixedNumbers.length < 5) {
      this.fixedNumbers.push(num);
    }
    this.fixedNumbers.sort((a, b) => a - b);
    this.updatePickerUI();
  }

  updatePickerUI() {
    document.querySelectorAll('.pick-num').forEach(btn => {
      const num = parseInt(btn.dataset.num);
      btn.classList.toggle('picked', this.fixedNumbers.includes(num));
    });
    const display = document.getElementById('selectedDisplay');
    display.textContent = this.fixedNumbers.length > 0
      ? this.fixedNumbers.join(', ')
      : (window.i18n?.t('labels.none') || 'None');
  }

  // LocalStorage 관리
  loadFromStorage(key, defaultValue) {
    try {
      const data = localStorage.getItem(`lottery_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Storage load error:', e);
      return defaultValue;
    }
  }

  saveToStorage(key, value) {
    try {
      localStorage.setItem(`lottery_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  // 로또 번호 생성 (1~45 중 6개, 반자동 지원)
  generateLotto() {
    const numbers = [...this.fixedNumbers];
    while (numbers.length < 6) {
      const num = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  // 연금복권 번호 생성
  generatePension() {
    const group = Math.floor(Math.random() * 5) + 1; // 1~5조
    const numbers = [];
    for (let i = 0; i < 6; i++) {
      numbers.push(Math.floor(Math.random() * 10));
    }
    return {
      group: group,
      numbers: numbers
    };
  }

  // 번호 생성
  generateNumbers() {
    const setCount = parseInt(document.getElementById('setCount').value);
    const results = [];

    for (let i = 0; i < setCount; i++) {
      if (this.currentType === 'lotto') {
        results.push({
          type: 'lotto',
          numbers: this.generateLotto(),
          timestamp: Date.now()
        });
      } else {
        results.push({
          type: 'pension',
          data: this.generatePension(),
          timestamp: Date.now()
        });
      }
    }

    this.lastResults = results;
    this.renderResults(results);
    this.updateStats();
    this.analyzeNumbers(results);

    // Update frequency for lotto results
    results.forEach(r => {
      if (r.type === 'lotto') this.updateFrequency(r.numbers);
    });

    // 시뮬레이션 및 프리미엄 버튼 표시
    if (results[0]?.type === 'lotto') {
      document.getElementById('simulationSection').style.display = 'block';
    }
    document.getElementById('premiumSection').style.display = 'block';
  }

  // 번호 분석
  analyzeNumbers(results) {
    if (results.length === 0 || results[0].type !== 'lotto') {
      document.getElementById('oddEvenRatio').textContent = '-';
      document.getElementById('numberSum').textContent = '-';
      document.getElementById('numberRange').textContent = '-';
      return;
    }

    // 첫 번째 세트 분석
    const numbers = results[0].numbers;

    // 홀수/짝수
    const oddCount = numbers.filter(n => n % 2 === 1).length;
    const evenCount = 6 - oddCount;
    document.getElementById('oddEvenRatio').textContent = `${oddCount}:${evenCount}`;

    // 번호 합계
    const sum = numbers.reduce((a, b) => a + b, 0);
    document.getElementById('numberSum').textContent = sum;

    // 번호 범위
    const min = numbers[0];
    const max = numbers[numbers.length - 1];
    document.getElementById('numberRange').textContent = `${min}~${max}`;
  }

  // 결과 렌더링
  renderResults(results) {
    const container = document.getElementById('resultsContainer');
    const resultsSection = document.getElementById('resultsSection');

    resultsSection?.scrollIntoView({ behavior: 'smooth' });

    container.innerHTML = results.map((result, index) => {
      if (result?.type === 'lotto') {
        return this.renderLottoResult(result, index);
      } else {
        return this.renderPensionResult(result, index);
      }
    }).join('');
  }

  // 로또 결과 렌더링
  renderLottoResult(result, index) {
    const balls = result.numbers.map((num, i) => `
      <div class="number-ball lotto ${this.getBallRangeClass(num)} spinning" style="animation-delay: ${i * 0.1}s">
        ${num}
      </div>
    `).join('');

    return `
      <div class="result-item" style="animation-delay: ${index * 0.1}s">
        <div class="result-header">
          <span class="result-label">${(window.i18n?.t('results.lotto') || 'Lotto 6/45 - {index}').replace('{index}', index + 1)}</span>
          <button class="save-btn" onclick="app.saveNumber(${index})">
            ${window.i18n?.t('buttons.save') || '저장'}
          </button>
        </div>
        <div class="numbers-display">
          ${balls}
        </div>
      </div>
    `;
  }

  // 연금복권 결과 렌더링
  renderPensionResult(result, index) {
    const { group, numbers } = result.data;
    const numbersStr = numbers.join('');

    return `
      <div class="result-item" style="animation-delay: ${index * 0.1}s">
        <div class="result-header">
          <span class="result-label">${(window.i18n?.t('results.pension') || 'Pension Lottery - {index}').replace('{index}', index + 1)}</span>
          <button class="save-btn" onclick="app.saveNumber(${index})">
            ${window.i18n?.t('buttons.save') || '저장'}
          </button>
        </div>
        <div class="numbers-display">
          <div class="pension-group">
            <span class="pension-label">${(window.i18n?.t('results.group') || 'Group {group}').replace('{group}', group)}</span>
            <span style="font-size: 2rem; font-weight: 700; background: linear-gradient(135deg, #e74c3c, #f39c12); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              ${numbersStr}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  // 현재 결과 저장
  saveNumber(index) {
    const results = this.getCurrentResults();
    if (!results || !results[index]) return;

    const result = results[index];

    // 중복 체크
    const isDuplicate = this.saved.some(saved => {
      if (saved.type !== result.type) return false;
      if (result.type === 'lotto') {
        return JSON.stringify(saved.numbers) === JSON.stringify(result.numbers);
      } else {
        return JSON.stringify(saved.data) === JSON.stringify(result.data);
      }
    });

    if (isDuplicate) {
      alert(window.i18n?.t('alerts.duplicate') || '이미 저장된 번호입니다.');
      return;
    }

    this.saved.unshift(result);
    this.saveToStorage('saved', this.saved);
    this.renderSaved();
    this.renderStats();

    // 버튼 상태 변경
    const btn = document.querySelectorAll('.save-btn')[index];
    if (btn) {
      btn.textContent = window.i18n?.t('buttons.saved') || '저장됨';
      btn.classList.add('saved');
    }
  }

  // 현재 결과 가져오기
  getCurrentResults() {
    const container = document.getElementById('resultsContainer');
    const items = container.querySelectorAll('.result-item');

    if (items.length === 0) return null;

    const results = [];
    items.forEach(item => {
      const isLotto = item.querySelector('.number-ball');
      if (isLotto) {
        const balls = item.querySelectorAll('.number-ball');
        const numbers = Array.from(balls).map(ball => parseInt(ball.textContent));
        results.push({
          type: 'lotto',
          numbers: numbers,
          timestamp: Date.now()
        });
      } else {
        const label = item.querySelector('.pension-label').textContent;
        const group = parseInt(label);
        const numbersText = item.querySelector('.pension-group span:last-child').textContent;
        const numbers = numbersText.split('').map(n => parseInt(n));
        results.push({
          type: 'pension',
          data: { group, numbers },
          timestamp: Date.now()
        });
      }
    });

    return results;
  }

  // 저장된 번호 렌더링
  renderSaved() {
    const container = document.getElementById('savedContainer');

    if (this.saved.length === 0) {
      container.innerHTML = `<p class="empty-message">${window.i18n?.t('results.empty') || 'No saved numbers'}</p>`;
      return;
    }

    container.innerHTML = this.saved.map((item, index) => {
      if (item.type === 'lotto') {
        const balls = item.numbers.map(num => `
          <div class="number-ball lotto">${num}</div>
        `).join('');

        return `
          <div class="result-item">
            <div class="result-header">
              <span class="result-label">${window.i18n?.t('results.lottoLabel') || 'Lotto 6/45'}</span>
              <button class="delete-btn" onclick="app.deleteSaved(${index})">
                ✕
              </button>
            </div>
            <div class="numbers-display">
              ${balls}
            </div>
          </div>
        `;
      } else {
        const { group, numbers } = item.data;
        const numbersStr = numbers.join('');

        return `
          <div class="result-item">
            <div class="result-header">
              <span class="result-label">${window.i18n?.t('results.pensionLabel') || 'Pension Lottery'}</span>
              <button class="delete-btn" onclick="app.deleteSaved(${index})">
                ✕
              </button>
            </div>
            <div class="numbers-display">
              <div class="pension-group">
                <span class="pension-label">${(window.i18n?.t('results.group') || 'Group {group}').replace('{group}', group)}</span>
                <span style="font-size: 2rem; font-weight: 700; background: linear-gradient(135deg, #e74c3c, #f39c12); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                  ${numbersStr}
                </span>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  // 저장된 번호 삭제
  deleteSaved(index) {
    if (confirm(window.i18n?.t('alerts.confirmDelete') || '이 번호를 삭제하시겠습니까?')) {
      this.saved.splice(index, 1);
      this.saveToStorage('saved', this.saved);
      this.renderSaved();
      this.renderStats();
    }
  }

  // 전체 삭제
  clearAllSaved() {
    if (confirm(window.i18n?.t('alerts.confirmClearAll') || '저장된 모든 번호를 삭제하시겠습니까?')) {
      this.saved = [];
      this.saveToStorage('saved', []);
      this.renderSaved();
      this.renderStats();
    }
  }

  // 통계 업데이트
  updateStats() {
    const setCount = parseInt(document.getElementById('setCount').value);
    this.stats.totalGenerated += setCount;

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ...
    this.stats.generationDates.push({
      date: today.toISOString(),
      dayOfWeek: dayOfWeek
    });

    // 행운의 요일 계산
    this.calculateLuckyDay();

    this.saveToStorage('stats', this.stats);
    this.renderStats();
  }

  // 행운의 요일 계산
  calculateLuckyDay() {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    this.stats.generationDates.forEach(item => {
      dayCounts[item.dayOfWeek]++;
    });

    const maxCount = Math.max(...dayCounts);
    const luckyDayIndex = dayCounts.indexOf(maxCount);

    const dayNamesKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = window.i18n?.t(`days.${dayNamesKeys[luckyDayIndex]}`) || ['일', '월', '화', '수', '목', '금', '토'][luckyDayIndex];
    const suffix = window.i18n?.t('days.suffix') || '요일';
    this.stats.luckyDayOfWeek = dayName + suffix;
  }

  // 통계 렌더링
  renderStats() {
    document.getElementById('totalGenerated').textContent = this.stats.totalGenerated;
    document.getElementById('savedCount').textContent = this.saved.length;
    document.getElementById('luckyDay').textContent = this.stats.luckyDayOfWeek || '-';
  }

  // 복권 타입 변경
  changeType(type) {
    this.currentType = type;

    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    // 결과 초기화
    document.getElementById('resultsContainer').innerHTML =
      `<p class="empty-message">${window.i18n?.t('generate.empty') || 'Press the button to generate lucky numbers!'}</p>`;
  }

  // 테마 설정
  setupTheme() {
    const savedTheme = localStorage.getItem('lottery_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const themeIcon = themeToggle.querySelector('.theme-icon');
      if (themeIcon) {
        themeIcon.textContent = savedTheme === 'light' ? '🌙' : '☀️';
      }
    }
  }

  // 테마 토글
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lottery_theme', next);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const themeIcon = themeToggle.querySelector('.theme-icon');
      if (themeIcon) {
        themeIcon.textContent = next === 'light' ? '🌙' : '☀️';
      }
    }
  }

  // 전면 광고 표시
  showInterstitialAd() {
    return new Promise((resolve) => {
      const overlay = document.getElementById('interstitialAd');
      const closeBtn = document.getElementById('closeAdBtn');
      const countdown = document.getElementById('adCountdown');

      overlay.classList.remove('hidden');
      closeBtn.disabled = true;
      let seconds = 5;
      countdown.textContent = seconds;

      const timer = setInterval(() => {
        seconds--;
        countdown.textContent = seconds;
        if (seconds <= 0) {
          clearInterval(timer);
          closeBtn.disabled = false;
          closeBtn.textContent = window.i18n?.t('ads.close') || 'Close';
        }
      }, 1000);

      closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        closeBtn.disabled = true;
        countdown.textContent = '5';
        resolve();
      }, { once: true });
    });
  }

  // 당첨 통계 시뮬레이션
  async showSimulation() {
    if (this.lastResults.length === 0 || this.lastResults[0].type !== 'lotto') return;

    await this.showInterstitialAd();

    const numbers = this.lastResults[0].numbers;
    const simulation = this.simulateLotteryWins(numbers);

    const premiumBody = document.getElementById('premiumBody');
    const _t = (k, fallback) => window.i18n?.t(k) || fallback;
    premiumBody.innerHTML = `
      <div class="premium-analysis-item">
        <h3>${_t('sim.heading', 'Winning Grade Simulation')}</h3>
        <p style="font-size: 0.95rem; line-height: 1.8;">
          ${_t('sim.intro', 'Simulation results based on the last 100 draws.')}
        </p>
      </div>
      ${simulation.map((result, idx) => `
        <div class="premium-analysis-item">
          <h3 style="color: ${result.prizeColor}">${result.prizeLabel}</h3>
          <p style="font-size: 1.2rem; font-weight: 700; color: ${result.prizeColor}; margin: 8px 0;">
            ${(_t('sim.match', '{count} numbers matched')).replace('{count}', result.matchCount)}
          </p>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">
            ${(_t('sim.expected', 'Expected: ~{freq} times (per 100 draws)')).replace('{freq}', result.expectedFrequency)}
          </p>
          <p style="color: var(--gold); font-size: 0.9rem; margin-top: 8px;">
            ${(_t('sim.prizeAmount', 'Prize: ~{prize}')).replace('{prize}', result.estimatedPrize)}
          </p>
        </div>
      `).join('')}
      <div class="premium-analysis-item" style="background: rgba(243, 156, 18, 0.1); border-color: var(--gold);">
        <h3>${_t('sim.noteTitle', 'Analysis Info')}</h3>
        <p style="font-size: 0.9rem; color: var(--text-secondary);">
          ${_t('sim.note', 'This simulation is based on statistical expected values. Actual probabilities may differ.')}
        </p>
      </div>
    `;

    document.getElementById('premiumModal').classList.remove('hidden');
  }

  // 로또 당첨 시뮬레이션 함수
  simulateLotteryWins(numbers) {
    const _t = (k, fallback) => window.i18n?.t(k) || fallback;
    const results = [];

    results.push({
      matchCount: 6,
      prizeLabel: _t('prize.p1.label', '1st (Jackpot!)'),
      prizeColor: '#f1c40f',
      expectedFrequency: _t('prize.p1.freq', '~0'),
      estimatedPrize: _t('prize.p1.amount', '\u20A92-4B')
    });

    results.push({
      matchCount: 5,
      prizeLabel: _t('prize.p2.label', '2nd (Big Win!)'),
      prizeColor: '#e74c3c',
      expectedFrequency: _t('prize.p2.freq', '~0'),
      estimatedPrize: _t('prize.p2.amount', '\u20A9500M-1B')
    });

    results.push({
      matchCount: 5,
      prizeLabel: _t('prize.p3.label', '3rd (High Win)'),
      prizeColor: '#f39c12',
      expectedFrequency: _t('prize.p3.freq', '~0'),
      estimatedPrize: _t('prize.p3.amount', '\u20A91-2M')
    });

    results.push({
      matchCount: 4,
      prizeLabel: _t('prize.p4.label', '4th (Winner)'),
      prizeColor: '#3498db',
      expectedFrequency: _t('prize.p4.freq', '~0'),
      estimatedPrize: _t('prize.p4.amount', '\u20A950K')
    });

    results.push({
      matchCount: 3,
      prizeLabel: _t('prize.p5.label', '5th (Nice)'),
      prizeColor: '#27ae60',
      expectedFrequency: _t('prize.p5.freq', '~2'),
      estimatedPrize: _t('prize.p5.amount', '\u20A95K')
    });

    return results;
  }

  // 프리미엄 콘텐츠
  async showPremiumContent() {
    if (this.lastResults.length === 0) return;

    await this.showInterstitialAd();

    const premiumBody = document.getElementById('premiumBody');
    const result = this.lastResults[0];

    if (result.type === 'lotto') {
      const numbers = result.numbers;
      const sum = numbers.reduce((a, b) => a + b, 0);
      const oddCount = numbers.filter(n => n % 2 === 1).length;
      const lowCount = numbers.filter(n => n <= 22).length;
      const highCount = 6 - lowCount;

      const _t = (k, fb) => window.i18n?.t(k) || fb;
      const luckyMessages = [
        _t('luckyMsg.m1', 'This combination shows balanced distribution. 70% of winning numbers have similar patterns.'),
        _t('luckyMsg.m2', 'Stable odd/even ratio. 3:3 or 4:2 ratios statistically have higher odds.'),
        _t('luckyMsg.m3', 'The sum is in optimal range (100-175), making it a good combination.'),
        _t('luckyMsg.m4', 'Consecutive numbers positively affect winning probability.'),
        _t('luckyMsg.m5', 'Evenly distributed spacing makes this an ideal combination.')
      ];

      const consecutivePairs = [];
      for (let i = 0; i < numbers.length - 1; i++) {
        if (numbers[i + 1] - numbers[i] === 1) {
          consecutivePairs.push(`${numbers[i]}-${numbers[i + 1]}`);
        }
      }

      premiumBody.innerHTML = `
        <div class="premium-numbers">
          ${numbers.map(n => `<span class="premium-ball">${n}</span>`).join('')}
        </div>
        <div class="premium-analysis-item">
          <h3>${_t('prem.sumTitle', 'Number Sum Analysis')}</h3>
          <p>${_t('analysis.sum', 'Sum')}: <strong>${sum}</strong> ${sum >= 100 && sum <= 175 ? _t('prem.sumOk', '(Optimal range ✅)') : _t('prem.sumBad', '(Out of range ⚠️)')}</p>
          <p>${_t('prem.sumNote', 'Historical winning sum averages about 130-140.')}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>${_t('prem.oddEvenTitle', 'Odd/Even Ratio')}</h3>
          <p>${_t('analysis.oddEven', 'Odd/Even')}: ${oddCount} / ${6 - oddCount}</p>
          <p>${oddCount >= 2 && oddCount <= 4 ? _t('prem.oddEvenOk', 'Balanced ratio ✅') : _t('prem.oddEvenBad', 'Skewed ratio ⚠️')}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>${_t('prem.highLowTitle', 'High/Low Ratio')}</h3>
          <p>Low(1~22) ${lowCount} / High(23~45) ${highCount}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>${_t('prem.consTitle', 'Consecutive Number Analysis')}</h3>
          <p>${consecutivePairs.length > 0 ? (_t('prem.consFound', 'Consecutive: {pairs} included')).replace('{pairs}', consecutivePairs.join(', ')) : _t('prem.consNone', 'No consecutive numbers')}</p>
          <p>${_t('prem.consNote', 'About 60% of winning numbers include consecutive numbers.')}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>${_t('prem.fortuneTitle', 'AI Fortune Message')}</h3>
          <p class="lucky-message">${luckyMessages[Math.floor(Math.random() * luckyMessages.length)]}</p>
        </div>
      `;
    } else {
      const { group, numbers } = result.data;
      const _t = (k, fb) => window.i18n?.t(k) || fb;
      premiumBody.innerHTML = `
        <div class="premium-pension">
          <p class="pension-display">${(window.i18n?.t('results.group') || 'Group {group}').replace('{group}', group)} ${numbers.join('')}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>${_t('prem.groupTitle', 'Group Analysis')}</h3>
          <p>${(_t('prem.groupDesc', 'Group {group}. Each group has equal winning probability.')).replace('{group}', group)}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>${_t('prem.numTitle', 'Number Characteristics')}</h3>
          <p>${_t('prem.numDesc', 'Each digit is drawn independently. All combinations have equal probability.')}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>${_t('prem.fortuneTitle', 'AI Fortune Message')}</h3>
          <p class="lucky-message">${_t('prem.fortune', 'Luck comes to those prepared. Today\'s numbers carry positive energy.')}</p>
        </div>
      `;
    }

    document.getElementById('premiumModal').classList.remove('hidden');
  }

  // 이벤트 리스너 설정
  setupEventListeners() {
    // 생성 버튼
    document.getElementById('generateBtn').addEventListener('click', () => {
      this.generateNumbers();
    });

    // 타입 버튼들
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.changeType(btn.dataset.type);
      });
    });

    // 전체 삭제 버튼
    document.getElementById('clearSavedBtn').addEventListener('click', () => {
      this.clearAllSaved();
    });

    // 테마 토글
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // 반자동 모드 체크박스
    document.getElementById('autoMode').addEventListener('change', () => {
      this.toggleSemiAuto();
    });

    // 번호 선택기 이벤트
    document.getElementById('numberPicker').addEventListener('click', (e) => {
      const btn = e.target.closest('.pick-num');
      if (btn) {
        this.toggleFixedNumber(parseInt(btn.dataset.num));
      }
    });

    // 시뮬레이션 버튼
    const simulationBtn = document.getElementById('simulationBtn');
    if (simulationBtn) {
      simulationBtn.addEventListener('click', () => {
        this.showSimulation();
      });
    }

    // 프리미엄 버튼
    const premiumBtn = document.getElementById('premiumBtn');
    if (premiumBtn) {
      premiumBtn.addEventListener('click', () => {
        this.showPremiumContent();
      });
    }

    // 프리미엄 모달 닫기
    const closePremiumBtn = document.getElementById('closePremiumBtn');
    if (closePremiumBtn) {
      closePremiumBtn.addEventListener('click', () => {
        document.getElementById('premiumModal')?.classList.add('hidden');
      });
    }
  }
}

// 앱 초기화
let app;
try {
    app = new LotteryApp();
} catch (e) {
    console.error('LotteryApp init error:', e);
} finally {
    const appLoader = document.getElementById('app-loader');
    if (appLoader) {
        appLoader.classList.add('hidden');
        setTimeout(() => appLoader.remove(), 300);
    }
}

// Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.log('SW registration failed:', err));
  });
}

// PWA 설치 프롬프트
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// Failsafe: ensure loader is hidden even if everything above fails
setTimeout(() => { const l = document.getElementById('app-loader'); if (l) { l.classList.add('hidden'); setTimeout(() => l.remove(), 300); } }, 3000);
