import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { UserFile } from '@/api/users';
import { UserFilesSection } from './UserFilesSection';

/*
 * Storybook рендерит компонент в изоляции, без реальной API-обёртки.
 * Каждая story создаёт свой QueryClient с переопределённым `queryFn`
 * (никаких сетевых вызовов). `initialData` подставляет данные для
 * useQuery; для loading/error используем queryFn, который повисает
 * или кидает ошибку.
 */

const ONE_FILE: UserFile[] = [
  {
    id: 1,
    userId: 42,
    fileName: 'Резюме_Стародубов.pdf',
    fileSize: 245 * 1024,
    fileType: 'pdf',
    storagePath: 'users/42/resume.pdf',
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MANY_FILES: UserFile[] = [
  ...ONE_FILE,
  {
    id: 2,
    userId: 42,
    fileName: 'Сертификат_Python_Advanced.docx',
    fileSize: 128 * 1024,
    fileType: 'docx',
    storagePath: 'users/42/cert.docx',
    uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    userId: 42,
    fileName: 'CV_long_filename_to_check_truncation_in_layout.pdf',
    fileSize: Math.round(2.4 * 1024 * 1024),
    fileType: 'pdf',
    storagePath: 'users/42/cv-long.pdf',
    uploadedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

interface Mode {
  initialFiles?: UserFile[];
  forceLoading?: boolean;
  forceError?: boolean;
  uploading?: boolean;
}

function makeClient(mode: Mode): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        queryFn: async () => {
          if (mode.forceLoading) {
            return await new Promise(() => {
              /* never resolves */
            });
          }
          if (mode.forceError) {
            throw new Error('Storybook: backend недоступен');
          }
          return mode.initialFiles ?? [];
        },
      },
      mutations: {
        retry: false,
        mutationFn: async () => {
          if (mode.uploading) {
            return await new Promise(() => {
              /* never resolves — emulate ongoing upload */
            });
          }
          throw new Error('Storybook mutation invoked');
        },
      },
    },
  });
}

const meta = {
  title: 'Profile/UserFilesSection',
  component: UserFilesSection,
  parameters: { backgrounds: { default: 'app' } },
  args: { userId: 42 },
} satisfies Meta<typeof UserFilesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const wrap = (mode: Mode) =>
  function Wrap(Story: () => JSX.Element): JSX.Element {
    return (
      <QueryClientProvider client={makeClient(mode)}>
        <div style={{ maxWidth: 640, padding: 16, background: 'var(--color-card)' }}>
          <Story />
        </div>
      </QueryClientProvider>
    );
  };

export const Empty: Story = {
  decorators: [wrap({ initialFiles: [] })],
  args: { initialData: [] },
};

export const Loading: Story = {
  decorators: [wrap({ forceLoading: true })],
};

export const SingleFile: Story = {
  decorators: [wrap({ initialFiles: ONE_FILE })],
  args: { initialData: ONE_FILE },
};

export const MultipleFiles: Story = {
  decorators: [wrap({ initialFiles: MANY_FILES })],
  args: { initialData: MANY_FILES },
};

export const ListError: Story = {
  decorators: [wrap({ forceError: true })],
};
