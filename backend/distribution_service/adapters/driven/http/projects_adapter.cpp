#include "projects_adapter.hpp"
#include <curl/curl.h>
#include <nlohmann/json.hpp>

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

namespace Adapters::Driven::HTTP {

HttpProjectsAdapter::HttpProjectsAdapter(
    std::shared_ptr<Core::Config::ConfigManager> config,
    int timeout_ms)
    : config_(config), timeout_ms_(timeout_ms) {}

std::string HttpProjectsAdapter::MakeGetRequest(const std::string& url) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize CURL");
    }

    std::string response_body;
    struct curl_slist* headers = nullptr;
    // service-token — единственный канал auth (см. applications_adapter).
    std::string token = config_->GetInternalServiceToken();
    std::string token_header;
    if (!token.empty()) {
        token_header = "X-Internal-Service-Token: " + token;
        headers = curl_slist_append(headers, token_header.c_str());
    }

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, timeout_ms_);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_body);
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

    if (response_code != 200) {
        throw std::runtime_error("HTTP " + std::to_string(response_code));
    }

    return response_body;
}

std::vector<Core::Domain::Project> HttpProjectsAdapter::GetAllProjects() {
    try {
        std::string url = config_->GetProjectsServiceUrl() + config_->GetProjectsEndpoint();
        std::string response = MakeGetRequest(url);

        auto response_json = nlohmann::json::parse(response);
        std::vector<Core::Domain::Project> projects;

        auto data = response_json;
        if (response_json.contains("data")) {
            data = response_json["data"];
        }

        if (data.is_array()) {
            for (const auto& proj : data) {
                Core::Domain::Project project;
                project.id = proj["id"];
                project.num_teams = proj.value("numTeams", 1);
                project.team_size_min = proj.value("teamSizeMin", 3);
                project.team_size_max = proj.value("teamSizeMax", 5);
                project.min_gpa = proj.value("minGpa", 0.0);

                if (proj.contains("courses") && proj["courses"].is_array()) {
                    for (int32_t course : proj["courses"]) {
                        project.courses.push_back(course);
                    }
                }

                if (proj.contains("teams") && proj["teams"].is_array()) {
                    for (const auto& team_obj : proj["teams"]) {
                        Core::Domain::Team team;
                        team.id = team_obj["id"];
                        team.project_id = project.id;
                        team.name = team_obj.value("name", "");
                        team.current_size = 0;
                        project.teams.push_back(team);
                    }
                }

                projects.push_back(project);
            }
        }

        return projects;
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("Error fetching projects: ") + e.what());
    }
}

} // namespace Adapters::Driven::HTTP
