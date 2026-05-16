#include "distribution_input_adapter.hpp"
#include <curl/curl.h>
#include <nlohmann/json.hpp>

namespace Adapters::Driven::HTTP {

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

HttpDistributionInputAdapter::HttpDistributionInputAdapter(
    std::shared_ptr<Core::Config::ConfigManager> config,
    int timeout_ms)
    : config_(config), timeout_ms_(timeout_ms) {}

std::string HttpDistributionInputAdapter::MakeGetRequest(const std::string& url) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize CURL");
    }

    std::string response_body;
    struct curl_slist* headers = nullptr;
    // service-token — единственный канал auth для этого endpoint'а
    // (он в serviceAllowlist'е middleware/auth.go).
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

Core::Ports::Driven::DistributionInputSnapshot HttpDistributionInputAdapter::Fetch() {
    try {
        // project-service'у /api/internal/distribution/input — собирающий
        // endpoint, есть только под service-token. Запросный URL берём
        // из applications_service_url (он же projects_service_url) —
        // у нас все три указывают на один и тот же project-service.
        std::string url = config_->GetProjectsServiceUrl() + "/api/internal/distribution/input";
        std::string response = MakeGetRequest(url);

        auto response_json = nlohmann::json::parse(response);
        auto data = response_json.contains("data") ? response_json["data"] : response_json;

        Core::Ports::Driven::DistributionInputSnapshot snapshot;

        if (data.contains("projects") && data["projects"].is_array()) {
            for (const auto& proj : data["projects"]) {
                Core::Domain::Project project;
                project.id = proj.value("id", -1);
                project.num_teams = proj.value("numTeams", 1);
                project.team_size_min = proj.value("teamSizeMin", 3);
                project.team_size_max = proj.value("teamSizeMax", 5);
                project.min_gpa = proj.value("minGpa", 0.0);

                if (proj.contains("courses") && proj["courses"].is_array()) {
                    for (int32_t c : proj["courses"]) {
                        project.courses.push_back(c);
                    }
                }

                if (proj.contains("teams") && proj["teams"].is_array()) {
                    for (const auto& team_obj : proj["teams"]) {
                        Core::Domain::Team team;
                        team.id = team_obj.value("id", -1);
                        team.project_id = project.id;
                        team.name = team_obj.value("name", "");
                        team.current_size = 0;
                        project.teams.push_back(team);
                    }
                }

                snapshot.projects.push_back(project);
            }
        }

        if (data.contains("students") && data["students"].is_array()) {
            for (const auto& s : data["students"]) {
                Core::Domain::Student student;
                student.id = s.value("id", -1);
                // course приходит строкой (см. swagger Go-стороны); парсим
                // терпимо.
                if (s.contains("course") && !s["course"].is_null()) {
                    if (s["course"].is_string()) {
                        try {
                            student.course = std::stoi(s["course"].get<std::string>());
                        } catch (...) {
                            student.course = 0;
                        }
                    } else if (s["course"].is_number_integer()) {
                        student.course = s["course"].get<int32_t>();
                    } else {
                        student.course = 0;
                    }
                } else {
                    student.course = 0;
                }
                student.gpa = s.value("gpa", 0.0);
                snapshot.students.push_back(student);
            }
        }

        if (data.contains("applications") && data["applications"].is_array()) {
            for (const auto& app : data["applications"]) {
                Core::Domain::Application application;
                application.id = app.value("id", -1);
                application.project_id = app.value("projectId", -1);
                application.student_id = app.value("studentId", -1);
                application.priority = app.value("priority", 0);
                application.status = app.value("status", std::string("pending"));
                if (app.contains("teamId") && !app["teamId"].is_null()) {
                    application.team_id = app["teamId"];
                }
                snapshot.applications.push_back(application);
            }
        }

        return snapshot;
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("Error fetching distribution input: ") + e.what());
    }
}

} // namespace Adapters::Driven::HTTP
