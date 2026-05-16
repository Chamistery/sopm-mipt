#include "distribution_service.hpp"

namespace Core::Services {

DistributionService::DistributionService(
    std::shared_ptr<IApplicationsPort> applications_port,
    std::shared_ptr<IProjectsPort> projects_port,
    std::shared_ptr<IStudentsPort> students_port)
    : applications_port_(applications_port),
      projects_port_(projects_port),
      students_port_(students_port) {}

DistributionAlgorithm::Result DistributionService::ExecuteDistribution() {
    // Шаг 1: Получить все проекты (с командами)
    auto projects = projects_port_->GetAllProjects();

    // Шаг 2: Получить заявки по каждому проекту (project-service не
    // предоставляет endpoint «все заявки сразу», но матчит query projectId).
    std::vector<Application> applications;
    for (const auto& project : projects) {
        auto project_apps = applications_port_->GetApplicationsForProject(project.id);
        applications.insert(applications.end(), project_apps.begin(), project_apps.end());
    }

    // Шаг 3: Получить информацию о студентах
    auto students = students_port_->GetStudents("student");

    // Шаг 4: Запустить алгоритм распределения. Результат возвращаем
    // вызывающей стороне как чистый JSON; персистентность — забота
    // project-service (он применяет результат в транзакции, уважая
    // ручные решения ментора со статусами accepted/mentor_accepted).
    DistributionAlgorithm algorithm;
    return algorithm.Distribute(applications, projects, students);
}

} // namespace Core::Services
