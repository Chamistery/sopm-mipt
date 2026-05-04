#ifndef CORE_SERVICES_DISTRIBUTION_SERVICE_HPP
#define CORE_SERVICES_DISTRIBUTION_SERVICE_HPP

#include <vector>
#include <string>
#include <memory>
#include "../ports/driven/applications_port.hpp"
#include "../ports/driven/projects_port.hpp"
#include "../ports/driven/students_port.hpp"
#include "../domain/models.hpp"
#include "../../algorithms/gale_shapley.hpp"

namespace Core::Services {

using namespace Core::Domain;
using namespace Core::Ports::Driven;
using namespace Core::Algorithms;

/**
 * Основной сервис распределения студентов
 * Орхестрирует получение данных через адаптеры и вызов алгоритма распределения
 */
class DistributionService {
private:
    std::shared_ptr<IApplicationsPort> applications_port_;
    std::shared_ptr<IProjectsPort> projects_port_;
    std::shared_ptr<IStudentsPort> students_port_;

public:
    DistributionService(
        std::shared_ptr<IApplicationsPort> applications_port,
        std::shared_ptr<IProjectsPort> projects_port,
        std::shared_ptr<IStudentsPort> students_port);

    virtual ~DistributionService() = default;

    /**
     * Выполнить полный цикл распределения:
     * 1. Получить все заявки
     * 2. Получить все проекты и команды
     * 3. Получить информацию о студентах
     * 4. Запустить алгоритм распределения
     * 5. Обновить статусы заявок
     */
    DistributionAlgorithm::Result ExecuteDistribution();
};

} // namespace Core::Services

#endif // CORE_SERVICES_DISTRIBUTION_SERVICE_HPP
