#ifndef CORE_PORTS_DRIVEN_APPLICATIONS_PORT_HPP
#define CORE_PORTS_DRIVEN_APPLICATIONS_PORT_HPP

#include <vector>
#include <string>
#include "../../domain/models.hpp"

namespace Core::Ports::Driven {

using namespace Core::Domain;

/// @brief Порт для работы с заявками студентов на проекты
class IApplicationsPort {
public:
    virtual ~IApplicationsPort() = default;

    /// @brief Получить все заявки
    virtual std::vector<Application> GetAllApplications() = 0;

    /// @brief Получить заявки для конкретного проекта
    virtual std::vector<Application> GetApplicationsForProject(int32_t project_id) = 0;

    /// @brief Обновить статус заявки
    virtual void UpdateApplicationStatus(const Application& application) = 0;
};

} // namespace Core::Ports::Driven

#endif // CORE_PORTS_DRIVEN_APPLICATIONS_PORT_HPP
