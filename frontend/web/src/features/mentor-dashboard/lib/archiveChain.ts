/*
 * Цепочка крошек архивных страниц.
 *
 * Когда ментор из архивного проекта открывает его предшественника, мы
 * добавляем текущий projectId в стек и передаём в URL ?chain=id1,id2,…
 * Хлебные крошки рендерят:
 *   «Архив проектов → <chain[0]> → … → <chain[N-1]> → <текущий>»
 *
 * Используем URL params (а не sessionStorage), потому что:
 *   - cемантически чисто: bookmarkable, shareable;
 *   - переживает перезагрузку и переход в другой таб;
 *   - не требует Provider-контекста.
 *
 * Парсер тол сlerantный: пустые / нечисловые токены отбрасываются.
 */

const SEP = ',';

/** Парсит ?chain=… в массив projectId. Невалидные значения отбрасываются. */
export function parseChain(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(SEP)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0 && Number.isInteger(n));
}

/** Сериализует массив projectId обратно в строку для URL. */
export function serializeChain(chain: ReadonlyArray<number>): string {
  return chain.join(SEP);
}

/**
 * Добавляет projectId в конец цепочки, не дублируя последний элемент.
 * Возвращает новую цепочку (не мутирует вход).
 */
export function pushToChain(
  chain: ReadonlyArray<number>,
  projectId: number,
): number[] {
  if (!Number.isFinite(projectId) || projectId <= 0) return [...chain];
  const last = chain[chain.length - 1];
  if (last === projectId) return [...chain];
  return [...chain, projectId];
}

/**
 * Возвращает chain, обрезанный по позиции targetId (включительно).
 * Используется при клике на крошку: «вернёмся в эту точку цепочки».
 * Если targetId отсутствует — возвращает пустую цепочку.
 */
export function popToChain(
  chain: ReadonlyArray<number>,
  targetId: number,
): number[] {
  const idx = chain.indexOf(targetId);
  if (idx < 0) return [];
  return chain.slice(0, idx);
}

/**
 * Строит URL с обновлённым chain. Сохраняет остальные query-params.
 *
 * Запятые в chain не кодируем — это безопасно в query-strings (RFC 3986
 * относит `,` к sub-delims, не reserved). URLSearchParams форсит
 * percent-encoding `%2C`, что даёт некрасивые URLs и в Storybook, и в адресной
 * строке. Поэтому собираем строку вручную.
 */
export function chainUrl(
  pathname: string,
  chain: ReadonlyArray<number>,
  extra?: URLSearchParams,
): string {
  const params: string[] = [];
  if (extra) {
    for (const [k, v] of extra.entries()) {
      if (k === 'chain') continue;
      params.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  if (chain.length > 0) params.push(`chain=${serializeChain(chain)}`);
  return params.length > 0 ? `${pathname}?${params.join('&')}` : pathname;
}
