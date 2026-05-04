#include "students_adapter.hpp"
#include <curl/curl.h>
#include <nlohmann/json.hpp>

namespace Adapters::Driven::HTTP {

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    userp->append((char*)contents, size * nmemb);
    return size * nmemb;
}

HttpStudentsAdapter::HttpStudentsAdapter(
    std::shared_ptr<Core::Config::ConfigManager> config,
    int timeout_ms)
    : config_(config), timeout_ms_(timeout_ms) {}

std::string HttpStudentsAdapter::MakeGetRequest(const std::string& url) {
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

std::vector<Core::Domain::Student> HttpStudentsAdapter::GetStudents(const std::string& role) {
    try {
        std::string url = config_->GetUsersServiceUrl() + config_->GetUsersEndpoint();
        url += "?role=" + role;

        std::string response = MakeGetRequest(url);

        auto response_json = nlohmann::json::parse(response);
        std::vector<Core::Domain::Student> students;

        auto data = response_json;
        if (response_json.contains("data")) {
            data = response_json["data"];
        }

        if (data.is_array()) {
            for (const auto& user : data) {
                Core::Domain::Student student;
                student.id = user["id"];
                student.course = user.value("course", 1);
                student.gpa = user.value("gpa", 3.0);
                students.push_back(student);
            }
        }

        return students;
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("Error fetching students: ") + e.what());
    }
}

} // namespace Adapters::Driven::HTTP
