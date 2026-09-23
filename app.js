// ============================================================
// মহাসিন ফার্ম - Main Application JavaScript
// ============================================================

const CONFIG = {
  scriptUrl: localStorage.getItem('mohasin_script_url') || '',
  sheetId: '18mHjHmAzy7ifoNdFNDycjb3f6ms6ZHyb8Las6N4EBG0'
};

const STORE_KEY = 'mohasin_farm_data';
let farmData = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
['cow','goat','chicken','fish','agriculture','other'].forEach(k => { if (!farmData[k]) farmData[k] = []; });

const CATEGORIES = {
  cow:         { label: 'গরুর হিসাব',     icon: '🐄', color: '#f4a01c' },
  goat:        { label: 'ছাগলের হিসাব',   icon: '🐐', color: '#a78bfa' },
  chicken:     { label: 'মুরগির হিসাব',   icon: '🐔', color: '#fb923c' },
  fish:        { label: 'মাছের হিসাব',    icon: '🐟', color: '#38bdf8' },
  agriculture: { label: 'কৃষি হিসাব',     icon: '🌾', color: '#4ade80' },
  other:       { label: 'অন্যান্য হিসাব', icon: '📋', color: '#f472b6' }
};

let categoryChartInstance = null;
let incomeExpenseChartInstance = null;
let currentFilter = 'month';
const reportCharts = {}; // stores chart instances per category
const reportFilters = {}; // stores current filter per category

// Delete state
let pendingDeleteType  = null;
let pendingDeleteIndex = null;

// Edit state
let pendingEditType  = null;
let pendingEditIndex = null;

// ====================================================
// INIT
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initSidebar();
  initNavigation();
  initLiveClock();
  initDateInputs();
  checkSetupBanner();
  loadSettings();
  updateDashboardStats();
});

function initLoader() {
  setTimeout(() => document.getElementById('page-loader').classList.add('hidden'), 1200);
}

// ====================================================
// SIDEBAR
// ====================================================
function initSidebar() {
  const menuBtn  = document.getElementById('menu-toggle');
  const closeBtn = document.getElementById('sidebar-close');
  const overlay  = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';
  overlay.onclick = closeSidebar;
  document.body.appendChild(overlay);
  menuBtn.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    overlay.classList.toggle('active');
  });
  closeBtn.addEventListener('click', closeSidebar);
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ====================================================
// NAVIGATION
// ====================================================
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page, 'entry');
    });
  });
}

