#ifndef ADAPTERS_DRIVEN_HTTP_DISTRIBUTION_INPUT_ADAPTER_HPP
#define ADAPTERS_DRIVEN_HTTP_DISTRIBUTION_INPUT_ADAPTER_HPP

#include <memory>
#include <string>
#include "../../../core/config/config_manager.hpp"
#include "../../../core/ports/driven/distribution_input_port.hpp"

namespace Adapters::Driven::HTTP {

/// @brief HTTP-адаптер, читающий весь снимок одним GET-запросом
/// к /api/internal/distribution/input на project-service.
class HttpDistributionInputAdapter : public Core::Ports::Driven::IDistributionInputPort {
public:
    HttpDistributionInputAdapter(std::shared_ptr<Core::Config::ConfigManager> config,
                                  int timeout_ms = 30000);

    Core::Ports::Driven::DistributionInputSnapshot Fetch() override;

private:
    std::shared_ptr<Core::Config::ConfigManager> config_;
    int timeout_ms_;

    std::string MakeGetRequest(const std::string& url);
};

} // namespace Adapters::Driven::HTTP

#endif // ADAPTERS_DRIVEN_HTTP_DISTRIBUTION_INPUT_ADAPTER_HPP
