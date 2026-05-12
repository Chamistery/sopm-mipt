/*
 * Context для базового URL архивных страниц.
 *
 * Архив используется в двух местах:
 *   - ментор: /mentor/archive[...]
 *   - координатор: /admin/archive[...]
 *
 * Вместо prop-drilling по всем дочерним компонентам прокидываем basePath
 * через context. Default — '/mentor/archive' (mentor-страницы остаются
 * без обёртки и работают как раньше).
 */

import { createContext, useContext } from 'react';

export const ARCHIVE_BASE_PATH_MENTOR = '/mentor/archive';
export const ARCHIVE_BASE_PATH_COORD = '/admin/archive';

export const ArchiveBasePathContext = createContext<string>(ARCHIVE_BASE_PATH_MENTOR);

export function useArchiveBasePath(): string {
  return useContext(ArchiveBasePathContext);
}
