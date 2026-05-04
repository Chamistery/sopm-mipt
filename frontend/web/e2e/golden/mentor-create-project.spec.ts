import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для нового экрана «Создание проекта» у ментора.
 *
 *   /mentor/projects/new
 *      → H1 «Создание проекта», breadcrumb с «Дашборд»
 *      → 4 секции, шагалка step-dots
 *      → ментор последовательно заполняет 4 секции, видит превью таймлайна,
 *        нажимает «Создать проект» — фронт отправляет POST /api/projects и
 *        перебрасывает на /mentor.
 */

test.describe('mentor — создание проекта', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('менеджер проходит 4 секции и создаёт проект', async ({ page }) => {
    await page.goto('/mentor/projects/new');

    await expect(page.getByRole('heading', { level: 1, name: 'Создание проекта' })).toBeVisible({
      timeout: 15_000,
    });

    // Section 0
    await page.getByPlaceholder('Отражает содержание результата и конструктивные особенности').fill('Платформа автоматизации тестирования');
    await page.getByPlaceholder('Название организации').fill('Яндекс.Образование');
    await page.getByPlaceholder('ФИО ментора').fill('Тимохин Виктор');
    await page.getByPlaceholder('Должность').fill('Старший инженер');
    await page.getByPlaceholder('Электронная почта').fill('timokhin@example.com');
    await page.getByPlaceholder('Формулирует цель проектной деятельности как решение некоторой проблемы').fill('Сократить время регрессионного тестирования.');
    await page.getByPlaceholder('Ожидаемый результат проектной деятельности').fill('Веб-приложение для автогенерации тестов.');
    await page.getByTestId('form-next').click();

    // Section 1
    await page.getByPlaceholder('Python, Django, PostgreSQL, React...').fill('Python, Django, PostgreSQL, React');
    await page.getByPlaceholder('Перечислите базовые компетенции').fill('Базовые знания Python и SQL.');
    await page.getByTestId('form-next').click();

    // Section 2
    await page.getByPlaceholder('Подробное описание проекта').fill('Платформа на стеке Django+React.');
    await page.getByPlaceholder('Функциональные требования').fill('Тесты должны проходить за < 5 минут.');
    await page.getByPlaceholder('Перечень компетенций').fill('Backend разработка, тестирование.');
    await page.getByTestId('form-next').click();

    // Section 3 — заполняем дату начала спринтов; остальные поля имеют разумные defaults.
    await page.getByLabel(/Дата начала первого спринта/).fill('2026-09-01');

    // Превью таймлайна должно появиться (Спринт 1, Спринт 5).
    await expect(page.getByText('Спринт 1', { exact: false })).toBeVisible();
    await expect(page.getByText(/Итого:/)).toBeVisible();

    await page.getByTestId('form-next').click();

    // Перенаправление на дашборд.
    await expect(page).toHaveURL(/\/mentor$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Дашборд ментора' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
