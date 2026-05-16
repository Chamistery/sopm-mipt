#include "applications_adapter.hpp"
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <sstream>

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

namespace Adapters::Driven::HTTP {

HttpApplicationsAdapter::HttpApplicationsAdapter(
    std::shared_ptr<Core::Config::ConfigManager> config,
    int timeout_ms)
    : config_(config), timeout_ms_(timeout_ms) {}

std::string HttpApplicationsAdapter::MakeGetRequest(const std::string& url) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize CURL");
    }

    std::string response_body;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, timeout_ms_);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_body);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        curl_easy_cleanup(curl);
        throw std::runtime_error(std::string("CURL error: ") + curl_easy_strerror(res));
    }

    long response_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
    curl_easy_cleanup(curl);

    if (response_code != 200) {
        throw std::runtime_error("HTTP " + std::to_string(response_code));
    }

    return response_body;
}

void HttpApplicationsAdapter::MakePutRequest(const std::string& url, const std::string& body) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize CURL");
    }

    std::string response_body;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, timeout_ms_);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_body);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        throw std::runtime_error(std::string("CURL error: ") + curl_easy_strerror(res));
    }

    long response_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (response_code != 200 && response_code != 204) {
        throw std::runtime_error("HTTP " + std::to_string(response_code));
    }
}

std::vector<Core::Domain::Application> HttpApplicationsAdapter::GetAllApplications() {
    // For now, return empty vector - this would be implemented if needed
    return std::vector<Core::Domain::Application>();
}

std::vector<Core::Domain::Application> HttpApplicationsAdapter::GetApplicationsForProject(int32_t project_id) {
    try {
        std::string endpoint = config_->GetApplicationsEndpoint();
        std::string url = config_->GetApplicationsServiceUrl() + endpoint + "?projectId=" + std::to_string(project_id);

        std::string response = MakeGetRequest(url);

        auto response_json = nlohmann::json::parse(response);
        std::vector<Core::Domain::Application> applications;

        auto data = response_json;
        if (response_json.contains("data")) {
            data = response_json["data"];
        }

        if (data.is_array()) {
            for (const auto& app : data) {
                Core::Domain::Application application;
                application.id = app.value("id", -1);
                application.project_id = app["projectId"];
                application.student_id = app["studentId"];
                application.priority = app["priority"];
                application.status = app.value("status", "pending");
                if (app.contains("teamId") && !app["teamId"].is_null()) {
                    application.team_id = app["teamId"];
                }
                applications.push_back(application);
            }
        }

        return applications;
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("Error fetching applications: ") + e.what());
    }
}

void HttpApplicationsAdapter::UpdateApplicationStatus(const Core::Domain::Application& application) {
    try {
        std::string endpoint = config_->GetApplicationUpdateEndpoint();
        std::string url = config_->GetApplicationsServiceUrl() + endpoint;
        
        size_t id_pos = url.find("{id}");
        if (id_pos != std::string::npos) {
            url.replace(id_pos, 4, std::to_string(application.id));
        }
        
        auto update_json = nlohmann::json();
        update_json["teamId"] = application.team_id.value_or(-1);
        
        MakePutRequest(url, update_json.dump());
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("Error updating application: ") + e.what());
    }
}

} // namespace Adapters::Driven::HTTP
