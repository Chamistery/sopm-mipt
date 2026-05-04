import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  deleteUserFile,
  listUserFiles,
  uploadUserFile,
  type UserFile,
} from '@/api/users';
import {
  formatFileSize,
  formatRelativeDate,
  formatValidationError,
  validateFile,
  type FileValidationError,
} from '../lib/userFiles';
import styles from './UserFilesSection.module.css';

const ACCEPT_ATTR =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface UserFilesSectionProps {
  userId: number;
  /**
   * Optional: when set, всегда возвращается этот список вместо useQuery.
   * Используется только в Storybook — компонент должен оставаться
   * самодостаточным в реальном приложении.
   */
  initialData?: UserFile[];
}

export function UserFilesSection({ userId, initialData }: UserFilesSectionProps): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['user', userId, 'files'] as const;

  const filesQuery = useQuery({
    queryKey,
    queryFn: () => listUserFiles(userId),
    initialData,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadUserFile(userId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: number) => deleteUserFile(userId, fileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<FileValidationError | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const handleFile = (raw: File | undefined): void => {
    if (!raw) return;
    const err = validateFile(raw);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    uploadMutation.mutate(raw);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleFile(event.target.files?.[0]);
    // позволяем повторно загрузить тот же файл
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (): void => setDragActive(false);

  const openPicker = (): void => inputRef.current?.click();

  const files = filesQuery.data ?? [];
  const uploadError = mutationErrorMessage(uploadMutation.error);
  const listError = mutationErrorMessage(filesQuery.error);

  return (
    <section className={styles.section}>
      {filesQuery.isLoading ? (
        <div className={styles.placeholder}>Загружаем файлы…</div>
      ) : listError ? (
        <div className={styles.error}>Не удалось загрузить файлы: {listError}</div>
      ) : files.length === 0 ? (
        <div className={styles.empty}>Загрузите резюме или сертификаты в формате PDF / DOCX.</div>
      ) : (
        <ul className={styles.list}>
          {files.map((file) => (
            <li key={file.id} className={styles.item}>
              <FileIcon type={file.fileType} />
              <div className={styles.meta}>
                <div className={styles.name} title={file.fileName}>
                  {file.fileName}
                </div>
                <div className={styles.sub}>
                  {formatFileSize(file.fileSize)} · {formatRelativeDate(file.uploadedAt)}
                </div>
              </div>
              {confirmId === file.id ? (
                <>
                  <button
                    type="button"
                    className={styles.removeConfirm}
                    onClick={() => {
                      deleteMutation.mutate(file.id);
                      setConfirmId(null);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Удалить
                  </button>
                  <button
                    type="button"
                    className={styles.removeCancel}
                    onClick={() => setConfirmId(null)}
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => setConfirmId(file.id)}
                  aria-label={`Удалить ${file.fileName}`}
                >
                  Удалить
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div
        className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        <div className={styles.dropZoneTitle}>
          Перетащите файл или нажмите для загрузки
        </div>
        <div className={styles.dropZoneHint}>
          PDF, DOCX — до 10 МБ. Изображения не поддерживаются.
        </div>
        {uploadMutation.isPending ? (
          <div className={styles.uploading}>Загружаем…</div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={onInputChange}
          className={styles.dropZoneInput}
          aria-label="Выбрать файл для загрузки"
        />
      </div>

      {validationError ? (
        <div className={styles.error}>{formatValidationError(validationError)}</div>
      ) : null}
      {uploadError ? <div className={styles.error}>Не удалось загрузить: {uploadError}</div> : null}
    </section>
  );
}

function mutationErrorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'неизвестная ошибка';
}

interface FileIconProps {
  type: string;
}

function FileIcon({ type }: FileIconProps): JSX.Element {
  const lower = type.toLowerCase();
  if (lower === 'pdf') {
    return (
      <div className={`${styles.icon} ${styles.iconPdf}`} aria-hidden="true">
        PDF
      </div>
    );
  }
  if (lower === 'docx') {
    return (
      <div className={`${styles.icon} ${styles.iconDocx}`} aria-hidden="true">
        DOCX
      </div>
    );
  }
  return (
    <div className={styles.icon} aria-hidden="true">
      {lower.slice(0, 4) || 'FILE'}
    </div>
  );
}
