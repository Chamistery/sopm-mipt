#include "../config/config_manager.hpp"
#include <fstream>
#include <sstream>
#include <cstdlib>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace Core::Config {

std::optional<std::string> ConfigManager::GetFromEnv(const std::string& key) const {
    std::string env_var = ENV_PREFIX + key;
    const char* value = std::getenv(env_var.c_str());
    if (value) {
        return std::string(value);
    }
    return std::nullopt;
}

std::string ConfigManager::GetValue(
    const std::string& key,
    const std::string& default_value) const {
    
    auto env_value = GetFromEnv(key);
    if (env_value) {
        return env_value.value();
    }

    auto config_it = config_.find(key);
    if (config_it != config_.end()) {
        return config_it->second;
    }

    return default_value;
}

bool ConfigManager::LoadFromFile(const std::string& config_path) {
    try {
        std::ifstream config_file(config_path);
        if (!config_file.is_open()) {
            return false;
        }

        json config_json;
        config_file >> config_json;

        for (const auto& [key, value] : config_json.items()) {
            if (value.is_string()) {
                config_[key] = value.get<std::string>();
            } else if (value.is_number_integer()) {
                config_[key] = std::to_string(value.get<int>());
            } else {
                config_[key] = value.dump();
            }
        }

        return true;
    } catch (const std::exception& e) {
        return false;
    }
}

int ConfigManager::GetHttpPort() const {
    try {
        return std::stoi(GetValue("http_port", "8080"));
    } catch (...) {
        return 8080;
    }
}

std::string ConfigManager::GetProjectsServiceUrl() const {
    return GetValue("projects_service_url", "http://localhost:8080");
}

std::string ConfigManager::GetProjectsEndpoint() const {
    return GetValue("projects_endpoint", "/api/projects");
}

std::string ConfigManager::GetProjectEndpoint() const {
    return GetValue("project_endpoint", "/api/projects/{id}");
}

std::string ConfigManager::GetUsersServiceUrl() const {
    return GetValue("users_service_url", "http://localhost:8080");
}

std::string ConfigManager::GetUsersEndpoint() const {
    return GetValue("users_endpoint", "/api/users");
}

std::string ConfigManager::GetApplicationsServiceUrl() const {
    return GetValue("applications_service_url", "http://localhost:8080");
}

std::string ConfigManager::GetApplicationsEndpoint() const {
    return GetValue("applications_endpoint", "/api/applications/project");
}

std::string ConfigManager::GetApplicationUpdateEndpoint() const {
    return GetValue("application_update_endpoint", "/api/applications/{id}/recommend");
}

int ConfigManager::GetHttpTimeout() const {
    try {
        return std::stoi(GetValue("http_timeout_ms", "30000"));
    } catch (...) {
        return 30000;
    }
}

std::string ConfigManager::GetLogLevel() const {
    return GetValue("log_level", "INFO");
}

std::string ConfigManager::GetLogFile() const {
    return GetValue("log_file", "./logs/distribution_service.log");
}

std::string ConfigManager::Get(
    const std::string& key,
    const std::string& default_value) const {
    return GetValue(key, default_value);
}

void ConfigManager::Set(const std::string& key, const std::string& value) {
    config_[key] = value;
}

} // namespace Core::Config
