#include "distribution_service.hpp"

namespace Core::Services {

DistributionService::DistributionService(std::shared_ptr<IDistributionInputPort> input_port)
    : input_port_(input_port) {}

DistributionAlgorithm::Result DistributionService::ExecuteDistribution() {
    auto snapshot = input_port_->Fetch();
    DistributionAlgorithm algorithm;
    return algorithm.Distribute(snapshot.applications, snapshot.projects, snapshot.students);
}

} // namespace Core::Services
