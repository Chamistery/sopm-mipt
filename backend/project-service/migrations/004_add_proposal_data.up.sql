-- Хранилище заявки на проект (Приложение 1 «Положения о ПП»).
-- Один JSONB-документ с произвольной структурой: 13 полей формы +
-- настройка спринтов + контакт ментора + дополнительные требования.
-- Контракт между фронтом и бэком — TypeScript-тип ProposalData в
-- frontend/web/src/features/mentor-dashboard/lib/projectFormState.ts.

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS proposal_data JSONB;
