#ifndef ALGORITHMS_DISTRIBUTION_HPP
#define ALGORITHMS_DISTRIBUTION_HPP

#include <vector>
#include <unordered_map>
#include <map>
#include <algorithm>
#include <climits>
#include "../core/domain/models.hpp"

namespace Core::Algorithms {

using namespace Core::Domain;

/**
 * Распределение студентов на проекты и команды
 * 
 * Алгоритм:
 * 1. Итерируем приоритеты от 1 до 5
 * 2. Для каждого приоритета обрабатываем заявки в порядке убывания GPA студента
 * 3. Проверяем соответствие требованиям (курс, минимальный GPA)
 * 4. Если проект не полон - добавляем студента
 * 5. Если проект полон - сравниваем GPA студентов, заменяем если новый выше
 * 6. После распределения на проекты - распределяем в команды по GPA
 */
class DistributionAlgorithm {
public:
    /// Результат распределения
    struct Result {
        std::vector<Application> recommended;     // Студенты, рекомендованные в проекты
        std::vector<Application> not_recommended; // Студенты, не распределённые
    };

    /**
     * Распределить студентов на проекты и команды
     * @param applications Список заявок студентов на проекты
     * @param projects Список проектов
     * @param students Список студентов
     * @return Результат распределения
     */
    Result Distribute(
        const std::vector<Application>& applications,
        const std::vector<Project>& projects,
        const std::vector<Student>& students);

private:
    /// Состояние проекта во время распределения
    struct ProjectState {
        int32_t project_id;
        std::unordered_map<int32_t, int32_t> student_gpa; // student_id -> gpa (как int: gpa * 100)
        int32_t total_capacity;                            // Максимум студентов
        int32_t current_count = 0;                         // Текущее количество
    };

    /**
     * Проверить, соответствует ли студент требованиям проекта
     */
    bool StudentMeetsRequirements(
        const Student& student,
        const Project& project) const;

    /**
     * Получить студента с минимальным GPA в проекте
     */
    int32_t GetLowestGpaStudent(const ProjectState& proj_state) const;

    /**
     * Первый этап: распределение студентов на проекты по приоритетам и GPA
     */
    std::unordered_map<int32_t, std::vector<int32_t>> DistributeToProjects(
        const std::vector<Application>& applications,
        const std::vector<Project>& projects,
        const std::vector<Student>& students,
        std::vector<Application>& not_recommended);

    /**
     * Второй этап: распределение студентов в команды проекта
     */
    void AllocateToTeams(
        const std::unordered_map<int32_t, std::vector<int32_t>>& project_students,
        const std::vector<Project>& projects,
        const std::vector<Student>& students,
        std::vector<Application>& applications);
};

} // namespace Core::Algorithms

#endif // ALGORITHMS_DISTRIBUTION_HPP