function navigateTo(page, tab = 'entry') {
  // nav highlight
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');

  // page title
  const titles = {
    dashboard: 'ড্যাশবোর্ড', cow: 'গরুর হিসাব', goat: 'ছাগলের হিসাব',
    chicken: 'মুরগির হিসাব', fish: 'মাছের হিসাব',
    agriculture: 'কৃষি হিসাব', other: 'অন্যান্য হিসাব', summary: 'মোট হিসাব সারসংক্ষেপ'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  // show page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeSidebar();

  // activate tab
  if (CATEGORIES[page]) switchTab(page, tab);
  if (page === 'summary') renderSummary();
}

// ====================================================
// TAB SWITCHING
// ====================================================
function switchTab(type, tab) {
  const tabs = ['entry', 'view', 'report'];
  tabs.forEach(t => {
    const btn  = document.getElementById('tab-btn-'  + type + '-' + t);
    const pane = document.getElementById('tab-pane-' + type + '-' + t);
    if (btn)  btn.classList.toggle('active',  t === tab);
    if (pane) pane.classList.toggle('active', t === tab);
  });
  if (tab === 'view')   renderDataView(type);
  if (tab === 'report') renderCategoryReport(type, reportFilters[type] || 'all');
}

// ====================================================
// CATEGORY REPORT — মাস/বছর ভিত্তিক
// ====================================================
const MONTH_NAMES_BN = [
  'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'
];

function renderCategoryReport(type) {
  const container = document.getElementById('report-content-' + type);
  if (!container) return;

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Build year options: 5 years back → current year
  let yearOptions = '';
  for (let y = currentYear; y >= currentYear - 5; y--) {
    yearOptions += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
  }

  const monthOptions = MONTH_NAMES_BN.map((m, i) =>
    `<option value="${i+1}" ${i+1 === currentMonth ? 'selected' : ''}>${m}</option>`
  ).join('');

  container.innerHTML = `
    <div class="rpt-picker-card">
      <div class="rpt-picker-title">📅 মাস ও বছর নির্বাচন করুন</div>
      <div class="rpt-picker-row">
        <div class="rpt-picker-group">
          <label>📆 মাস</label>
          <select id="rpt-month-${type}" class="rpt-select">
            ${monthOptions}
          </select>
        </div>
        <div class="rpt-picker-group">
          <label>🗓️ বছর</label>
          <select id="rpt-year-${type}" class="rpt-select">
            ${yearOptions}
          </select>
        </div>
        <button class="btn-show-report" onclick="showMonthReport('${type}')">
          📊 হিসাব দেখুন
        </button>
      </div>
    </div>
    <div id="rpt-result-${type}"></div>
  `;

  // Auto-load current month
  showMonthReport(type);
}

function showMonthReport(type) {
  const monthEl = document.getElementById('rpt-month-' + type);
  const yearEl  = document.getElementById('rpt-year-'  + type);
  const resultEl = document.getElementById('rpt-result-' + type);
  if (!monthEl || !yearEl || !resultEl) return;

  const month = parseInt(monthEl.value);
  const year  = parseInt(yearEl.value);
  const ym    = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${MONTH_NAMES_BN[month-1]} ${year}`;

  const entries = farmData[type];
  const filtered = entries.filter(e => e.date && e.date.startsWith(ym));

  // Totals
  let totalIncome = 0, totalExpense = 0;
  filtered.forEach(e => { totalIncome += pf(e.income); totalExpense += pf(e.expense); });
  const profit = totalIncome - totalExpense;

  if (filtered.length === 0) {
    resultEl.innerHTML = `
      <div class="rpt-empty">
        <div class="rpt-empty-icon">📭</div>
        <p><strong>${monthLabel}</strong>-এ কোনো এন্ট্রি নেই।<br/>ডেটা এন্ট্রি ট্যাব থেকে ডেটা যোগ করুন।</p>
      </div>`;
    return;
  }

  // Build daily map for chart
  const dayMap = {};
  filtered.forEach(e => {
    const day = e.date;
    if (!dayMap[day]) dayMap[day] = { income: 0, expense: 0 };
    dayMap[day].income  += pf(e.income);
    dayMap[day].expense += pf(e.expense);
  });
  const sortedDays   = Object.keys(dayMap).sort();
  const dayLabels    = sortedDays.map(d => d.split('-')[2] + ' তারিখ');
  const dayIncomes   = sortedDays.map(d => dayMap[d].income);
  const dayExpenses  = sortedDays.map(d => dayMap[d].expense);

  resultEl.innerHTML = `
    <!-- Month Heading -->
    <div class="rpt-month-heading">
      <span class="rpt-month-badge">📅 ${monthLabel}</span>
      <span class="rpt-entry-badge">${filtered.length} টি এন্ট্রি</span>
    </div>

    <!-- Summary Cards -->
    <div class="rpt-summary-cards">
      <div class="rpt-card rpt-card-income">
        <div class="rpt-card-icon">📈</div>
        <div class="rpt-card-label">মোট আয়</div>
        <div class="rpt-card-value">৳ ${formatNum(totalIncome)}</div>
        <div class="rpt-card-sub">${monthLabel}</div>
      </div>
      <div class="rpt-card rpt-card-expense">
        <div class="rpt-card-icon">📉</div>
        <div class="rpt-card-label">মোট ব্যয়</div>
        <div class="rpt-card-value">৳ ${formatNum(totalExpense)}</div>
        <div class="rpt-card-sub">${monthLabel}</div>
      </div>
      <div class="rpt-card rpt-card-profit">
        <div class="rpt-card-icon">${profit >= 0 ? '💰' : '📛'}</div>
        <div class="rpt-card-label">নিট ${profit >= 0 ? 'লাভ' : 'লোকসান'}</div>
        <div class="rpt-card-value" style="color:${profit>=0?'var(--green-light)':'var(--red)'}">
          ${profit >= 0 ? '+' : ''}৳ ${formatNum(Math.abs(profit))}
        </div>
        <div class="rpt-card-sub">আয় − ব্যয়</div>
      </div>
    </div>

    <!-- Chart -->
    <div class="rpt-chart-row">
      <div class="rpt-chart-card" style="grid-column:1/-1">
        <div class="rpt-chart-title">📊 ${monthLabel} - দিন অনুযায়ী আয় ও ব্যয়</div>
        <canvas id="rpt-bar-${type}" height="200"></canvas>
      </div>
    </div>

    <!-- Detail Table -->
    <div class="rpt-monthly-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>তারিখ</th>
            <th>মোট আয় (৳)</th>
            <th>মোট ব্যয় (৳)</th>
            <th>লাভ / লোকসান (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((e, i) => {
            const inc = pf(e.income), exp = pf(e.expense), pr = inc - exp;
            const dateStr = e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('bn-BD') : '—';
            return `<tr>
              <td>${i+1}</td>
              <td>${dateStr}</td>
              <td class="rpt-income-cell">৳ ${formatNum(inc)}</td>
              <td class="rpt-expense-cell">৳ ${formatNum(exp)}</td>
              <td class="${pr>=0?'rpt-profit-pos':'rpt-profit-neg'}">${pr>=0?'+':''}৳ ${formatNum(Math.abs(pr))}</td>
            </tr>`;
          }).join('')}
          <tr style="background:var(--bg-secondary);">
            <td colspan="2"><strong>সর্বমোট</strong></td>
            <td class="rpt-income-cell"><strong>৳ ${formatNum(totalIncome)}</strong></td>
            <td class="rpt-expense-cell"><strong>৳ ${formatNum(totalExpense)}</strong></td>
            <td class="${profit>=0?'rpt-profit-pos':'rpt-profit-neg'}">
              <strong>${profit>=0?'+':''}৳ ${formatNum(Math.abs(profit))}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>`;

  // Draw bar chart
  setTimeout(() => {
    if (reportCharts['bar-'+type]) reportCharts['bar-'+type].destroy();
    const barCtx = document.getElementById('rpt-bar-' + type);
    if (barCtx) {
      reportCharts['bar-'+type] = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [
            { label: 'আয়', data: dayIncomes,  backgroundColor: 'rgba(46,160,67,0.75)', borderColor: '#2ea043', borderWidth: 1, borderRadius: 5 },
            { label: 'ব্যয়', data: dayExpenses, backgroundColor: 'rgba(248,81,73,0.75)', borderColor: '#f85149', borderWidth: 1, borderRadius: 5 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#8b949e', font: { family: 'Hind Siliguri', size: 10 } }, grid: { color: '#30363d' } },
            y: { ticks: { color: '#8b949e', font: { family: 'Hind Siliguri' } }, grid: { color: '#30363d' }, beginAtZero: true }
          },
          plugins: { legend: { labels: { color: '#8b949e', font: { family: 'Hind Siliguri', size: 11 } } } }
        }
      });
    }
  }, 50);
}

// ====================================================
// DATA VIEW RENDERER
// ====================================================
function renderDataView(type) {
  const tbody = document.getElementById('view-body-' + type);
  const summaryBar = document.getElementById('view-summary-' + type);
  if (!tbody) return;

  const entries = farmData[type];
  if (entries.length === 0) {
    tbody.innerHTML = `<tr class="no-data-row"><td colspan="20">📭 এখনো কোনো ডেটা নেই। প্রথমে "ডেটা এন্ট্রি" ট্যাব থেকে ডেটা যোগ করুন।</td></tr>`;
    if (summaryBar) summaryBar.innerHTML = '';
    return;
  }

  let totalIncome = 0, totalExpense = 0;

  // Action buttons HTML helper
  const actionBtns = (t, i) => `
    <div class="action-cell">
      <button class="btn-edit"  onclick="openEditModal('${t}',${i})"  title="সম্পাদনা করুন">✏️</button>
      <button class="btn-delete" onclick="askDelete('${t}',${i})" title="মুছুন">🗑️</button>
    </div>`;

  tbody.innerHTML = entries.map((e, i) => {
    const inc = parseFloat(e.income || 0);
    const exp = parseFloat(e.expense || 0);
    totalIncome += inc;
    totalExpense += exp;
    const rowClass = i % 2 === 1 ? 'even' : '';
    const dateStr = e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('bn-BD') : '—';

    let cells = '';
    switch (type) {
      case 'cow':
        cells = `
          <td>${dateStr}</td>
          <td>${e.cow_count || '—'}</td>
          <td>${e.milk_production || '—'}</td>
          <td>${fmtMoney(e.milk_price)}</td>
          <td>${fmtMoney(e.food_cost)}</td>
          <td>${fmtMoney(e.medicine_cost)}</td>
          <td>${e.buy_count || '—'}</td>
          <td>${fmtMoney(e.buy_price)}</td>
          <td>${e.sell_count || '—'}</td>
          <td>${fmtMoney(e.sell_price)}</td>
          <td class="td-income-val">${fmtMoney(inc)}</td>
          <td class="td-expense-val">${fmtMoney(exp)}</td>
          <td>${e.notes || '—'}</td>`;
        break;
      case 'goat':
        cells = `
          <td>${dateStr}</td>
          <td>${e.goat_count || '—'}</td>
          <td>${fmtMoney(e.food_cost)}</td>
          <td>${fmtMoney(e.medicine_cost)}</td>
          <td>${e.buy_count || '—'}</td>
          <td>${fmtMoney(e.buy_price)}</td>
          <td>${e.sell_count || '—'}</td>
          <td>${fmtMoney(e.sell_price)}</td>
          <td class="td-income-val">${fmtMoney(inc)}</td>
          <td class="td-expense-val">${fmtMoney(exp)}</td>
          <td>${e.notes || '—'}</td>`;
        break;
      case 'chicken':
        cells = `
          <td>${dateStr}</td>
          <td>${e.chicken_count || '—'}</td>
          <td>${e.eggs_produced || '—'}</td>
          <td>${fmtMoney(e.egg_price)}</td>
          <td>${fmtMoney(e.food_cost)}</td>
          <td>${fmtMoney(e.medicine_cost)}</td>
          <td>${e.sell_count || '—'}</td>
          <td>${fmtMoney(e.sell_price)}</td>
          <td class="td-income-val">${fmtMoney(inc)}</td>
          <td class="td-expense-val">${fmtMoney(exp)}</td>
          <td>${e.notes || '—'}</td>`;
        break;
      case 'fish':
        cells = `
          <td>${dateStr}</td>
          <td>${e.pond_name || '—'}</td>
          <td>${e.fish_species || '—'}</td>
          <td>${e.fish_quantity || '—'}</td>
          <td>${fmtMoney(e.food_medicine_cost)}</td>
          <td>${e.sell_quantity || '—'}</td>
          <td>${fmtMoney(e.sell_price)}</td>
          <td class="td-income-val">${fmtMoney(inc)}</td>
          <td class="td-expense-val">${fmtMoney(exp)}</td>
          <td>${e.notes || '—'}</td>`;
        break;
      case 'agriculture':
        cells = `
          <td>${dateStr}</td>
          <td>${e.crop_name || '—'}</td>
          <td>${e.land_size || '—'}</td>
          <td>${fmtMoney(e.seed_cost)}</td>
          <td>${fmtMoney(e.fertilizer_cost)}</td>
          <td>${fmtMoney(e.irrigation_cost)}</td>
          <td>${fmtMoney(e.labor_cost)}</td>
          <td>${e.production || '—'}</td>
          <td>${fmtMoney(e.sell_price)}</td>
          <td class="td-income-val">${fmtMoney(inc)}</td>
          <td class="td-expense-val">${fmtMoney(exp)}</td>
          <td>${e.notes || '—'}</td>`;
        break;
      case 'other':
        cells = `
          <td>${dateStr}</td>
          <td class="${e.type === 'আয়' ? 'td-type-income' : 'td-type-expense'}">${e.type || '—'}</td>
          <td>${e.description || '—'}</td>
          <td>${fmtMoney(e.amount)}</td>
          <td class="td-income-val">${fmtMoney(inc)}</td>
          <td class="td-expense-val">${fmtMoney(exp)}</td>
          <td>${e.notes || '—'}</td>`;
        break;
    }

    return `<tr class="${rowClass}" data-search-text="${(e.date||'')} ${(e.notes||'')} ${(e.description||'')} ${(e.crop_name||'')} ${(e.pond_name||'')} ${(e.fish_species||'')}">
      <td>${i + 1}</td>
      ${cells}
      <td>${actionBtns(type, i)}</td>
    </tr>`;
  }).join('');

  // Summary bar
  const profit = totalIncome - totalExpense;
  if (summaryBar) {
    summaryBar.innerHTML = `
      <div class="vsb-item">
        <span class="vsb-label">মোট এন্ট্রি</span>
        <span class="vsb-value vsb-count">${entries.length} টি</span>
      </div>
      <div class="vsb-item">
        <span class="vsb-label">মোট আয়</span>
        <span class="vsb-value vsb-income">৳ ${formatNum(totalIncome)}</span>
      </div>
      <div class="vsb-item">
        <span class="vsb-label">মোট ব্যয়</span>
        <span class="vsb-value vsb-expense">৳ ${formatNum(totalExpense)}</span>
      </div>
      <div class="vsb-item">
        <span class="vsb-label">নিট লাভ/লোকসান</span>
        <span class="vsb-value vsb-profit" style="color:${profit>=0?'var(--green-light)':'var(--red)'}">
          ${profit >= 0 ? '+' : ''}৳ ${formatNum(Math.abs(profit))}
        </span>
      </div>`;
  }
}

// ====================================================
// SEARCH / FILTER
// ====================================================
function filterTable(type, query) {
  const tbody = document.getElementById('view-body-' + type);
  if (!tbody) return;
  const q = query.toLowerCase().trim();
  tbody.querySelectorAll('tr').forEach(row => {
    if (row.classList.contains('no-data-row')) return;
    const text = (row.dataset.searchText || '').toLowerCase();
    row.classList.toggle('hidden-row', q !== '' && !text.includes(q));
  });
}

// ====================================================
// DELETE
// ====================================================
function askDelete(type, index) {
  pendingDeleteType = type;
  pendingDeleteIndex = index;
  document.getElementById('delete-modal').classList.add('active');
}
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('active');
  pendingDeleteType = null;
  pendingDeleteIndex = null;
}
function confirmDelete() {
  if (pendingDeleteType === null || pendingDeleteIndex === null) return;
  farmData[pendingDeleteType].splice(pendingDeleteIndex, 1);
  saveToLocalStorage();
  closeDeleteModal();
  renderDataView(pendingDeleteType);
  updateDashboardStats();
  showToast('🗑️ এন্ট্রি মুছে ফেলা হয়েছে', 'success');
}

// ====================================================
// CSV EXPORT
// ====================================================
function exportCSV(type) {
  const entries = farmData[type];
  if (entries.length === 0) { showToast('⚠️ কোনো ডেটা নেই', 'error'); return; }

  const headers = {
    cow: ['তারিখ','গরুর সংখ্যা','দুধ উৎপাদন','দুধ বিক্রয়','খাবার খরচ','চিকিৎসা','কেনা','কেনার মূল্য','বিক্রি','বিক্রির মূল্য','আয়','ব্যয়','মন্তব্য'],
    goat: ['তারিখ','ছাগলের সংখ্যা','খাবার খরচ','চিকিৎসা','কেনা','কেনার মূল্য','বিক্রি','বিক্রির মূল্য','আয়','ব্যয়','মন্তব্য'],
    chicken: ['তারিখ','মুরগির সংখ্যা','ডিম উৎপাদন','ডিম বিক্রয়','খাবার','ওষুধ','বিক্রি','বিক্রির মূল্য','আয়','ব্যয়','মন্তব্য'],
    fish: ['তারিখ','পুকুর/ঘের','প্রজাতি','পরিমাণ','খাবার/ওষুধ','বিক্রয় (কেজি)','বিক্রয় মূল্য','আয়','ব্যয়','মন্তব্য'],
    agriculture: ['তারিখ','ফসল','জমি (বিঘা)','বীজ','সার','সেচ','শ্রমিক','উৎপাদন (মণ)','বিক্রয়','আয়','ব্যয়','মন্তব্য'],
    other: ['তারিখ','ধরন','বিবরণ','পরিমাণ','আয়','ব্যয়','মন্তব্য']
  };

  const rowFn = {
    cow: e => [e.date,e.cow_count,e.milk_production,e.milk_price,e.food_cost,e.medicine_cost,e.buy_count,e.buy_price,e.sell_count,e.sell_price,e.income,e.expense,e.notes],
    goat: e => [e.date,e.goat_count,e.food_cost,e.medicine_cost,e.buy_count,e.buy_price,e.sell_count,e.sell_price,e.income,e.expense,e.notes],
    chicken: e => [e.date,e.chicken_count,e.eggs_produced,e.egg_price,e.food_cost,e.medicine_cost,e.sell_count,e.sell_price,e.income,e.expense,e.notes],
    fish: e => [e.date,e.pond_name,e.fish_species,e.fish_quantity,e.food_medicine_cost,e.sell_quantity,e.sell_price,e.income,e.expense,e.notes],
    agriculture: e => [e.date,e.crop_name,e.land_size,e.seed_cost,e.fertilizer_cost,e.irrigation_cost,e.labor_cost,e.production,e.sell_price,e.income,e.expense,e.notes],
    other: e => [e.date,e.type,e.description,e.amount,e.income,e.expense,e.notes]
  };

  const csvRows = [headers[type], ...entries.map(rowFn[type])];
  const csvContent = '\uFEFF' + csvRows.map(r => r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${CATEGORIES[type].label}_${new Date().toLocaleDateString('en-CA')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV ডাউনলোড শুরু হয়েছে!', 'success');
}

// ====================================================
// LIVE CLOCK
// ====================================================
function initLiveClock() {
  updateClock();
  setInterval(updateClock, 1000);
  const now = new Date();
  document.getElementById('sidebar-date').textContent = now.toLocaleDateString('bn-BD', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}
function updateClock() {
  const el = document.getElementById('live-time');
  if (el) el.textContent = '🕐 ' + new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ====================================================
// DATE INPUTS
// ====================================================
function initDateInputs() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(i => { i.value = today; });
}

// ====================================================
// SETTINGS
// ====================================================
function checkSetupBanner() {
  document.getElementById('setup-banner').classList.toggle('hidden', !!CONFIG.scriptUrl);
}
function loadSettings() {
  const el = document.getElementById('script-url');
  if (el && CONFIG.scriptUrl) el.value = CONFIG.scriptUrl;
}
function openSettings() { document.getElementById('settings-modal').classList.add('active'); }
function closeSettings() { document.getElementById('settings-modal').classList.remove('active'); }
function saveSettings() {
  const url = document.getElementById('script-url').value.trim();
  if (!url) { showToast('⚠️ অনুগ্রহ করে Apps Script URL দিন', 'error'); return; }
  CONFIG.scriptUrl = url;
  localStorage.setItem('mohasin_script_url', url);
  closeSettings();
  checkSetupBanner();
  showToast('✅ সেটআপ সফলভাবে সংরক্ষিত হয়েছে!', 'success');
}

// ====================================================
// FORM SUBMISSION
// ====================================================
function submitForm(event, type) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = document.getElementById('submit-' + type);
  const btnText   = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');
  const rowData   = collectFormData(type, form);

  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline';

  farmData[type].unshift({ ...rowData, _timestamp: new Date().toISOString() });
  saveToLocalStorage();
  updateDashboardStats();

  const finish = () => {
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
    form.reset();
    initDateInputs();
  };

  if (CONFIG.scriptUrl) {
    sendToGoogleSheets(type, rowData)
      .then(r => showToast(r.success ? '✅ ' + r.message : '⚠️ স্থানীয়ভাবে সংরক্ষিত। শিটে সমস্যা: ' + r.message, r.success ? 'success' : 'error'))
      .catch(() => showToast('⚠️ স্থানীয়ভাবে সংরক্ষিত। ইন্টারনেট চেক করুন।', 'error'))
      .finally(finish);
  } else {
    showToast('💾 স্থানীয়ভাবে সংরক্ষিত! Google Sheet সংযোগের জন্য সেটআপ করুন।', 'success');
    finish();
  }
}

// ====================================================
// COLLECT FORM DATA
// ====================================================
function collectFormData(type, form) {
  const fd = new FormData(form);
  const get = n => fd.get(n) || '';
  const date = get('date');
  switch (type) {
    case 'cow':
      return { date, cow_count: get('cow_count'), milk_production: get('milk_production'),
        milk_price: get('milk_price'), food_cost: get('food_cost'), medicine_cost: get('medicine_cost'),
        buy_count: get('buy_count'), buy_price: get('buy_price'), sell_count: get('sell_count'),
        sell_price: get('sell_price'), notes: get('notes'),
        income: pf(get('milk_price')) + pf(get('sell_price')),
        expense: pf(get('food_cost')) + pf(get('medicine_cost')) + pf(get('buy_price')) };
    case 'goat':
      return { date, goat_count: get('goat_count'), food_cost: get('food_cost'),
        medicine_cost: get('medicine_cost'), buy_count: get('buy_count'), buy_price: get('buy_price'),
        sell_count: get('sell_count'), sell_price: get('sell_price'), notes: get('notes'),
        income: pf(get('sell_price')),
        expense: pf(get('food_cost')) + pf(get('medicine_cost')) + pf(get('buy_price')) };
    case 'chicken':
      return { date, chicken_count: get('chicken_count'), eggs_produced: get('eggs_produced'),
        egg_price: get('egg_price'), food_cost: get('food_cost'), medicine_cost: get('medicine_cost'),
        sell_count: get('sell_count'), sell_price: get('sell_price'), notes: get('notes'),
        income: pf(get('egg_price')) + pf(get('sell_price')),
        expense: pf(get('food_cost')) + pf(get('medicine_cost')) };
    case 'fish':
      return { date, pond_name: get('pond_name'), fish_species: get('fish_species'),
        fish_quantity: get('fish_quantity'), food_medicine_cost: get('food_medicine_cost'),
        sell_quantity: get('sell_quantity'), sell_price: get('sell_price'), notes: get('notes'),
        income: pf(get('sell_price')), expense: pf(get('food_medicine_cost')) };
    case 'agriculture':
      return { date, crop_name: get('crop_name'), land_size: get('land_size'),
        seed_cost: get('seed_cost'), fertilizer_cost: get('fertilizer_cost'),
        irrigation_cost: get('irrigation_cost'), labor_cost: get('labor_cost'),
        production: get('production'), sell_price: get('sell_price'), notes: get('notes'),
        income: pf(get('sell_price')),
        expense: pf(get('seed_cost')) + pf(get('fertilizer_cost')) + pf(get('irrigation_cost')) + pf(get('labor_cost')) };
    case 'other':
      const isIncome = get('type') === 'আয়';
      return { date, type: get('type'), description: get('description'),
        amount: get('amount'), notes: get('notes'),
        income: isIncome ? pf(get('amount')) : 0,
        expense: !isIncome ? pf(get('amount')) : 0 };
    default: return {};
  }
}
function pf(v) { return parseFloat(v || 0); }

// ====================================================
// BUILD SHEET ROW
// ====================================================
function buildSheetRow(type, data) {
  switch (type) {
    case 'cow':         return [data.date,data.cow_count,data.milk_production,data.milk_price,data.food_cost,data.medicine_cost,data.buy_count,data.buy_price,data.sell_count,data.sell_price,data.notes];
    case 'goat':        return [data.date,data.goat_count,data.food_cost,data.medicine_cost,data.buy_count,data.buy_price,data.sell_count,data.sell_price,data.notes];
    case 'chicken':     return [data.date,data.chicken_count,data.eggs_produced,data.egg_price,data.food_cost,data.medicine_cost,data.sell_count,data.sell_price,data.notes];
    case 'fish':        return [data.date,data.pond_name,data.fish_species,data.fish_quantity,data.food_medicine_cost,data.sell_quantity,data.sell_price,data.notes];
    case 'agriculture': return [data.date,data.crop_name,data.land_size,data.seed_cost,data.fertilizer_cost,data.irrigation_cost,data.labor_cost,data.production,data.sell_price,data.notes];
    case 'other':       return [data.date,data.type,data.description,data.amount,data.notes];
    default: return [];
  }
}

// ====================================================
// GOOGLE SHEETS
// ====================================================
async function sendToGoogleSheets(type, data) {
  const response = await fetch(CONFIG.scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ type, data: buildSheetRow(type, data) })
  });
  return await response.json();
}

// ====================================================
// LOCAL STORAGE
// ====================================================
function saveToLocalStorage() {
  localStorage.setItem(STORE_KEY, JSON.stringify(farmData));
}

// ====================================================
// DASHBOARD STATS
// ====================================================
function updateDashboardStats() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  let totalIncome = 0, totalExpense = 0;

  Object.keys(CATEGORIES).forEach(type => {
    const el = document.getElementById('stat-' + type + '-count');
    if (el) el.textContent = farmData[type].length + ' টি এন্ট্রি';
    farmData[type].forEach(entry => {
      if (entry.date && entry.date.startsWith(thisMonth)) {
        totalIncome  += pf(entry.income);
        totalExpense += pf(entry.expense);
      }
    });
  });

  const profit = totalIncome - totalExpense;
  setEl('dash-total-income', '৳ ' + formatNum(totalIncome));
  setEl('dash-total-expense', '৳ ' + formatNum(totalExpense));
  const profitEl = document.getElementById('dash-total-profit');
  if (profitEl) {
    profitEl.textContent = (profit >= 0 ? '+' : '') + '৳ ' + formatNum(Math.abs(profit));
    profitEl.style.color = profit >= 0 ? 'var(--green-light)' : 'var(--red)';
  }
}

// ====================================================
// SUMMARY
// ====================================================
function setFilter(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = filter;
  renderSummary();
}

function renderSummary() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const thisYear  = `${now.getFullYear()}`;
  let grandIncome = 0, grandExpense = 0;
  const chartLabels = [], chartIncomes = [], chartExpenses = [];
  const breakdownData = [];

  Object.keys(CATEGORIES).forEach(type => {
    let income = 0, expense = 0, count = 0;
    farmData[type].forEach(entry => {
      let ok = true;
      if (currentFilter === 'month' && entry.date && !entry.date.startsWith(thisMonth)) ok = false;
      if (currentFilter === 'year'  && entry.date && !entry.date.startsWith(thisYear))  ok = false;
      if (ok) { income += pf(entry.income); expense += pf(entry.expense); count++; }
    });
    grandIncome  += income;
    grandExpense += expense;
    chartLabels.push(CATEGORIES[type].icon + ' ' + CATEGORIES[type].label);
    chartIncomes.push(income);
    chartExpenses.push(expense);
    breakdownData.push({ type, income, expense, count, profit: income - expense });
  });

  const grandProfit = grandIncome - grandExpense;
  setEl('summary-income',  '৳ ' + formatNum(grandIncome));
  setEl('summary-expense', '৳ ' + formatNum(grandExpense));
  const profEl = document.getElementById('summary-profit');
  if (profEl) {
    profEl.textContent = (grandProfit >= 0 ? '+' : '') + '৳ ' + formatNum(Math.abs(grandProfit));
    profEl.style.color = grandProfit >= 0 ? 'var(--green-light)' : 'var(--red)';
  }

  const tbody = document.getElementById('breakdown-body');
  if (tbody) {
    tbody.innerHTML = breakdownData.map(r => `
      <tr>
        <td>${CATEGORIES[r.type].icon} ${CATEGORIES[r.type].label}</td>
        <td>${r.count}</td>
        <td class="td-income">৳ ${formatNum(r.income)}</td>
        <td class="td-expense">৳ ${formatNum(r.expense)}</td>
        <td class="td-profit ${r.profit>=0?'td-positive':'td-negative'}">
          ${r.profit>=0?'+':''}৳ ${formatNum(Math.abs(r.profit))}
        </td>
      </tr>`).join('') + `
      <tr style="background:var(--bg-secondary);">
        <td><strong>মোট</strong></td>
        <td><strong>${breakdownData.reduce((a,b)=>a+b.count,0)}</strong></td>
        <td class="td-income"><strong>৳ ${formatNum(grandIncome)}</strong></td>
        <td class="td-expense"><strong>৳ ${formatNum(grandExpense)}</strong></td>
        <td class="td-profit ${grandProfit>=0?'td-positive':'td-negative'}">
          <strong>${grandProfit>=0?'+':''}৳ ${formatNum(Math.abs(grandProfit))}</strong>
        </td>
      </tr>`;
  }
  renderCharts(chartLabels, chartIncomes, chartExpenses, grandIncome, grandExpense);
}

function renderCharts(labels, incomes, expenses, totalIncome, totalExpense) {
  const ctx1 = document.getElementById('categoryChart');
  if (ctx1) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'আয়', data: incomes, backgroundColor: 'rgba(46,160,67,0.7)', borderColor: '#2ea043', borderWidth: 1, borderRadius: 4 },
          { label: 'ব্যয়', data: expenses, backgroundColor: 'rgba(248,81,73,0.7)', borderColor: '#f85149', borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#8b949e', font: { family: 'Hind Siliguri', size: 10 } }, grid: { color: '#30363d' } },
          y: { ticks: { color: '#8b949e', font: { family: 'Hind Siliguri' } }, grid: { color: '#30363d' } }
        },
        plugins: { legend: { labels: { color: '#8b949e', font: { family: 'Hind Siliguri', size: 11 } } } }
      }
    });
  }
  const ctx2 = document.getElementById('incomeExpenseChart');
  if (ctx2) {
    if (incomeExpenseChartInstance) incomeExpenseChartInstance.destroy();
    incomeExpenseChartInstance = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['মোট আয়', 'মোট ব্যয়'],
        datasets: [{ data: [totalIncome||0.001, totalExpense||0.001],
          backgroundColor: ['rgba(46,160,67,0.8)','rgba(248,81,73,0.8)'],
          borderColor: ['#2ea043','#f85149'], borderWidth: 2, hoverOffset: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { labels: { color: '#8b949e', font: { family: 'Hind Siliguri', size: 11 } } } } }
    });
  }
}

// ====================================================
// UTILITIES
// ====================================================
function formatNum(n) { return Math.abs(parseFloat(n)||0).toLocaleString('bn-BD'); }
function fmtMoney(v) { const n = parseFloat(v||0); return n ? '৳' + formatNum(n) : '—'; }
function setEl(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 4000);
}
