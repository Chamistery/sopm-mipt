#ifndef CORE_SERVICES_DISTRIBUTION_SERVICE_HPP
#define CORE_SERVICES_DISTRIBUTION_SERVICE_HPP

#include <memory>
#include "../ports/driven/distribution_input_port.hpp"
#include "../../algorithms/gale_shapley.hpp"

namespace Core::Services {

using namespace Core::Ports::Driven;
using namespace Core::Algorithms;

/**
 * Основной сервис распределения. Берёт снимок данных (проекты, студенты,
 * заявки) из одного источника, прогоняет Гейля-Шепли, возвращает
 * результат вызывающей стороне (HTTP-handler сериализует в JSON, а
 * project-service применяет к БД в транзакции).
 *
 * Никаких записей здесь — это «чистый калькулятор».
 */
class DistributionService {
private:
    std::shared_ptr<IDistributionInputPort> input_port_;

public:
    explicit DistributionService(std::shared_ptr<IDistributionInputPort> input_port);
    virtual ~DistributionService() = default;

    DistributionAlgorithm::Result ExecuteDistribution();
};

} // namespace Core::Services

#endif // CORE_SERVICES_DISTRIBUTION_SERVICE_HPP
