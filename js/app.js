// ========================================
// 복권 번호 생성기 - 메인 로직
// ========================================

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

    this.init();
  }

  init() {
    this.renderSaved();
    this.renderStats();
    this.buildNumberPicker();
    this.setupEventListeners();
    this.setupTheme();
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
      : '없음';
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

    // 프리미엄 버튼 표시
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

    resultsSection.scrollIntoView({ behavior: 'smooth' });

    container.innerHTML = results.map((result, index) => {
      if (result.type === 'lotto') {
        return this.renderLottoResult(result, index);
      } else {
        return this.renderPensionResult(result, index);
      }
    }).join('');
  }

  // 로또 결과 렌더링
  renderLottoResult(result, index) {
    const balls = result.numbers.map((num, i) => `
      <div class="number-ball lotto" style="animation-delay: ${i * 0.1}s">
        ${num}
      </div>
    `).join('');

    return `
      <div class="result-item" style="animation-delay: ${index * 0.1}s">
        <div class="result-header">
          <span class="result-label">로또 6/45 - ${index + 1}번째</span>
          <button class="save-btn" onclick="app.saveNumber(${index})">
            저장
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
          <span class="result-label">연금복권 - ${index + 1}번째</span>
          <button class="save-btn" onclick="app.saveNumber(${index})">
            저장
          </button>
        </div>
        <div class="numbers-display">
          <div class="pension-group">
            <span class="pension-label">${group}조</span>
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
      alert('이미 저장된 번호입니다.');
      return;
    }

    this.saved.unshift(result);
    this.saveToStorage('saved', this.saved);
    this.renderSaved();
    this.renderStats();

    // 버튼 상태 변경
    const btn = document.querySelectorAll('.save-btn')[index];
    if (btn) {
      btn.textContent = '저장됨';
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
      container.innerHTML = '<p class="empty-message">저장된 번호가 없습니다</p>';
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
              <span class="result-label">로또 6/45</span>
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
              <span class="result-label">연금복권</span>
              <button class="delete-btn" onclick="app.deleteSaved(${index})">
                ✕
              </button>
            </div>
            <div class="numbers-display">
              <div class="pension-group">
                <span class="pension-label">${group}조</span>
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
    if (confirm('이 번호를 삭제하시겠습니까?')) {
      this.saved.splice(index, 1);
      this.saveToStorage('saved', this.saved);
      this.renderSaved();
      this.renderStats();
    }
  }

  // 전체 삭제
  clearAllSaved() {
    if (confirm('저장된 모든 번호를 삭제하시겠습니까?')) {
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

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    this.stats.luckyDayOfWeek = dayNames[luckyDayIndex] + '요일';
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
      '<p class="empty-message">버튼을 눌러 행운의 번호를 생성하세요!</p>';
  }

  // 테마 설정
  setupTheme() {
    const savedTheme = localStorage.getItem('lottery_theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      document.getElementById('themeToggle').querySelector('.theme-icon').textContent = '☀️';
    }
  }

  // 테마 토글
  toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeToggle').querySelector('.theme-icon');

    body.classList.toggle('light-theme');
    const isLight = body.classList.contains('light-theme');

    themeIcon.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('lottery_theme', isLight ? 'light' : 'dark');
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
          closeBtn.textContent = '닫기';
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

      const luckyMessages = [
        '이 번호 조합은 균형 잡힌 분포를 보입니다. 역대 당첨 번호의 70%가 유사한 패턴입니다.',
        '홀짝 비율이 안정적입니다. 통계적으로 3:3 또는 4:2 비율의 당첨 확률이 높습니다.',
        '번호 합계가 적정 범위(100~175)에 있어 좋은 조합입니다.',
        '연번이 포함되어 있으면 당첨 확률에 긍정적 영향을 줍니다.',
        '번호 간 간격이 고르게 분포되어 있어 이상적인 조합입니다.'
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
          <h3>번호 합계 분석</h3>
          <p>합계: <strong>${sum}</strong> ${sum >= 100 && sum <= 175 ? '(적정 범위 ✅)' : '(범위 초과 ⚠️)'}</p>
          <p>역대 당첨 번호의 합계 평균은 약 130~140입니다.</p>
        </div>
        <div class="premium-analysis-item">
          <h3>홀짝 비율</h3>
          <p>홀수 ${oddCount}개 / 짝수 ${6 - oddCount}개</p>
          <p>${oddCount >= 2 && oddCount <= 4 ? '균형 잡힌 비율입니다 ✅' : '편중된 비율입니다 ⚠️'}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>고저 비율</h3>
          <p>저번호(1~22) ${lowCount}개 / 고번호(23~45) ${highCount}개</p>
        </div>
        <div class="premium-analysis-item">
          <h3>연번 분석</h3>
          <p>${consecutivePairs.length > 0 ? `연번: ${consecutivePairs.join(', ')} 포함` : '연번 없음'}</p>
          <p>역대 당첨 번호의 약 60%에 연번이 포함되어 있습니다.</p>
        </div>
        <div class="premium-analysis-item">
          <h3>AI 운세 메시지</h3>
          <p class="lucky-message">${luckyMessages[Math.floor(Math.random() * luckyMessages.length)]}</p>
        </div>
      `;
    } else {
      const { group, numbers } = result.data;
      premiumBody.innerHTML = `
        <div class="premium-pension">
          <p class="pension-display">${group}조 ${numbers.join('')}</p>
        </div>
        <div class="premium-analysis-item">
          <h3>조 분석</h3>
          <p>${group}조 번호입니다. 연금복권은 각 조마다 동일한 당첨 확률을 가집니다.</p>
        </div>
        <div class="premium-analysis-item">
          <h3>번호 특성</h3>
          <p>6자리 번호의 각 자리는 독립적으로 추첨됩니다. 모든 조합이 동일한 확률을 가집니다.</p>
        </div>
        <div class="premium-analysis-item">
          <h3>AI 운세 메시지</h3>
          <p class="lucky-message">행운은 준비된 자에게 찾아옵니다. 오늘의 번호가 좋은 에너지를 담고 있습니다.</p>
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

    // 프리미엄 버튼
    document.getElementById('premiumBtn').addEventListener('click', () => {
      this.showPremiumContent();
    });

    // 프리미엄 모달 닫기
    document.getElementById('closePremiumBtn').addEventListener('click', () => {
      document.getElementById('premiumModal').classList.add('hidden');
    });
  }
}

// 앱 초기화
const app = new LotteryApp();

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
