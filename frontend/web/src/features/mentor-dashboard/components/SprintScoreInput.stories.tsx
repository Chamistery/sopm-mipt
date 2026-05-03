import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { SprintScoreInput, type SprintScoreDraft } from './SprintScoreInput';

const meta = {
  title: 'MentorDashboard/SprintScoreInput',
  component: SprintScoreInput,
  parameters: { backgrounds: { default: 'app' }, layout: 'centered' },
} satisfies Meta<typeof SprintScoreInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper({ initial }: { initial: SprintScoreDraft }): JSX.Element {
  const [draft, setDraft] = useState<SprintScoreDraft>(initial);
  return (
    <div style={{ width: 700 }}>
      <SprintScoreInput
        draft={draft}
        onChange={setDraft}
        onSave={(d) => setDraft({ ...d, dirty: false })}
      />
    </div>
  );
}

export const Empty: Story = {
  args: {
    draft: {
      studentId: 1,
      studentName: 'Иванов И.',
      existingId: null,
      score: null,
      comment: '',
      dirty: false,
    },
    onChange: () => {},
    onSave: () => {},
  },
  render: (args) => <Wrapper initial={args.draft} />,
};

export const Existing: Story = {
  args: {
    draft: {
      studentId: 2,
      studentName: 'Петрова П.',
      existingId: 99,
      score: 8,
      comment: 'Отлично подхватила фронт',
      dirty: false,
    },
    onChange: () => {},
    onSave: () => {},
  },
  render: (args) => <Wrapper initial={args.draft} />,
};

export const Saving: Story = {
  args: {
    draft: {
      studentId: 3,
      studentName: 'Кузнецов К.',
      existingId: null,
      score: 7,
      comment: '',
      dirty: true,
    },
    isSaving: true,
    onChange: () => {},
    onSave: () => {},
  },
};

export const InvalidValue: Story = {
  args: {
    draft: {
      studentId: 4,
      studentName: 'Смирнов С.',
      existingId: null,
      score: 12,
      comment: '',
      dirty: true,
    },
    onChange: () => {},
    onSave: () => {},
  },
};

export const ServerError: Story = {
  args: {
    draft: {
      studentId: 5,
      studentName: 'Морозова Л.',
      existingId: null,
      score: 6,
      comment: '',
      dirty: true,
    },
    serverError: 'Ошибка 500: не удалось сохранить',
    onChange: () => {},
    onSave: () => {},
  },
};
