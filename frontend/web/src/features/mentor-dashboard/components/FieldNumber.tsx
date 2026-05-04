import styles from './FieldNumber.module.css';

interface Props {
  /** Номер поля по «Положению о ПП» (1..13). */
  n: number;
}

/** Синий квадратик 22×22 с номером поля заявки — визуально префиксует label. */
export function FieldNumber({ n }: Props): JSX.Element {
  return <span className={styles.box}>{n}</span>;
}
