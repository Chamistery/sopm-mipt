#ifndef CORE_PORTS_DRIVEN_DISTRIBUTION_INPUT_PORT_HPP
#define CORE_PORTS_DRIVEN_DISTRIBUTION_INPUT_PORT_HPP

#include <vector>
#include "../../domain/models.hpp"

namespace Core::Ports::Driven {

using namespace Core::Domain;

/// @brief Снимок входных данных для одного прогона распределения.
struct DistributionInputSnapshot {
    std::vector<Project> projects;
    std::vector<Student> students;
    std::vector<Application> applications;
};

/// @brief Порт чтения входных данных за один HTTP-вызов
/// (см. /api/internal/distribution/input на стороне project-service).
class IDistributionInputPort {
public:
    virtual ~IDistributionInputPort() = default;

    /// Получить полный снимок данных. Может бросить runtime_error при
    /// сетевых ошибках или невалидном JSON.
    virtual DistributionInputSnapshot Fetch() = 0;
};

} // namespace Core::Ports::Driven

#endif // CORE_PORTS_DRIVEN_DISTRIBUTION_INPUT_PORT_HPP
