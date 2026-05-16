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
    // Шаг 1: Получить все заявки
    auto applications = applications_port_->GetAllApplications();

    // Шаг 2: Получить все проекты и команды
    auto projects = projects_port_->GetAllProjects();

    // Шаг 3: Получить информацию о студентах
    auto students = students_port_->GetStudents("student");

    // Шаг 4: Запустить алгоритм распределения
    DistributionAlgorithm algorithm;
    auto result = algorithm.Distribute(applications, projects, students);

    // Шаг 5: Обновить статусы заявок
    for (const auto& app : result.recommended) {
        applications_port_->UpdateApplicationStatus(app);
    }
    for (const auto& app : result.not_recommended) {
        applications_port_->UpdateApplicationStatus(app);
    }

    return result;
}

} // namespace Core::Services
