#ifndef ADAPTERS_DRIVEN_HTTP_PROJECTS_ADAPTER_HPP
#define ADAPTERS_DRIVEN_HTTP_PROJECTS_ADAPTER_HPP

#include <string>
#include <vector>
#include <memory>
#include "../../../core/domain/models.hpp"
#include "../../../core/ports/driven/projects_port.hpp"
#include "../../../core/config/config_manager.hpp"

namespace Adapters::Driven::HTTP {

class HttpProjectsAdapter : public Core::Ports::Driven::IProjectsPort {
public:
    HttpProjectsAdapter(std::shared_ptr<Core::Config::ConfigManager> config, int timeout_ms = 5000);

    std::vector<Core::Domain::Project> GetAllProjects() override;

private:
    std::shared_ptr<Core::Config::ConfigManager> config_;
    int timeout_ms_;

    std::string MakeGetRequest(const std::string& url);
};

} // namespace Adapters::Driven::HTTP

#endif // ADAPTERS_DRIVEN_HTTP_PROJECTS_ADAPTER_HPP
