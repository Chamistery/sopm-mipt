/* ═══ СУПП ВШПИ — Общие данные и функции ═══ */

// ─── Роли и навигация между страницами ───
const ROLE_PAGES = {
  student: 'student.html',
  student_assigned: 'student_assigned.html',
  teamlead: 'teamlead.html',
  teamlead_assigned: 'teamlead_assigned.html',
  mentor: 'mentor.html',
  admin: 'admin.html'
};

function switchRole(value) {
  const page = ROLE_PAGES[value];
  if (page && !window.location.href.endsWith(page)) {
    window.location.href = page;
  }
}

// ─── Данные проектов ───
const projects = [
  {id:1,company:"МФТИ",title:"Система управления проектным практикумом ВШПИ",mentor:"Тимохин В.Н.",mentorRole:"Профессор ВШПИ",email:"timokhin@mipt.ru",tg:"@timokhin",desc:"Разработка веб-приложения для управления проектным практикумом: личные кабинеты, управление проектами, спринтами и отчётностью.",fullDesc:"Система предоставляет возможности по управлению ресурсами: пользователи, проекты (включая детализацию: заявка, спринты, задачи), отчёты. Система ориентирована на реализацию функционала ролей: администратор, координатор, ментор, участник команды, эксперт.",tags:["Python","Django","PostgreSQL","REST API"],teamSize:"3–5",teams:2,applied:12,eduResult:"Командная разработка, управление проектами, веб-разработка, базы данных."},
  {id:2,company:"Яндекс",title:"Платформа автоматизации тестирования ПО",mentor:"Смирнов А.К.",mentorRole:"Тимлид QA, Яндекс",email:"smirnov@yandex.ru",tg:"@smirnov_qa",desc:"Платформа для автоматизации регрессионного тестирования веб-сервисов с генерацией отчётов.",fullDesc:"Платформа позволяет описывать тест-сценарии в YAML, запускать по расписанию или вручную, собирать метрики покрытия и генерировать отчёты.",tags:["Python","FastAPI","Selenium","Docker","CI/CD"],teamSize:"4–5",teams:1,applied:18,eduResult:"Автоматизация тестирования, CI/CD, работа с контейнерами, проектирование API."},
  {id:3,company:"Т-Банк",title:"Мобильное приложение расписания МФТИ",mentor:"Козлова Е.В.",mentorRole:"iOS-разработчик, Т-Банк",email:"kozlova@tbank.ru",tg:"@kozlova_dev",desc:"Кроссплатформенное мобильное приложение с расписанием, уведомлениями и интеграцией с LMS.",fullDesc:"Приложение предоставляет актуальное расписание, push-уведомления об изменениях, интеграцию с LMS для просмотра оценок и дедлайнов.",tags:["React Native","TypeScript","Node.js","Firebase"],teamSize:"3–4",teams:1,applied:15,eduResult:"Мобильная разработка, кроссплатформенные технологии, работа с API."},
  {id:4,company:"МФТИ",title:"Рекомендательная система подбора элективных курсов",mentor:"Петров Д.М.",mentorRole:"Доцент ВШПИ",email:"petrov@mipt.ru",tg:"@petrov_ml",desc:"ML-система для персонализированных рекомендаций элективов на основе профиля студента.",fullDesc:"Система анализирует академический профиль, оценки, выбранные ранее курсы и интересы для формирования персонализированного рейтинга элективов.",tags:["Python","scikit-learn","Pandas","FastAPI","React"],teamSize:"3–5",teams:2,applied:9,eduResult:"Машинное обучение, анализ данных, рекомендательные системы."},
  {id:5,company:"МФТИ",title:"Сервис статического анализа студенческого кода",mentor:"Тимохин В.Н.",mentorRole:"Профессор ВШПИ",email:"timokhin@mipt.ru",tg:"@timokhin",desc:"Инструмент для автоматической проверки качества кода с интеграцией в GitLab CI/CD.",fullDesc:"Сервис интегрируется в GitLab, анализирует Python-код на соответствие стандартам, выявляет ошибки и формирует отчёт.",tags:["Python","AST","GitLab API","Docker"],teamSize:"3–4",teams:1,applied:6,eduResult:"Статический анализ, AST, DevOps, интеграция с GitLab."},
  {id:6,company:"VK",title:"Чат-бот для поддержки студентов",mentor:"Иванова О.С.",mentorRole:"Продакт-менеджер, VK",email:"ivanova@vk.com",tg:"@ivanova_pm",desc:"Telegram-бот с NLP для ответов на вопросы студентов о расписании и дедлайнах.",fullDesc:"Бот обрабатывает естественный язык, классифицирует вопросы и предоставляет ответы из базы знаний с эскалацией на оператора.",tags:["Python","aiogram","NLP","PostgreSQL"],teamSize:"3–4",teams:1,applied:14,eduResult:"NLP, разработка ботов, проектирование диалоговых систем."},
  {id:7,company:"Сбер",title:"Дашборд аналитики учебного процесса",mentor:"Фёдоров И.А.",mentorRole:"Data Engineer, Сбер",email:"fedorov@sber.ru",tg:"@fedorov_de",desc:"Интерактивный дашборд для визуализации метрик учебного процесса.",fullDesc:"Система собирает данные из LMS, расписания, БРС, обрабатывает и визуализирует на интерактивных дашбордах для администрации.",tags:["Python","Airflow","ClickHouse","Grafana","React"],teamSize:"4–5",teams:1,applied:11,eduResult:"Data Engineering, ETL-пайплайны, визуализация данных."},
  {id:8,company:"МФТИ",title:"Платформа для проведения код-ревью",mentor:"Белов С.А.",mentorRole:"Ст. преподаватель ВШПИ",email:"belov@mipt.ru",tg:"@belov_cr",desc:"Веб-платформа для peer code review между студентами с оценками и обратной связью.",fullDesc:"Интегрируется с GitLab, позволяет назначать ревьюеров, предоставляет inline-комментарии и чеклисты для оценки кода.",tags:["Python","Django","GitLab API","React","WebSocket"],teamSize:"3–5",teams:1,applied:8,eduResult:"Code review, Git, веб-разработка full-stack, WebSocket."}
];

