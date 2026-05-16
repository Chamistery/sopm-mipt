#ifndef ADAPTERS_DRIVEN_HTTP_APPLICATIONS_ADAPTER_HPP
#define ADAPTERS_DRIVEN_HTTP_APPLICATIONS_ADAPTER_HPP

#include <string>
#include <vector>
#include <memory>
#include "../../../core/domain/models.hpp"
#include "../../../core/ports/driven/applications_port.hpp"
#include "../../../core/config/config_manager.hpp"

namespace Adapters::Driven::HTTP {

class HttpApplicationsAdapter : public Core::Ports::Driven::IApplicationsPort {
public:
    HttpApplicationsAdapter(std::shared_ptr<Core::Config::ConfigManager> config, int timeout_ms = 5000);

    std::vector<Core::Domain::Application> GetAllApplications() override;
    std::vector<Core::Domain::Application> GetApplicationsForProject(int32_t project_id) override;
    void UpdateApplicationStatus(const Core::Domain::Application& application) override;

private:
    std::shared_ptr<Core::Config::ConfigManager> config_;
    int timeout_ms_;

    std::string MakeGetRequest(const std::string& url);
    void MakePutRequest(const std::string& url, const std::string& body);
};

} // namespace Adapters::Driven::HTTP

#endif // ADAPTERS_DRIVEN_HTTP_APPLICATIONS_ADAPTER_HPP
