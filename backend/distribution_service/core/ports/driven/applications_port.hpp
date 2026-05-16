#ifndef CORE_PORTS_DRIVEN_APPLICATIONS_PORT_HPP
#define CORE_PORTS_DRIVEN_APPLICATIONS_PORT_HPP

#include <vector>
#include <string>
#include "../../domain/models.hpp"

namespace Core::Ports::Driven {

using namespace Core::Domain;

/// @brief Порт для работы с заявками студентов на проекты
/// @note Сервис распределения работает как «чистый калькулятор»:
/// результаты возвращаются HTTP-клиенту, а в БД их применяет
/// вызывающая сторона (project-service в транзакции). Поэтому порт
/// предоставляет только чтение.
class IApplicationsPort {
public:
    virtual ~IApplicationsPort() = default;

    /// @brief Получить заявки для конкретного проекта
    virtual std::vector<Application> GetApplicationsForProject(int32_t project_id) = 0;
};

} // namespace Core::Ports::Driven

#endif // CORE_PORTS_DRIVEN_APPLICATIONS_PORT_HPP