// ─── Команда и задачи ───
const teamMembers = [
  {name:'Стародубов А.',initials:'АС',color:'var(--accent)',role:'Backend-разработчик',leader:true},
  {name:'Кузнецов М.',initials:'КМ',color:'var(--success)',role:'Frontend-разработчик',leader:false},
  {name:'Лебедева Н.',initials:'ЛН',color:'var(--warning)',role:'Аналитик',leader:false},
  {name:'Волков Д.',initials:'ВД',color:'var(--purple)',role:'Тестировщик',leader:false},
];

const SPRINT2_START = new Date(2025, 2, 17);
const SPRINT2_DAYS = 28;
const TODAY = new Date();

const sTasks = [
  {sprint:2,person:"Стародубов А.",name:"API управления проектами",status:"done",priority:"high",hours:12,start:0,dur:7,mr:"!42"},
  {sprint:2,person:"Стародубов А.",name:"Интеграция с OAuth МФТИ",status:"review",priority:"medium",hours:8,start:7,dur:6,mr:"!45"},
  {sprint:2,person:"Стародубов А.",name:"Ролевая модель (backend)",status:"progress",priority:"high",hours:16,start:13,dur:10,mr:null},
  {sprint:2,person:"Стародубов А.",name:"Миграции БД v2",status:"new",priority:"medium",hours:6,start:23,dur:5,mr:null},
  {sprint:2,person:"Кузнецов М.",name:"Макет дашборда ментора",status:"done",priority:"high",hours:14,start:0,dur:10,mr:"!46"},
  {sprint:2,person:"Кузнецов М.",name:"Компонент формы заявки",status:"progress",priority:"medium",hours:10,start:10,dur:9,mr:null},
  {sprint:2,person:"Кузнецов М.",name:"Страница команды (UI)",status:"new",priority:"high",hours:12,start:19,dur:9,mr:null},
  {sprint:2,person:"Лебедева Н.",name:"Спецификация API (Swagger)",status:"done",priority:"medium",hours:8,start:0,dur:8,mr:null},
  {sprint:2,person:"Лебедева Н.",name:"Сценарии использования v2",status:"review",priority:"low",hours:6,start:8,dur:7,mr:null},
  {sprint:2,person:"Лебедева Н.",name:"Документация ролевой модели",status:"progress",priority:"medium",hours:8,start:15,dur:8,mr:null},
  {sprint:2,person:"Волков Д.",name:"Unit-тесты для Auth",status:"done",priority:"medium",hours:8,start:0,dur:7,mr:"!43"},
  {sprint:2,person:"Волков Д.",name:"Тест-план для Sprint 2",status:"done",priority:"low",hours:6,start:7,dur:6,mr:null},
  {sprint:2,person:"Волков Д.",name:"Настройка CI/CD",status:"progress",priority:"high",hours:10,start:13,dur:8,mr:null},
  {sprint:2,person:"Волков Д.",name:"Интеграционные тесты API",status:"new",priority:"high",hours:8,start:21,dur:7,mr:null},
  {sprint:1,person:"Стародубов А.",name:"Структура проекта Django",status:"done",priority:"high",hours:8,start:0,dur:8,mr:"!1"},
  {sprint:1,person:"Стародубов А.",name:"Доменные модели",status:"done",priority:"high",hours:12,start:8,dur:10,mr:"!5"},
  {sprint:1,person:"Кузнецов М.",name:"Прототип UI (Figma)",status:"done",priority:"medium",hours:10,start:0,dur:14,mr:null},
  {sprint:1,person:"Лебедева Н.",name:"Анализ требований",status:"done",priority:"high",hours:10,start:0,dur:10,mr:null},
  {sprint:1,person:"Волков Д.",name:"Docker Compose окружение",status:"done",priority:"medium",hours:6,start:0,dur:7,mr:"!3"},
];

