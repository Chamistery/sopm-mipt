import { useRef, useState } from 'react';

import styles from './FileDrop.module.css';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
}

interface Props {
  files: AttachedFile[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (id: string) => void;
  /** Максимальный размер одного файла в байтах. По умолчанию 10 МБ. */
  maxSizeBytes?: number;
}

const ACCEPT = '.pdf,.docx';

/**
 * Drag-and-drop зона для прикрепления файлов к заявке. UI-only — реальный
 * upload пока не подключён (бэкенд не имеет ручки storage для черновиков).
 */
export function FileDrop({
  files,
  onFilesAdded,
  onFileRemoved,
  maxSizeBytes = 10 * 1024 * 1024,
}: Props): JSX.Element {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | File[]): void => {
    const list = Array.from(incoming);
    const valid: File[] = [];
    for (const f of list) {
      if (f.size > maxSizeBytes) {
        setError(`Файл «${f.name}» превышает 10 МБ`);
        return;
      }
      const lower = f.name.toLowerCase();
      if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
        setError(`Файл «${f.name}» не поддерживается (только PDF/DOCX)`);
        return;
      }
      valid.push(f);
    }
    setError(null);
    if (valid.length > 0) onFilesAdded(valid);
  };

  return (
    <div>
      <div
        className={`${styles.zone} ${dragOver ? styles.dragOver : ''}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
      >
        <div className={styles.title}>Прикрепить дополнительные файлы</div>
        <div className={styles.subtitle}>ТЗ, техническая документация (PDF, DOCX — до 10 МБ)</div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className={styles.hiddenInput}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}
      {files.length > 0 ? (
        <ul className={styles.fileList} aria-label="Прикреплённые файлы">
          {files.map((f) => (
            <li key={f.id} className={styles.fileItem}>
              <span className={styles.fileName}>{f.name}</span>
              <span className={styles.fileSize}>{formatSize(f.size)}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onFileRemoved(f.id)}
                aria-label={`Удалить ${f.name}`}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
