// ========================================
// 복권 번호 생성기 - 메인 로직
// ========================================

class LotteryApp {
  constructor() {
    this.currentType = 'lotto'; // 'lotto' or 'pension'
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
    this.setupEventListeners();
    this.setupTheme();
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

  // 로또 번호 생성 (1~45 중 6개)
  generateLotto() {
    const numbers = [];
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

    this.renderResults(results);
    this.updateStats();
    this.analyzeNumbers(results);
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
  }
}

// 앱 초기화
const app = new LotteryApp();

// PWA 설치 프롬프트
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
