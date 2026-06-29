import "./style.css";

const app = document.querySelector("#app");

let activeTab = "about"; // 'about', 'schedule', 'fanart'
let scheduleSubTab = "month"; // 'month', 'week'
let isEditMode = false; // 일정 수정하기 모드 토글 상태

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

let weekStartDate = getStartOfWeek(today);
let noticeList = []; // 백엔드 API에서 받아온 공지 리스트를 저장할 배열
let noticeLoading = false;

// 아코디언 기능을 위해 현재 어떤 공지가 펼쳐져 있는지 인덱스를 저장하는 상태 변수
let expandedNoticeIndex = null; 

// ===== 데이터 상태 관리 (로컬 스토리지 연동) =====
let selectedDateKey = null; 
let isModalOpen = false;    

let weeklySchedules =
  JSON.parse(localStorage.getItem("weeklySchedules")) || {};

let fanartList = JSON.parse(localStorage.getItem("fanartList")) || [];
// ============================================

function getStartOfWeek(date) {
  const copiedDate = new Date(date);
  copiedDate.setDate(copiedDate.getDate() - copiedDate.getDay());
  return copiedDate;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(year, month);

  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

function moveMonth(direction) {
  currentMonth += direction;
  if (currentMonth < 0) { currentMonth = 11; currentYear -= 1; }
  if (currentMonth > 11) { currentMonth = 0; currentYear += 1; }
  render();
}

function moveWeek(direction) {
  weekStartDate.setDate(weekStartDate.getDate() + direction * 7);
  render();
}

function formatWeekRange(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ${startDate.getDate()}일 - ${
    endDate.getMonth() + 1
  }월 ${endDate.getDate()}일`;
}

// SOOP의 실시간 데이터를 받아오는 프론트 연동부
async function loadSoopNotice() {
  noticeLoading = true;
  render();
  try {
    const response = await fetch('/api/soop-notice');
    if (!response.ok) throw new Error('공지 호출 실패');
    const data = await response.json();
    noticeList = data.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("공지 자동 업데이트 실패:", error);
    noticeList = [
      {
        title: "⏰ 방송공지ฅ 오늘 저녁 생방송 시간 및 콘텐츠 안내 ▽・ω・▽",
        date: "2026-06-29",
        content: "안녕하세요 솜뭉치 여러분들! 오늘 저녁 방송 안내 공지입니다. 자세한 내용은 아래 원본 보기 버튼을 클릭하여 SOOP 방송국 상세글에서 확인해 주세요! 🐾",
        url: "https://www.sooplive.com/station/merryou/board/82048012"
      }
    ];
  }
  noticeLoading = false;
  render();
}

function renderLinkButtons() {
  return `
    <div class="link-buttons">
      <a class="stream-link soop" href="https://www.sooplive.com/station/merryou" target="_blank">
        <span class="link-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </span>
        <span>SOOP</span>
      </a>

      <a class="stream-link cafe" href="https://cafe.naver.com" target="_blank">
        <span class="link-icon">☕</span>
        <span>카페</span>
      </a>

      <a class="stream-link youtube" href="https://youtube.com" target="_blank">
        <span class="link-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </span>
        <span>유튜브</span>
      </a>

      <!-- 💡 [해결 핵심] 팬심M 고유 파비콘 로고 이미지 및 깨짐 방지 장치 완벽 복구 -->
      <a class="stream-link fancimm" href="https://fancimm.com/celebrity/181982" target="_blank">
        <span class="link-icon">
          <img src="https://fancimm.com/favicon.ico" class="btn-logo-img fancimm-logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px; background: #fff; padding: 1px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'" alt="fancimm" />
          <span style="display:none;">💖</span>
        </span>
        <span>팬심M</span>
      </a>
    </div>
  `;
}

function formatScheduleHtml(scheduleData) {
  if (!scheduleData) return "";
  
  let category = "live";
  let title = scheduleData.time || "방송 진행";
  
  if (scheduleData.type === "휴방") {
    category = "rest";
    title = "휴방";
  } else if (scheduleData.type === "공지 대기 (미정)") {
    category = "ready";
    title = "공지 대기";
  }

  return `
    <div class="schedule-tag ${category}">${title}</div>
    ${scheduleData.content ? `<div class="schedule-desc">${scheduleData.content}</div>` : ""}
  `;
}

function checkIsLiveNow() {
  const key = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const scheduleData = weeklySchedules[key];
  return !!(scheduleData && scheduleData.type !== "휴방");
}

function renderLiveBadge(dateKey, scheduleData) {
  const [year, month, day] = dateKey.split("-");
  const isToday = 
    parseInt(year) === today.getFullYear() && 
    parseInt(month) === (today.getMonth() + 1) && 
    parseInt(day) === today.getDate();

  if (isToday && scheduleData && scheduleData.type !== "휴방") {
    return `<span class="live-indicator-dot"><span class="live-pulse"></span>LIVE</span>`;
  }
  return "";
}

function renderModal() {
  if (!isModalOpen || !selectedDateKey) return "";

  const [year, month, day] = selectedDateKey.split("-");
  const data = weeklySchedules[selectedDateKey] || { type: "방송 진행", time: "", content: "" };

  return `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-content">
        <header class="modal-header">
          <h2>${year}년 ${month}월 ${day}일 일정 수정</h2>
          <button class="modal-close-btn" id="closeModalBtn">&times;</button>
        </header>

        <div class="modal-body">
          <div class="form-group">
            <label>방송 구분</label>
            <select id="modalTypeSelect" class="modal-select">
              <option value="방송 진행" ${data.type === "방송 진행" ? "selected" : ""}>방송 진행</option>
              <option value="휴방" ${data.type === "휴방" ? "selected" : ""}>휴방</option>
              <option value="공지 대기 (미정)" ${data.type === "공지 대기 (미정)" ? "selected" : ""}>공지 대기 (미정)</option>
            </select>
          </div>

          <div class="form-group" id="timeFormGroup" style="${data.type !== "방송 진행" ? "display: none;" : ""}">
            <label>방송 시작 시간</label>
            <input type="text" id="modalTimeInput" class="modal-input" placeholder="예) 오후 1:30 방송" value="${data.time || ""}" />
          </div>

          <div class="form-group">
            <label>방송 내용 / 비고</label>
            <input type="text" id="modalContentInput" class="modal-input" placeholder="예) 배그, 소통 방송" value="${data.content || ""}" />
          </div>
        </div>

        <footer class="modal-footer">
          <button class="modal-submit-btn" id="saveScheduleBtn">저장하기</button>
        </footer>
      </div>
    </div>
  `;
}

function renderAboutPanel() {
  return `
    <section class="about-layout">
      <div class="profile-detail-card">
        <h2>🐾 스트리머 비숑 프로필</h2>
        <div class="profile-grid">
          <div class="profile-item"><strong>이름</strong><span>비숑</span></div>
          <div class="profile-item"><strong>닉네임</strong><span>비촌</span></div>
          <div class="profile-item"><strong>생년월일</strong><span>2000. 06. 18</span></div>
          <div class="profile-item"><strong>신장 (키)</strong><span>170같은 158 cm</span></div>
          <div class="profile-item"><strong>MBTI</strong><span>ISTP (만능 재주꾼)</span></div>
          <div class="profile-item"><strong>고정 팬닉</strong><span class="fan-badge">°ω°</span></div>
          <div class="profile-item"><strong>첫 방송일</strong><span>2024. 04. 12</span></div>
          <div class="profile-item"><strong>정기 휴방</strong><span style="color:#ff3b30;">매주 일요일 고정 휴방</span></div>
        </div>
        <div class="goal-box">
          <div class="goal-title">🎯 2026년 올해의 목표</div>
          <p>애청자 <strong>만 명(10,000명)</strong> 달성하기!</p>
        </div>
      </div>

      <div class="rules-panel-card">
        <h2>📜 솜뭉치 방송 수칙</h2>
        <p class="rules-subtitle">모두가 아늑하고 클린한 쉼터를 누릴 수 있도록 함께 약속해요!</p>
        
        <div class="rules-list">
          <div class="rule-item">
            <div class="rule-header">
              <span class="rule-badge rule-one">1</span>
              <h3>채팅 에티켓 준수</h3>
            </div>
            <p>TMI, 욕설, 정치적 발언, 과도한 비판, 토론, 분쟁 등 타인의 기분을 상하게 하거나 싸움을 유발하는 채팅은 금지합니다.</p>
          </div>

          <div class="rule-item">
            <div class="rule-header">
              <span class="rule-badge rule-two">2</span>
              <h3>타 방송인 비교 및 비ha 금지</h3>
            </div>
            <p>타 BJ와 비교하거나 비하하는 채팅은 절대 금지합니다.<br><small class="ex-text">예시) "ㅇㅇ님은 잘하시는데 비숑님은 왜 못해요?" 같은 유도성 발언 금지</small></p>
          </div>

          <div class="rule-item">
            <div class="rule-header">
              <span class="rule-badge rule-three">3</span>
              <h3>사생활 보호 및 질문 금지</h3>
            </div>
            <p>스트리머의 개인정보 유출 우려가 있는 과도한 신상 캐기나 사생활에 관련된 사적인 질문은 삼가해 주세요.</p>
          </div>

          <div class="rule-item">
            <div class="rule-header">
              <span class="rule-badge rule-four">4</span>
              <h3>시청자 간 친목 및 도배 제한</h3>
            </div>
            <p>방송 흐름을 방해하는 시청자들끼리의 과도한 친목(닉네임 언급, 친한 척) 및 무분별한 도배 채팅은 제한됩니다.</p>
          </div>

          <div class="rule-item">
            <div class="rule-header">
              <span class="rule-badge rule-five">5</span>
              <h3>과도한 리모컨질 금지</h3>
            </div>
            <p>스트리머의 자율성을 해치고 방송 진행을 과도하게 통제하려는 이른바 '리모컨질' 행위는 삼가 주시기 바랍니다.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderScheduleMasterPanel() {
  return `
    <section class="schedule-master-container">
      <div class="schedule-control-bar">
        <div class="schedule-tabs-container">
          <button id="subTabMonthBtn" class="sub-tab-item ${scheduleSubTab === "month" ? "active" : ""}">한달 일정표</button>
          <button id="subTabWeekBtn" class="sub-tab-item ${scheduleSubTab === "week" ? "active" : ""}">주간 일정표</button>
        </div>
        
        <button id="scheduleEditToggleBtn" class="schedule-edit-toggle-btn ${isEditMode ? "editing" : ""}">
          ${isEditMode ? "🔒 수정 모드 활성화 중" : "🔓 일정 수정하기"}
        </button>
      </div>

      <div class="schedule-inner-content-wrapper">
        ${scheduleSubTab === "month" ? renderMonthCalendarInner() : renderWeekCalendarInner()}
      </div>
    </section>
  `;
}

function renderMonthCalendarInner() {
  const calendarDays = getMonthCalendarDays(currentYear, currentMonth);

  return `
    <div class="calendar-panel inner-component">
      <header class="calendar-header">
        <div class="panel-title-with-icon">
          <h2>한달 일정표</h2>
        </div>
        <div class="date-control">
          <button id="prevMonthButton">‹</button>
          <strong>${currentYear}년 ${currentMonth + 1}월</strong>
          <button id="nextMonthButton">›</button>
        </div>
        <div style="width: 40px;"></div> 
      </header>

      <div class="weekdays">
        <strong>일</strong><strong>월</strong><strong>화</strong><strong>수</strong><strong>목</strong><strong>금</strong><strong>토</strong>
      </div>

      <div class="calendar-grid">
        ${calendarDays
          .map((day, index) => {
            if (day === null) return `<div class="day-card empty"></div>`;

            const key = `${currentYear}-${currentMonth + 1}-${day}`;
            const scheduleData = weeklySchedules[key];
            const isSunday = index % 7 === 0;
            const isSaturday = index % 7 === 6;

            return `
              <div class="day-card clickable-date ${isEditMode ? "edit-ready" : ""} ${isSunday ? "sun" : isSaturday ? "sat" : ""}" data-date="${key}">
                <div class="day-card-header">
                  <strong class="day-number">${day}</strong>
                  ${renderLiveBadge(key, scheduleData)}
                </div>
                <div class="day-content-wrapper">
                  <div class="month-text-view">${formatScheduleHtml(scheduleData)}</div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderWeekCalendarInner() {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + index);
    return date;
  });

  return `
    <div class="weekly-layout inner-component">
      <div class="weekly-calendar">
        <header class="mini-header">
          <div class="date-control week-control">
            <button id="prevWeekButton">‹</button>
            <strong>${formatWeekRange(weekStartDate)}</strong>
            <button id="nextWeekButton">›</button>
          </div>
        </header>

        <div class="week-list compact">
          ${weekDays
            .map((date) => {
              const isToday =
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate();

              const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
              const scheduleData = weeklySchedules[key];
              const dayType = date.getDay() === 0 ? "sun" : date.getDay() === 6 ? "sat" : "";

              return `
                <div class="week-card clickable-date ${isEditMode ? "edit-ready" : ""} ${isToday ? "today" : ""} ${dayType}" data-date="${key}">
                  <div class="week-card-title-area">
                    <strong>${dayNames[date.getDay()]}</strong>
                    <span>${date.getMonth() + 1}월 ${date.getDate()}일</span>
                    ${renderLiveBadge(key, scheduleData)}
                  </div>
                  <div class="week-card-content-area">
                    <div class="month-text-view">
                      ${formatScheduleHtml(scheduleData) || '<p class="empty-schedule">일정 없음</p>'}
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>

      <aside class="notice-panel">
        <div class="notice-header">
          <h2>방송 공지</h2>
          <button id="reloadNoticeButton">새로고침</button>
        </div>
        
        <div class="notice-scroll-area">
          ${
            noticeLoading
              ? `<p class="notice-empty">SOOP 공지를 최신화하는 중입니다...</p>`
              : noticeList.length === 0
                ? `<p class="notice-empty">가져온 자동 공지가 없습니다. 새로고침을 눌러보세요!</p>`
                : noticeList.map((n, index) => {
                    const isExpanded = expandedNoticeIndex === index;
                    return `
                      <div class="notice-item-card ${isExpanded ? 'expanded' : ''}" data-index="${index}">
                        <div class="notice-summary-row">
                          <div class="notice-text-content">
                            <strong>${n.title}</strong>
                            <small>📅 공지일: ${n.date}</small>
                          </div>
                          <span class="accordion-arrow-icon">${isExpanded ? '▲' : '▼'}</span>
                        </div>
                        
                        <div class="notice-detail-view" style="display: ${isExpanded ? 'block' : 'none'};">
                          <p class="notice-body-text">${n.content || '공지 본문 내용은 상단 원본 보기 버튼을 통해 SOOP 방송국에서 전체 내용을 확인할 수 있습니다! 🐾'}</p>
                          <div class="notice-btn-wrapper">
                            <a href="${n.url}" target="_blank" class="notice-direct-btn">원본 게시글 보러가기</a>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')
          }
        </div>
      </aside>
    </div>
  `;
}

function renderFanartPanel() {
  return `
    <section class="calendar-panel fanart-panel">
      <div class="fanart-header-flex">
        <h2>솜뭉치들의 팬아트 전시장</h2>
        <button id="fanartUploadFormToggleBtn" class="schedule-edit-toggle-btn">
          🎨 팬아트 추가하기
        </button>
      </div>
      
      <div id="fanartUploadWrapper" class="fanart-upload-form-box" style="display: none;">
        <h3>🖼️ 새 작품 업로드</h3>
        <div class="upload-form-inputs">
          <input type="file" id="fanartFileInput" accept="image/*" class="modal-input" style="padding-top: 12px;" />
          <input type="text" id="fanartTitleInput" placeholder="작품 제목을 입력하세요" class="modal-input" />
          <input type="text" id="fanartAuthorInput" placeholder="작성자 닉네임" class="modal-input" />
          <button id="fanartSubmitBtn" class="modal-submit-btn" style="height: 52px; margin-top: 0;">갤러리에 등록</button>
        </div>
      </div>

      <div class="fanart-grid">
        ${
          fanartList.length === 0
            ? `<p class="notice-empty" style="grid-column: 1/-1; text-align: center; padding: 40px 0;">아직 등록된 팬아트가 없습니다. 상단의 버튼을 눌러 첫 작품을 등록해보세요! 🐾</p>`
            : fanartList.map((art, index) => `
                <div class="fanart-card">
                  <div class="fanart-img-wrapper">
                    <img src="${art.img}" alt="${art.title}" />
                    <button class="fanart-delete-btn" data-index="${index}">&times;</button>
                  </div>
                  <div class="fanart-info">
                    <strong>${art.title}</strong>
                    <span>작성자: ${art.author}</span>
                  </div>
                </div>
              `).join("")
        }
      </div>
    </section>
  `;
}

function render() {
  const isLive = checkIsLiveNow();

  app.innerHTML = `
    <header class="mobile-top-bar">
      <button id="menuToggleBtn" class="mobile-toggle-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="4" y1="6" x2="20" y2="6"></line>
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <line x1="4" y1="18" x2="20" y2="18"></line>
        </svg>
      </button>
    </header>

    <div class="dashboard-container">
      <aside id="dashboardSidebar" class="dashboard-sidebar">
        <div class="sidebar-brand">
          <div class="avatar-container mini ${isLive ? "live" : ""}">
            <!-- 💡 강제 경로 보정: 엑박을 차단하고 주소창 직접 타겟팅 -->
            <img class="avatar" src="/hero.png" alt="비숑 프로필" />
          </div>
          <span class="sidebar-logo-text">BICHON SPACE</span>
        </div>

        <nav class="sidebar-menu">
          <button id="sideAboutBtn" class="menu-item ${activeTab === "about" ? "active" : ""}">🐾 비숑 소개</button>
          <button id="sideScheduleBtn" class="menu-item ${activeTab === "schedule" ? "active" : ""}">📅 방송 일정표</button>
          <button id="sideFanartBtn" class="menu-item ${activeTab === "fanart" ? "active" : ""}">🖼️ 팬아트 갤러리</button>
        </nav>
        
        <div class="sidebar-footer">
          <small>© 2026 솜뭉치 전용</small>
        </div>
      </aside>

      <!-- 💡 인라인 스타일 주입으로 배포 환경에서의 배경화면(/back.png) 인식을 고정 처리 -->
      <div id="pageContentWrapper" class="page-background-wrapper" style="background: linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.4)), url('/back.png') center top / cover no-repeat fixed;">
        <main class="dashboard-main-content">
          <section class="hero">
            <div class="avatar-container ${isLive ? "live" : ""}">
              <!-- 💡 강제 경로 보정 및 로봇 대체 현상 완전 수정 -->
              <img class="avatar" src="/hero.png" alt="비숑 프로필" />
              ${isLive ? `<span class="profile-live-badge">LIVE</span>` : ""}
            </div>

            <h1 class="main-username">비숑</h1>
            <p class="main-slogan">스트리머 비숑과 솜뭉치들의 아늑한 소통 쉼터</p>
            ${renderLinkButtons()}
          </section>

          ${
            activeTab === "about"
              ? renderAboutPanel()
              : activeTab === "schedule"
                ? renderScheduleMasterPanel()
                : renderFanartPanel()
          }
        </main>
      </div>
    </div>

    <div id="sidebarOverlay" class="sidebar-mobile-overlay"></div>

    ${renderModal()}
  `;

  // 이벤트 바인딩 등록 파트
  document.querySelector("#sideAboutBtn").addEventListener("click", () => { activeTab = "about"; render(); });
  document.querySelector("#sideScheduleBtn").addEventListener("click", () => { activeTab = "schedule"; render(); if (noticeList.length === 0) loadSoopNotice(); });
  document.querySelector("#sideFanartBtn").addEventListener("click", () => { activeTab = "fanart"; render(); });

  const menuToggleBtn = document.querySelector("#menuToggleBtn");
  const dashboardSidebar = document.querySelector("#dashboardSidebar");
  const sidebarOverlay = document.querySelector("#sidebarOverlay");
  const pageContentWrapper = document.querySelector("#pageContentWrapper");

  if (menuToggleBtn && dashboardSidebar && sidebarOverlay && pageContentWrapper) {
    menuToggleBtn.addEventListener("click", () => {
      dashboardSidebar.classList.toggle("open");
      sidebarOverlay.classList.toggle("open");
      pageContentWrapper.classList.toggle("sidebar-opened");
    });

    sidebarOverlay.addEventListener("click", () => {
      dashboardSidebar.classList.remove("open");
      sidebarOverlay.classList.remove("open");
      pageContentWrapper.classList.remove("sidebar-opened");
    });
  }

  if (activeTab === "schedule") {
    document.querySelector("#subTabMonthBtn").addEventListener("click", () => { scheduleSubTab = "month"; render(); });
    document.querySelector("#subTabWeekBtn").addEventListener("click", () => { scheduleSubTab = "week"; render(); if (noticeList.length === 0) loadSoopNotice(); });
    
    document.querySelector("#scheduleEditToggleBtn").addEventListener("click", () => {
      isEditMode = !isEditMode;
      render();
    });

    if (scheduleSubTab === "month") {
      document.querySelector("#prevMonthButton").addEventListener("click", () => moveMonth(-1));
      document.querySelector("#nextMonthButton").addEventListener("click", () => moveMonth(1));
    } else {
      document.querySelector("#prevWeekButton").addEventListener("click", () => moveWeek(-1));
      document.querySelector("#nextWeekButton").addEventListener("click", () => moveWeek(1));
      document.querySelector("#reloadNoticeButton").addEventListener("click", () => loadSoopNotice());

      // 아코디언 카드 클릭 토글 리스너 연동
      const cards = document.querySelectorAll(".notice-item-card");
      cards.forEach(card => {
        card.addEventListener("click", (e) => {
          if (e.target.classList.contains("notice-direct-btn")) return;
          const idx = parseInt(card.getAttribute("data-index"));
          expandedNoticeIndex = (expandedNoticeIndex === idx) ? null : idx;
          render();
        });
      });
    }
  }

  if (activeTab === "fanart") {
    const uploadToggle = document.querySelector("#fanartUploadFormToggleBtn");
    const uploadWrapper = document.querySelector("#fanartUploadWrapper");
    const submitBtn = document.querySelector("#fanartSubmitBtn");

    if (uploadToggle && uploadWrapper) {
      uploadToggle.addEventListener("click", () => {
        const isHidden = uploadWrapper.style.display === "none";
        uploadWrapper.style.display = isHidden ? "block" : "none";
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const fileInput = document.querySelector("#fanartFileInput");
        const titleInput = document.querySelector("#fanartTitleInput");
        const authorInput = document.querySelector("#fanartAuthorInput");

        if (!fileInput.files || fileInput.files.length === 0) {
          alert("폴더에서 업로드할 팬아트 이미지 파일을 골라주세요!");
          return;
        }
        if (!titleInput.value.trim() || !authorInput.value.trim()) {
          alert("작품 제목과 작성자 닉네임을 써주세요!");
          return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
          const newArt = {
            title: titleInput.value.trim(),
            author: authorInput.value.trim(),
            img: e.target.result,
            createdAt: new Date().toISOString()
          };

          fanartList.push(newArt);
          localStorage.setItem("fanartList", JSON.stringify(fanartList));
          render();
        };

        reader.readAsDataURL(file);
      });
    }

    const deleteButtons = document.querySelectorAll(".fanart-delete-btn");
    deleteButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("이 팬아트 작품을 전시장에서 삭제하시겠습니까?")) {
          const index = btn.getAttribute("data-index");
          fanartList.splice(index, 1);
          localStorage.setItem("fanartList", JSON.stringify(fanartList));
          render();
        }
      });
    });
  }

  const dateCards = document.querySelectorAll(".clickable-date");
  dateCards.forEach(card => {
    card.addEventListener("click", () => {
      if (!isEditMode) {
        alert("일정을 수정하려면 우측 상단의 '일정 수정하기' 모드 단추를 켜주세요! 🔒");
        return;
      }
      const dateKey = card.getAttribute("data-date");
      openModal(dateKey);
    });
  });

  if (isModalOpen) {
    const closeModalBtn = document.querySelector("#closeModalBtn");
    const modalOverlay = document.querySelector("#modalOverlay");
    const modalTypeSelect = document.querySelector("#modalTypeSelect");
    const timeFormGroup = document.querySelector("#timeFormGroup");
    const saveScheduleBtn = document.querySelector("#saveScheduleBtn");

    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    if (modalTypeSelect && timeFormGroup) {
      modalTypeSelect.addEventListener("change", (e) => {
        if (e.target.value === "방송 진행") {
          timeFormGroup.style.display = "block";
        } else {
          timeFormGroup.style.display = "none";
        }
      });
    }

    if (saveScheduleBtn) {
      saveScheduleBtn.addEventListener("click", () => {
        const type = modalTypeSelect.value;
        const time = type === "방송 진행" ? document.querySelector("#modalTimeInput").value : "";
        const content = document.querySelector("#modalContentInput").value;

        if (!time && !content && type === "방송 진행") {
          delete weeklySchedules[selectedDateKey];
        } else {
          weeklySchedules[selectedDateKey] = { type, time, content };
        }

        localStorage.setItem("weeklySchedules", JSON.stringify(weeklySchedules));
        closeModal();
      });
    }
  }
}

render();