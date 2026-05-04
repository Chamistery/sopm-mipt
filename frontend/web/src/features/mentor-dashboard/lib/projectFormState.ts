/*
 * ProposalData — нормированная структура заявки на проект, которая
 * соответствует прототипу `mentor.html` (view-create) и хранится на
 * бэкенде в jsonb-колонке projects.proposal_data.
 *
 * Все поля строковые / числовые / boolean — никаких вложенных типов
 * сверх необходимого, чтобы документ можно было целиком сериализовать
 * и отдать обратно для «Заполнить по шаблону».
 */

export interface MentorContact {
  fullName: string;
  role: string;
  email: string;
  telegram: string;
  phone: string;
}

export interface SprintsConfig {
  count: number;
  startDate: string;
  /** 'simple' — все спринты одинаковой длительности; 'custom' — каждый отдельно. */
  mode: 'simple' | 'custom';
  /** Длительность в неделях для mode='simple'. */
  durationWeeks: number;
  /** Если mode='custom', длительности per-sprint (в неделях). */
  customWeeks?: number[];
}

export interface ProposalData {
  // Секция 0 — Основная информация
  title: string;
  company: string;
  mentor: MentorContact;
  goal: string;
  expectedResult: string;

  // Секция 1 — Требования и технологии
  technologies: string;
  competencies: string;
  /** Минимальный рейтинг МФТИ. */
  minRating: number | null;
  /** Минимальный средний балл (GPA, 0..10). */
  minGpa: number | null;
  /** 1..4 — допустимые курсы; пустой массив = «любой курс». */
  allowedCourses: number[];

  // Секция 2 — Описание и критерии
  description: string;
  acceptanceCriteria: string;
  eduResult: string;

  // Секция 3 — Параметры реализации
  durationSemesters: 1 | 2 | 3;
  sprints: SprintsConfig;
  numTeams: number;
  teamSizeMin: number;
  teamSizeMax: number;
  resources: string;

  // Опционально — продолжение проекта
  isContinuation: boolean;
  predecessorProjectId: number | null;
}

/* ────────────────────────────────────────────────────────────────────
 * Initial / empty state factory
 * ────────────────────────────────────────────────────────────────── */

export function emptyProposalData(): ProposalData {
  return {
    title: '',
    company: '',
    mentor: { fullName: '', role: '', email: '', telegram: '', phone: '' },
    goal: '',
    expectedResult: '',
    technologies: '',
    competencies: '',
    minRating: null,
    minGpa: null,
    allowedCourses: [],
    description: '',
    acceptanceCriteria: '',
    eduResult: '',
    durationSemesters: 1,
    sprints: {
      count: 5,
      startDate: '',
      mode: 'simple',
      durationWeeks: 2,
    },
    numTeams: 1,
    teamSizeMin: 3,
    teamSizeMax: 5,
    resources: '',
    isContinuation: false,
    predecessorProjectId: null,
  };
}

/* ────────────────────────────────────────────────────────────────────
 * Section validation
 * ────────────────────────────────────────────────────────────────── */

export type SectionIndex = 0 | 1 | 2 | 3;

/**
 * Возвращает имя первого незаполненного обязательного поля выбранной секции,
 * либо null если секция готова. Имя — техническое (для подсветки), на UI
 * выводится фразой «Обязательное поле».
 */
export function firstMissingField(data: ProposalData, section: SectionIndex): string | null {
  switch (section) {
    case 0:
      if (!data.title.trim()) return 'title';
      if (!data.company.trim()) return 'company';
      if (!data.mentor.fullName.trim()) return 'mentor.fullName';
      if (!data.mentor.role.trim()) return 'mentor.role';
      if (!data.mentor.email.trim()) return 'mentor.email';
      if (!data.goal.trim()) return 'goal';
      if (!data.expectedResult.trim()) return 'expectedResult';
      return null;
    case 1:
      if (!data.technologies.trim()) return 'technologies';
      if (!data.competencies.trim()) return 'competencies';
      return null;
    case 2:
      if (!data.description.trim()) return 'description';
      if (!data.acceptanceCriteria.trim()) return 'acceptanceCriteria';
      if (!data.eduResult.trim()) return 'eduResult';
      return null;
    case 3: {
      if (!data.sprints.count || data.sprints.count < 2 || data.sprints.count > 10) {
        return 'sprints.count';
      }
      if (!data.sprints.startDate) return 'sprints.startDate';
      if (!data.numTeams || data.numTeams < 1) return 'numTeams';
      if (!data.teamSizeMin || data.teamSizeMin < 1) return 'teamSizeMin';
      if (!data.teamSizeMax || data.teamSizeMax < data.teamSizeMin) return 'teamSizeMax';
      return null;
    }
  }
}

export function isSectionComplete(data: ProposalData, section: SectionIndex): boolean {
  return firstMissingField(data, section) === null;
}

/* ────────────────────────────────────────────────────────────────────
 * Sprint timeline
 * ────────────────────────────────────────────────────────────────── */

export interface SprintRow {
  number: number;
  startDate: Date;
  endDate: Date;
  days: number;
  weeks: number;
}

export interface SprintTimeline {
  rows: SprintRow[];
  totalStart: Date;
  totalEnd: Date;
  totalDays: number;
  totalWeeks: number;
}

/**
 * Перечитывает конфигурацию спринтов в ряд интервалов.
 * Возвращает null если входные данные невалидны (нет даты, count < 2 и т.п.) —
 * вызывающая сторона рисует placeholder.
 */
export function calculateSprintTimeline(config: SprintsConfig): SprintTimeline | null {
  const { count, startDate, mode, durationWeeks, customWeeks } = config;
  if (!startDate) return null;
  if (count < 2 || count > 10) return null;
  const start = parseDateOnly(startDate);
  if (!start) return null;

  const rows: SprintRow[] = [];
  let cursor = new Date(start);
  for (let i = 1; i <= count; i++) {
    const weeks =
      mode === 'simple'
        ? durationWeeks
        : Math.max(1, Math.min(4, customWeeks?.[i - 1] ?? durationWeeks));
    const days = weeks * 7;
    const sprintStart = new Date(cursor);
    const sprintEnd = addDays(cursor, days - 1);
    rows.push({ number: i, startDate: sprintStart, endDate: sprintEnd, days, weeks });
    cursor = addDays(sprintEnd, 1);
  }

  const totalEnd = addDays(cursor, -1);
  const totalDays = Math.round((totalEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalWeeks = Math.round((totalDays / 7) * 10) / 10;

  return { rows, totalStart: start, totalEnd, totalDays, totalWeeks };
}

/** Форматирует дату в стиле прототипа: "14 апр". */
export function formatRussianDayMonth(d: Date): string {
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function parseDateOnly(iso: string): Date | null {
  // ISO 'YYYY-MM-DD' — конструируем напрямую, чтобы избежать TZ-сдвигов.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
