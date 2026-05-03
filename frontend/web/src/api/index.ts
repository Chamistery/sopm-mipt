/*
 * Public surface for everything HTTP-related. Feature code should import
 * from here, not from individual files — that way refactors inside `src/api/`
 * don't ripple through the rest of the codebase.
 *
 * Example:
 *   import { listProjects, type Project, ProjectStatus } from '@/api';
 */

export * from './client';
export * from './types';
export * from './projects';
export * from './applications';
export * from './teams';
export * from './tasks';
export * from './teamReports';
export * from './sprintScores';
export * from './distribution';
export * from './meetings';
export * from './users';
