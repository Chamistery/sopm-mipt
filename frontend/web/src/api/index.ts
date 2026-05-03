/*
 * Public surface for everything HTTP-related. Feature code should import
 * from here, not from individual files — that way refactors inside `src/api/`
 * don't ripple through the rest of the codebase.
 *
 * Two surfaces are deliberately not re-exported here because they
 * collide on names (`TaskStatus`, `TeamReportStatus` etc.) with the
 * sibling team helpers — import them directly:
 *   import { approveTask, type Task } from '@/api/tasks';
 *   import { reviewTeamReport, type TeamReport } from '@/api/teamReports';
 */

export * from './client';
export * from './types';
export * from './projects';
export * from './applications';
export * from './teams';
export * from './sprintScores';
export * from './distribution';
export * from './meetings';
export * from './users';
export * from './templates';
