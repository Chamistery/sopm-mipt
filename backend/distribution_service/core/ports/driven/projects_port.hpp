#ifndef CORE_PORTS_DRIVEN_PROJECTS_PORT_HPP
#define CORE_PORTS_DRIVEN_PROJECTS_PORT_HPP

#include <vector>
#include "../../domain/models.hpp"

namespace Core::Ports::Driven {

using namespace Core::Domain;

/// @brief Порт для получения информации о проектах
class IProjectsPort {
public:
    virtual ~IProjectsPort() = default;

    /// @brief Получить все проекты со всеми командами
    /// @return список всех проектов
    virtual std::vector<Project> GetAllProjects() = 0;
};

} // namespace Core::Ports::Driven

#endif // CORE_PORTS_DRIVEN_PROJECTS_PORT_HPP