const sAvatarColors = {"Стародубов А.":"var(--accent)","Кузнецов М.":"var(--success)","Лебедева Н.":"var(--warning)","Волков Д.":"var(--purple)"};

// ─── Общие утилиты ───
function addLink() {
  const list = document.getElementById('links-list');
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = '<select class="link-type"><option>GitHub</option><option>GitLab</option><option>Портфолио</option><option>Другое</option></select><input class="profile-input" placeholder="https://..." style="flex:1"><button class="link-remove" onclick="this.parentElement.remove()">✕</button>';
  list.appendChild(row);
  row.querySelector('input').focus();
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
  const nav = document.querySelector('[data-nav="' + id + '"]');
  if (nav) nav.classList.add('active');
  window.scrollTo(0, 0);
}

// ─── SVG иконки (переиспользуемые) ───
const SVG_PERSON = '<svg width="14" height="14" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M2 15c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.2"/></svg>';
const SVG_PLUS = '<svg width="14" height="14" fill="none" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

// ─── Sidebar HTML generator ───
function roleSwitcherHtml(currentRole) {
  const roles = [
    {value:'student', label:'Студент'},
    {value:'student_assigned', label:'Студент (распределён)'},
    {value:'teamlead', label:'Тимлид'},
    {value:'teamlead_assigned', label:'Тимлид (распределён)'},
    {value:'mentor', label:'Ментор'},
    {value:'admin', label:'Администратор'}
  ];
  return roles.map(r =>
    '<option value="' + r.value + '"' + (r.value === currentRole ? ' selected' : '') + '>' + r.label + '</option>'
  ).join('');
}

// ─── Gantt builder ───
function calcTaskStatus(task) {
  if (task.status === 'review' || task.status === 'done') return task.status;
  const taskEndDate = new Date(SPRINT2_START);
  taskEndDate.setDate(taskEndDate.getDate() + task.start + task.dur);
  const taskStartDate = new Date(SPRINT2_START);
  taskStartDate.setDate(taskStartDate.getDate() + task.start);
  if (TODAY >= taskEndDate) return 'overdue';
  if (TODAY < taskStartDate) return 'new';
  return task.status === 'new' ? 'progress' : task.status;
}

