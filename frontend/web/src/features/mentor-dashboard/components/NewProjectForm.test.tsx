import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NewProjectForm } from './NewProjectForm';
import { emptyProposalData } from '../lib/projectFormState';

describe('NewProjectForm', () => {
  it('renders section 0 by default with required field 1', () => {
    render(<NewProjectForm onSubmit={() => {}} onCancel={() => {}} />);
    expect(
      screen.getByPlaceholderText(/Отражает содержание результата/i),
    ).toBeInTheDocument();
  });

  it('Next is blocked until required fields of section 0 are filled', async () => {
    render(<NewProjectForm onSubmit={() => {}} onCancel={() => {}} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('form-next'));
    // Stayed on section 0: «Полное название проекта» placeholder still on the page.
    expect(screen.getByPlaceholderText(/Отражает содержание результата/i)).toBeInTheDocument();
    // Inline error visible
    expect(screen.getByRole('alert')).toHaveTextContent('Обязательное поле');
  });

  it('moves through sections and submits with proposalData', async () => {
    const onSubmit = vi.fn();
    const initial = {
      ...emptyProposalData(),
      title: 'T',
      company: 'C',
      mentor: { fullName: 'F', role: 'R', email: 'e@e', telegram: '', phone: '' },
      goal: 'G',
      expectedResult: 'E',
      technologies: 'Go',
      competencies: 'Go',
      description: 'D',
      acceptanceCriteria: 'A',
      eduResult: 'Edu',
      sprints: { count: 5, startDate: '2026-09-01', mode: 'simple' as const, durationWeeks: 2 },
    };
    render(<NewProjectForm initial={initial} onSubmit={onSubmit} onCancel={() => {}} />);
    const user = userEvent.setup();

    // section 0 → 1
    await user.click(screen.getByTestId('form-next'));
    // section 1 → 2
    await user.click(screen.getByTestId('form-next'));
    // section 2 → 3
    await user.click(screen.getByTestId('form-next'));
    // section 3 → submit
    await user.click(screen.getByTestId('form-next'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const arg = onSubmit.mock.calls[0][0] as { proposal: { title: string } };
    expect(arg.proposal.title).toBe('T');
  });

  it('fillFromTemplate invokes onFetchPredecessor and re-fills the form', async () => {
    const onFetch = vi.fn().mockResolvedValue({
      ...emptyProposalData(),
      title: 'TPL Title',
      company: 'TPL Company',
    });
    render(
      <NewProjectForm
        predecessors={[{ id: 110, title: 'Архивный' }]}
        onFetchPredecessor={onFetch}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(/Это продолжение моего предыдущего проекта/));
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '110');

    await user.click(screen.getByRole('button', { name: /Заполнить по шаблону/ }));
    await waitFor(() => expect(onFetch).toHaveBeenCalledWith(110));

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText(/Отражает содержание результата/i) as HTMLInputElement;
      expect(titleInput.value).toBe('TPL Title');
    });
  });
});
