/*
 * Hand-written API surface for project templates.
 *
 * The mentor needs at least one template to create a project (templateId
 * is required by CreateProjectRequest). For MVP the form just picks the
 * first template returned by the backend; richer template selection is
 * a follow-up.
 */

import { apiFetch } from './client';

export type TemplateFieldType = 'Текст' | 'Дата' | 'Маркдаун' | 'Число';

export interface TemplateField {
  id: string;
  name: string;
  type: TemplateFieldType;
  required: boolean;
}

export interface Template {
  id: string;
  name: string;
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

export function listTemplates(): Promise<Template[]> {
  return apiFetch<Template[]>('/templates');
}