function buildGantt(containerId, currentUser, options) {
  options = options || {};
  const canEdit = options.canEdit || false;
  const canEditAll = options.canEditAll || false;
  const container = document.getElementById(containerId);
  if (!container) return;

  const today = new Date();
  const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const MIN_PX = 28;
  const sprintConfigs = [
    {num:2, label:'Спринт 2 (текущий)', start:new Date(2025,2,17), days:28},
    {num:1, label:'Спринт 1 (завершён)', start:new Date(2025,1,24), days:21},
  ];
  const dsMap = {new:'Новая', progress:'В работе', review:'Ревью', done:'Готово', overdue:'Истекла'};
  const dsClass = {new:'status-new', progress:'status-progress', review:'status-review', done:'status-done', overdue:'status-overdue'};
  const dsBar = {new:'status-bar-new', progress:'status-bar-progress', review:'status-bar-review', done:'status-bar-done', overdue:'status-bar-overdue'};

  function fmtR(s, d) {
    const e = new Date(s); e.setDate(e.getDate() + d - 1);
    return s.getDate() + ' ' + months[s.getMonth()] + ' — ' + e.getDate() + ' ' + months[e.getMonth()];
  }
  function makeH(ss, sd) {
    let h = ''; let pm = -1;
    for (let d = 0; d < sd; d++) {
      const dt = new Date(ss); dt.setDate(dt.getDate() + d);
      const t = dt.toDateString() === today.toDateString();
      const dn = dt.getDate();
      const w = dt.getDay() === 0 || dt.getDay() === 6;
      const sm = dt.getMonth() !== pm; pm = dt.getMonth();
      const l = sm ? dn + ' ' + months[dt.getMonth()] : dn;
      h += '<div class="gantt-timeline-day' + (t ? ' today' : '') + '" style="flex:1;min-width:' + MIN_PX + 'px;' + (w ? 'opacity:0.5;' : '') + '">' + l + '</div>';
    }
    return h;
  }

  let html = '';
  for (const sp of sprintConfigs) {
    const st = sTasks.filter(t => t.sprint === sp.num);
    if (!st.length) continue;
    const persons = [...new Set(st.map(t => t.person))];
    const minBW = sp.days * MIN_PX;
    html += '<div class="gantt-sprint-block">';
    const addBtnHtml = (canEdit && sp.num === 2) ? '<button onclick="openTaskModal(-1)" style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:5px 14px;border:none;border-radius:6px;background:var(--primary);color:#fff;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer"><svg width="12" height="12" fill="none" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Добавить задачу</button>' : '';
    html += '<div class="gantt-sprint-label" style="display:flex;align-items:center">' + sp.label + ' \u00b7 ' + fmtR(sp.start, sp.days) + ' \u00b7 ' + sp.days + ' дн.' + addBtnHtml + '</div>';
    html += '<div class="gantt-sprint-scroll">';
    html += '<table class="gantt-table" style="min-width:' + (345 + minBW) + 'px">';
    html += '<thead><tr><th class="col-task">Задача</th><th class="col-status">Статус</th><th class="col-hours">Ч.</th><th class="col-bars"><div class="gantt-timeline-header">' + makeH(sp.start, sp.days) + '</div></th></tr></thead><tbody>';
    for (const person of persons) {
      const pt = st.filter(t => t.person === person);
      const isYou = person === currentUser;
      const youBadge = isYou ? ' <span style="font-size:10px;font-weight:700;color:var(--success);background:var(--success-bg);padding:0 5px;border-radius:3px;margin-left:4px">Вы</span>' : '';
      html += '<tr class="gantt-person-row"><td class="col-task"><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:' + (sAvatarColors[person] || 'var(--border)') + '"></span>' + person + youBadge + '</span></td><td class="col-status"></td><td class="col-hours"></td><td class="col-bars"></td></tr>';
      for (const task of pt) {
        const ds = sp.num === 2 ? calcTaskStatus(task) : task.status;
        const globalIdx = sTasks.indexOf(task);
        const isOwn = (isYou || canEditAll) && sp.num === 2 && canEdit;
        const left = (task.start / sp.days * 100).toFixed(1);
        const width = (task.dur / sp.days * 100).toFixed(1);

        // All tasks clickable: own => editable modal, others => readonly modal
        const rowClick = isOwn
          ? ' onclick="openTaskModal(' + globalIdx + ')" style="cursor:pointer"'
          : ' onclick="showTaskDetail(' + globalIdx + ')" style="cursor:pointer"';

        const iconSlot = isOwn
          ? '<svg class="edit-icon" width="12" height="12" fill="none" viewBox="0 0 16 16" style="flex-shrink:0;width:14px"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.3"/></svg>'
          : '<span style="display:inline-block;width:14px;flex-shrink:0"></span>';

        html += '<tr class="gantt-task-row"' + rowClick + '>';
        html += '<td class="col-task"><div class="task-name">' + iconSlot;
        html += '<span class="task-name-text">' + task.name + '</span>';
        html += '</div></td>';
        html += '<td class="col-status"><span class="status-pill ' + dsClass[ds] + '">' + dsMap[ds] + '</span></td>';
        html += '<td class="col-hours hours-cell">' + task.hours + 'ч</td>';
        html += '<td class="col-bars"><div class="gantt-bars-cell"><div class="gantt-bar ' + dsBar[ds] + '" style="left:' + left + '%;width:' + width + '%"></div></div></td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table></div>';
    html += '<div class="gantt-custom-scrollbar"><div class="thumb"></div></div>';
    html += '</div>';
  }
  container.innerHTML = html;
  initScrollbars(containerId);
}

// ─── Readonly task detail popup ───
function showTaskDetail(idx) {
  const t = sTasks[idx];
  if (!t) return;
  const sprintStart = t.sprint === 2 ? SPRINT2_START : new Date(2025,1,24);
  const sd = new Date(sprintStart); sd.setDate(sd.getDate() + t.start);
  const ed = new Date(sd); ed.setDate(ed.getDate() + t.dur - 1);
  const mons = ['янв','фев','мар','апр','мая','июн'];
  const dateStr = sd.getDate() + ' ' + mons[sd.getMonth()] + ' — ' + ed.getDate() + ' ' + mons[ed.getMonth()];
  const ds = t.sprint === 2 ? calcTaskStatus(t) : t.status;
  const dsLabels = {new:'Новая', progress:'В работе', review:'Ревью', done:'Готово', overdue:'Истекла'};
  const dsBg = {new:'var(--surface-alt)', progress:'#e8eef6', review:'var(--purple-bg)', done:'var(--success-bg)', overdue:'var(--danger-bg)'};
  const dsClr = {new:'var(--text-muted)', progress:'var(--accent)', review:'var(--purple)', done:'var(--success)', overdue:'var(--danger)'};
  const member = teamMembers.find(m => m.name === t.person);
  const avatarColor = member ? member.color : 'var(--border)';
  const initials = member ? member.initials : '??';

  let overlay = document.getElementById('task-detail-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'task-detail-overlay';
    overlay.className = 'task-detail-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.classList.remove('open'); };
    overlay.innerHTML = '<div class="task-detail-card" id="task-detail-content" onclick="event.stopPropagation()"></div>';
    document.body.appendChild(overlay);
  }

  let html = '';
  // Header
  html += '<div class="task-detail-header">';
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">';
  html += '<div style="flex:1"><div style="font-size:17px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:8px">' + t.name + '</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  html += '<span style="display:inline-block;padding:3px 10px;border-radius:5px;font-size:11px;font-weight:600;background:' + dsBg[ds] + ';color:' + dsClr[ds] + '">' + dsLabels[ds] + '</span>';
  html += '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary)">';
  html += '<span style="width:20px;height:20px;border-radius:50%;background:' + avatarColor + ';display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">' + initials + '</span>';
  html += t.person + '</span>';
  if (t.mr) html += '<a href="#" style="color:var(--accent);text-decoration:none;font-size:12px;font-weight:600">' + t.mr + '</a>';
  html += '</div></div>';
  html += '<button onclick="document.getElementById(\'task-detail-overlay\').classList.remove(\'open\')" style="border:none;background:var(--surface-alt);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);font-size:14px;flex-shrink:0">✕</button>';
  html += '</div></div>';

  // Body
  html += '<div class="task-detail-body">';
  // Meta
  html += '<div class="task-detail-row"><span class="task-detail-label">Сроки</span><span class="task-detail-value">' + dateStr + '</span></div>';
  html += '<div class="task-detail-row"><span class="task-detail-label">Часы</span><span class="task-detail-value">' + t.hours + 'ч</span></div>';
  // Description
  html += '<div class="task-detail-block"><div class="task-detail-block-title">Описание</div>';
  html += t.desc ? '<div class="task-detail-block-text">' + t.desc + '</div>' : '<div class="task-detail-empty">Не заполнено</div>';
  html += '</div>';
  // Work done
  html += '<div class="task-detail-block"><div class="task-detail-block-title">Выполненная работа</div>';
  html += t.workDesc ? '<div class="task-detail-block-text">' + t.workDesc + '</div>' : '<div class="task-detail-empty">Не заполнено</div>';
  html += '</div>';
  // MR
  if (t.mr) {
    html += '<div class="task-detail-block"><div class="task-detail-block-title">Merge Request</div>';
    html += '<div style="font-size:13px"><a href="#" style="color:var(--accent);text-decoration:none;font-weight:600">' + t.mr + '</a></div></div>';
  }
  html += '</div>';

  document.getElementById('task-detail-content').innerHTML = html;
  overlay.classList.add('open');
}

function initScrollbars(containerId) {
  document.querySelectorAll('#' + containerId + ' .gantt-sprint-block').forEach(block => {
    const scroll = block.querySelector('.gantt-sprint-scroll');
    const bar = block.querySelector('.gantt-custom-scrollbar');
    const thumb = bar.querySelector('.thumb');
    if (!scroll || !bar || !thumb) return;
    function update() {
      const can = scroll.scrollWidth > scroll.clientWidth;
      bar.style.display = can ? 'block' : 'none';
      if (!can) return;
      const tw = bar.clientWidth;
      const r = scroll.clientWidth / scroll.scrollWidth;
      const thw = Math.max(30, r * tw);
      thumb.style.width = thw + 'px';
      const ms = scroll.scrollWidth - scroll.clientWidth;
      const mt = tw - thw;
      thumb.style.left = (ms > 0 ? (scroll.scrollLeft / ms) * mt : 0) + 'px';
    }
    scroll.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
    let dragging = false, startX = 0, startLeft = 0;
    thumb.addEventListener('mousedown', e => { dragging = true; startX = e.clientX; startLeft = parseFloat(thumb.style.left) || 0; thumb.classList.add('active'); e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (!dragging) return; const dx = e.clientX - startX; const tw2 = bar.clientWidth; const thw2 = thumb.offsetWidth; const mt2 = tw2 - thw2; const nl = Math.max(0, Math.min(mt2, startLeft + dx)); thumb.style.left = nl + 'px'; const ms2 = scroll.scrollWidth - scroll.clientWidth; scroll.scrollLeft = mt2 > 0 ? (nl / mt2) * ms2 : 0; });
    document.addEventListener('mouseup', () => { dragging = false; thumb.classList.remove('active'); });
    bar.addEventListener('click', e => { if (e.target === thumb) return; const rect = bar.getBoundingClientRect(); const cx = e.clientX - rect.left; const ms3 = scroll.scrollWidth - scroll.clientWidth; scroll.scrollLeft = (cx / bar.clientWidth) * ms3; });
  });
}

// ─── Members renderer ───
function renderMembers(containerId, currentUser) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = teamMembers.map(m => {
    const badges = (m.leader ? '<span class="member-leader">Лидер</span>' : '') + (m.name === currentUser ? '<span class="member-you">Вы</span>' : '');
    return '<div class="member-chip"><div class="member-avatar" style="background:' + m.color + '">' + m.initials + '</div><div><div class="member-name">' + m.name + ' ' + badges + '</div><div class="member-role-label">' + m.role + '</div></div></div>';
  }).join('');
}

// ─── Evidence (report tasks from gantt) ───
function renderEvidence(currentUser) {
  const el = document.getElementById('evidence-list');
  if (!el) return;
  const myTasks = sTasks.filter(t => t.sprint === 2 && t.person === currentUser);
  const statusLabels = {new:'Новая', progress:'В работе', review:'Ревью', done:'Готово', overdue:'Истекла'};
  const statusBg = {new:'var(--surface-alt)', progress:'#e8eef6', review:'var(--purple-bg)', done:'var(--success-bg)', overdue:'var(--danger-bg)'};
  const statusColor = {new:'var(--text-muted)', progress:'var(--accent)', review:'var(--purple)', done:'var(--success)', overdue:'var(--danger)'};
  let html = '';
  myTasks.forEach(t => {
    const ds = calcTaskStatus(t);
    const mrHtml = t.mr ? '<a href="#" style="color:var(--accent);text-decoration:none;font-weight:600;margin-left:auto">' + t.mr + '</a>' : '<span style="color:var(--text-muted);font-style:italic;margin-left:auto">нет MR</span>';
    html += '<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 8px;background:var(--surface);border-radius:5px"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:' + statusBg[ds] + ';color:' + statusColor[ds] + '">' + statusLabels[ds] + '</span><span style="flex:1">' + t.name + '</span>' + mrHtml + '</div>';
  });
  if (!myTasks.length) html = '<div style="font-size:12px;color:var(--text-muted);padding:8px">Нет задач. Добавьте через диаграмму Ганта.</div>';
  el.innerHTML = html;
  const totalH = myTasks.reduce((s, t) => s + t.hours, 0);
  const hoursInput = document.querySelector('#ptab-s-reports input[type="number"]');
  if (hoursInput) hoursInput.value = totalH;
}

// ─── Profile HTML (shared between roles) ───
function getProfileHtml(userData) {
  return `
  <h1 class="page-title">Мой профиль</h1>
  <div class="page-context">Информация о вас — видна менторам и координатору при распределении по проектам</div>
  <div class="profile-grid">
    <div class="profile-card">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><circle cx="9" cy="6" r="3.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 17c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" stroke="currentColor" stroke-width="1.4"/></svg>
        Основная информация
      </div>
      <div class="profile-field"><label class="profile-label">ФИО</label><input class="profile-input" value="${userData.fullName}" readonly></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="profile-field"><label class="profile-label">Курс</label><input class="profile-input" value="${userData.course}" readonly></div>
        <div class="profile-field"><label class="profile-label">Группа</label><input class="profile-input" value="${userData.group}" readonly></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="profile-field"><label class="profile-label">Средний балл</label><input class="profile-input" value="${userData.gpa}" readonly></div>
        <div class="profile-field"><label class="profile-label">Направление</label><input class="profile-input" value="${userData.direction}" readonly></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Эти данные загружены из информационной системы МФТИ</div>
    </div>
    <div class="profile-card">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><rect x="2" y="3.5" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 6l7 4.5L16 6" stroke="currentColor" stroke-width="1.4"/></svg>
        Контакты
      </div>
      <div class="profile-field"><label class="profile-label">Email *</label><input class="profile-input" value="${userData.email}" placeholder="email@phystech.edu"></div>
      <div class="profile-field"><label class="profile-label">Telegram</label><input class="profile-input" value="${userData.tg}" placeholder="@username"></div>
      <div class="profile-field"><label class="profile-label">Телефон</label><input class="profile-input" value="${userData.phone}" placeholder="+7 (___) ___-__-__"></div>
    </div>
    <div class="profile-card profile-card-full">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M9 2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L9 12.8 4.8 15l.8-4.7L2.2 7l4.7-.7L9 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        Навыки и компетенции
      </div>
      <div class="profile-field">
        <label class="profile-label">Языки программирования и технологии</label>
        <div class="skill-tags-input" id="skills-container" onclick="document.getElementById('skill-new').focus()">
          ${userData.skills.map(s => '<span class="skill-tag">' + s + ' <button onclick="this.parentElement.remove()">✕</button></span>').join('')}
          <input class="skill-input" id="skill-new" placeholder="Добавить навык..." onkeydown="if(event.key==='Enter'&&this.value.trim()){event.preventDefault();const t=document.createElement('span');t.className='skill-tag';t.innerHTML=this.value.trim()+' <button onclick=&quot;this.parentElement.remove()&quot;>✕</button>';this.parentElement.insertBefore(t,this);this.value='';}">
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Нажмите Enter для добавления нового навыка</div>
      </div>
      <div class="profile-field">
        <label class="profile-label">О себе</label>
        <textarea class="profile-textarea" placeholder="Расскажите о своём опыте...">${userData.about}</textarea>
      </div>
    </div>
    <div class="profile-card">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M7.5 10.5a4 4 0 005.2.4l2.1-2.1a4 4 0 00-5.6-5.6L7.8 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10.5 7.5a4 4 0 00-5.2-.4L3.2 9.2a4 4 0 005.6 5.6l1.3-1.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Ссылки
      </div>
      <div id="links-list">
        ${userData.links.map(l => '<div class="link-row"><select class="link-type"><option' + (l.type==='GitHub'?' selected':'') + '>GitHub</option><option' + (l.type==='GitLab'?' selected':'') + '>GitLab</option><option' + (l.type==='Портфолио'?' selected':'') + '>Портфолио</option><option' + (l.type==='Другое'?' selected':'') + '>Другое</option></select><input class="profile-input" value="' + l.url + '" style="flex:1"><button class="link-remove" onclick="this.parentElement.remove()">✕</button></div>').join('')}
      </div>
      <button onclick="addLink()" style="margin-top:8px;padding:7px 14px;border:1px dashed var(--border);border-radius:7px;background:none;color:var(--text-muted);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 0.15s" onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">${SVG_PLUS} Добавить ссылку</button>
    </div>
    <div class="profile-card">
      <div class="profile-card-title">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M10 2H5a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7l-5-5z" stroke="currentColor" stroke-width="1.4"/><path d="M10 2v5h5" stroke="currentColor" stroke-width="1.4"/></svg>
        Файлы
      </div>
      <div id="files-list">
        ${userData.files.map(f => '<div class="file-item"><div class="file-icon"><svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M9 2H5a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 005 14h6a1.5 1.5 0 001.5-1.5V5.5L9 2z" stroke="currentColor" stroke-width="1.2"/><path d="M9 2v4h3.5" stroke="currentColor" stroke-width="1.2"/></svg></div><div><div class="file-name">' + f.name + '</div><div class="file-size">' + f.size + '</div></div><button class="file-remove" onclick="this.parentElement.remove()">✕</button></div>').join('')}
      </div>
      <div class="file-drop-zone" onclick="alert('Выберите файл (PDF, DOCX — до 10 МБ)')">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" style="color:var(--text-muted);margin-bottom:4px"><path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 16.7V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <div style="font-size:13px;color:var(--text-muted)">Перетащите файл или нажмите для загрузки</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">PDF, DOCX — до 10 МБ. Изображения не поддерживаются.</div>
      </div>
    </div>
  </div>
  <div class="profile-save-bar">
    <button style="padding:10px 20px;border:1px solid var(--border);border-radius:8px;background:var(--white);color:var(--text-secondary);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer" onclick="alert('Изменения отменены')">Отменить</button>
    <button style="padding:10px 28px;border:none;border-radius:8px;background:var(--primary);color:#fff;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer" onclick="alert('Профиль сохранён!')">Сохранить изменения</button>
  </div>`;
}

// ─── Данные пользователя (для профиля) ───
const studentUserData = {
  fullName: 'Стародубов Александр Юрьевич',
  course: '2 курс бакалавриата',
  group: 'Б05-321',
  gpa: '7.2',
  direction: 'Программная инженерия',
  email: 'starodubov.ayu@phystech.edu',
  tg: '@starodubov_a',
  phone: '+7 (999) 123-45-67',
  skills: ['Python','Django','PostgreSQL','Git','Docker','REST API'],
  about: 'Имею опыт веб-разработки на Python/Django. В прошлом семестре участвовал в проекте СУПП ВШПИ — разрабатывал сервис распределения студентов по проектам. Интересуюсь backend-разработкой и DevOps.',
  links: [
    {type:'GitLab', url:'https://gitlab.com/starodubov'},
    {type:'GitHub', url:'https://github.com/starodubov-a'}
  ],
  files: [
    {name:'Резюме_Стародубов.pdf', size:'245 КБ · загружен 15 мар 2026'},
    {name:'Сертификат_Python_Advanced.pdf', size:'128 КБ · загружен 10 мар 2026'}
  ]
};

// ─── Моковые данные личных отчётов ───
const memberReports = {
  2: {
    'Стародубов А.': {
      saved: true,
      text: 'Реализовал REST API для управления проектами (CRUD-операции). Интегрировал OAuth-авторизацию через МФТИ. Координировал работу команды, проводил code review.',
      hours: 36
    },
    'Кузнецов М.': {
      saved: true,
      text: 'Разрабатывал компоненты UI: дашборд ментора, форма создания проекта. Интегрировал REST API в фронтенд. Настроил адаптивную вёрстку.',
      hours: 24
    },
    'Лебедева Н.': {
      saved: false,
      text: '',
      hours: 0
    },
    'Волков Д.': {
      saved: true,
      text: 'Написал unit-тесты для модуля авторизации. Составил тест-план. Настроил CI/CD пайплайн в GitLab с автоматическим запуском тестов.',
      hours: 18
    }
  },
  1: {
    'Стародубов А.': {
      saved: true, submitted: true,
      text: 'Структура проекта Django, доменные модели, координация команды.',
      hours: 20
    },
    'Кузнецов М.': {
      saved: true, submitted: true,
      text: 'Создал прототип интерфейса в Figma: основные экраны дашборда, каталог проектов, формы регистрации. Подготовил UI-кит с компонентами для команды.',
      hours: 24
    },
    'Лебедева Н.': {
      saved: true, submitted: true,
      text: 'Провела анализ требований к системе, составила карту пользовательских историй, подготовила документ с функциональными требованиями.',
      hours: 16
    },
    'Волков Д.': {
      saved: true, submitted: true,
      text: 'Настроил Docker Compose окружение для разработки, написал начальные тесты.',
      hours: 12
    }
  }
};

// ─── Рендер задач участника для отчёта (клик открывает попап) ───
function renderMemberTasks(person, sprintNum, editable) {
  const tasks = sTasks.filter(t => t.person === person && t.sprint === sprintNum);
  if (!tasks.length) return '<div style="font-size:12px;color:var(--text-muted);padding:6px 0">Нет задач в этом спринте</div>';
  const dsMap = {new:'Новая', progress:'В работе', review:'Ревью', done:'Готово', overdue:'Истекла'};
  const dsBg = {new:'var(--surface-alt)', progress:'#e8eef6', review:'var(--purple-bg)', done:'var(--success-bg)', overdue:'var(--danger-bg)'};
  const dsColor = {new:'var(--text-muted)', progress:'var(--accent)', review:'var(--purple)', done:'var(--success)', overdue:'var(--danger)'};

  let html = '';
  tasks.forEach(t => {
    const ds = sprintNum === 2 ? calcTaskStatus(t) : t.status;
    const globalIdx = sTasks.indexOf(t);
    const mrHtml = t.mr ? '<span style="color:var(--accent);font-weight:600;font-size:11px;flex-shrink:0">' + t.mr + '</span>' : '';
    const clickFn = editable ? 'openTaskModal(' + globalIdx + ')' : 'showTaskDetail(' + globalIdx + ')';

    html += '<div onclick="' + clickFn + '" style="border:1px solid var(--border-light);border-radius:6px;margin-bottom:4px;display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;font-size:12px;transition:background 0.1s" onmouseover="this.style.background=\'var(--surface)\'" onmouseout="this.style.background=\'\'">';
    html += '<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;background:' + dsBg[ds] + ';color:' + dsColor[ds] + ';white-space:nowrap;flex-shrink:0">' + dsMap[ds] + '</span>';
    html += '<span style="font-weight:500;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + t.name + '</span>';
    html += mrHtml;
    html += '<span style="color:var(--text-muted);font-size:11px;flex-shrink:0">' + t.hours + 'ч</span>';
    html += '</div>';
  });
  return html;
}

// ─── Рендер карточки отчёта участника ───
function renderMemberReportCard(person, sprintNum, isCurrentUser) {
  const member = teamMembers.find(m => m.name === person);
  if (!member) return '';
  const tasks = sTasks.filter(t => t.person === person && t.sprint === sprintNum);
  const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
  const leaderBadge = member.leader ? '<span class="member-leader">Лидер</span>' : '';
  const youBadge = isCurrentUser ? '<span class="member-you">Вы</span>' : '';
  const border = isCurrentUser ? 'border:2px solid var(--accent)' : 'border:1px solid var(--border-light)';

  let html = '<div style="margin-bottom:8px;padding:14px 16px;' + border + ';border-radius:8px">';
  html += '<div style="display:flex;align-items:center;gap:10px;' + (tasks.length ? 'margin-bottom:10px' : '') + '">';
  html += '<div style="width:28px;height:28px;border-radius:50%;background:' + member.color + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">' + member.initials + '</div>';
  html += '<div style="font-size:13px;font-weight:600">' + person + '</div>';
  html += leaderBadge + youBadge;
  if (totalHours) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + totalHours + 'ч</span>';
  html += '</div>';
  if (tasks.length) {
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Задачи в спринте' + (isCurrentUser ? ' <span style="font-weight:400">(кликните для редактирования)</span>' : '') + ':</div>';
    html += renderMemberTasks(person, sprintNum, isCurrentUser);
  } else {
    html += '<div style="font-size:12px;color:var(--text-muted);margin-top:8px">Нет задач в этом спринте</div>';
  }
  html += '</div>';
  return html;
}

// ─── Полный рендер блока "Личные отчёты" ───
function renderPersonalReports(containerId, currentUser, sprintNum) {
  const el = document.getElementById(containerId);
  if (!el) return;
  window._currentReportUser = currentUser;
  let html = '';
  // Current user first
  html += renderMemberReportCard(currentUser, sprintNum, true);
  // Others
  teamMembers.filter(m => m.name !== currentUser).forEach(m => {
    html += renderMemberReportCard(m.name, sprintNum, false);
  });
  el.innerHTML = html;
}

// ─── Рендер отчётов прошлых спринтов (readonly для всех) ───
function renderPastSprintReports(containerId, sprintNum, mentorComment, score) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let html = '';
  teamMembers.forEach(m => {
    html += renderMemberReportCard(m.name, sprintNum);
  });
  if (mentorComment) {
    html += '<div style="padding:12px 14px;background:var(--surface);border-radius:7px;border-left:3px solid var(--accent);margin-top:12px">';
    html += '<div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:4px">Комментарий ментора</div>';
    html += '<div style="font-size:13px;color:var(--text-secondary);line-height:1.6">' + mentorComment + '</div>';
    if (score) html += '<div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--success)">Оценка: ' + score + '</div>';
    html += '</div>';
  }
  el.innerHTML = html;
}
