#include <memory>
#include <thread>
#include <chrono>
#include <nlohmann/json.hpp>
#include "./core/config/config_manager.hpp"
#include "./core/logger/logger.hpp"
#include "./core/services/distribution_service.hpp"
#include "./algorithms/gale_shapley.hpp"
#include "./adapters/driving/http_server/http_server.hpp"
#include "./adapters/driven/http/distribution_input_adapter.hpp"

using json = nlohmann::json;

/**
 * Точка входа для сервиса распределения студентов.
 *
 * Архитектурно сервис работает как «чистый калькулятор»: на /start
 * читает данные из project-service, прогоняет Гейля-Шепли и возвращает
 * полные списки recommended/not_recommended вызывающей стороне. В БД
 * результат применяет project-service в транзакции — это даёт
 * атомарность и защиту ручных решений ментора (mentor_accepted/accepted).
 */

static std::shared_ptr<Core::Services::DistributionService> CreateDistributionService(
    std::shared_ptr<Core::Config::ConfigManager> config) {

    Core::Logger::Logger::Info("Creating distribution service dependencies");

    int timeout = config->GetHttpTimeout();
    auto input_adapter = std::make_shared<Adapters::Driven::HTTP::HttpDistributionInputAdapter>(config, timeout);
    auto service = std::make_shared<Core::Services::DistributionService>(input_adapter);

    Core::Logger::Logger::Info("Distribution service created successfully");
    return service;
}

static json SerializeApplication(const Core::Domain::Application& app) {
    json item;
    item["id"] = app.id;
    item["projectId"] = app.project_id;
    item["studentId"] = app.student_id;
    item["priority"] = app.priority;
    item["status"] = app.status;
    if (app.team_id.has_value()) {
        item["teamId"] = app.team_id.value();
    } else {
        item["teamId"] = nullptr;
    }
    return item;
}

int main(int argc, char* argv[]) {
    try {
        auto config = std::make_shared<Core::Config::ConfigManager>();

        std::string config_path = "config/distribution_service.json";
        if (argc > 1) {
            config_path = argv[1];
        }

        if (!config->LoadFromFile(config_path)) {
            Core::Logger::Logger::Warning("Could not load config from " + config_path +
                            ", using defaults and environment variables");
        } else {
            Core::Logger::Logger::Info("Configuration loaded from " + config_path);
        }

        std::string log_level = config->GetLogLevel();
        if (log_level == "DEBUG") {
            Core::Logger::Logger::SetLevel(Core::Logger::LogLevel::DEBUG);
        } else if (log_level == "WARNING") {
            Core::Logger::Logger::SetLevel(Core::Logger::LogLevel::WARNING);
        } else if (log_level == "ERROR") {
            Core::Logger::Logger::SetLevel(Core::Logger::LogLevel::ERROR);
        } else {
            Core::Logger::Logger::SetLevel(Core::Logger::LogLevel::INFO);
        }

        Core::Logger::Logger::Info("=== Distribution Service Started ===");
        Core::Logger::Logger::Info("Config: http_port=" + std::to_string(config->GetHttpPort()));
        Core::Logger::Logger::Info("Config: projects_service_url=" + config->GetProjectsServiceUrl());
        Core::Logger::Logger::Info("Config: students_service_url=" + config->GetUsersServiceUrl());
        Core::Logger::Logger::Info("Config: applications_service_url=" + config->GetApplicationsServiceUrl());
        Core::Logger::Logger::Info(std::string("Config: internal_service_token=") +
            (config->GetInternalServiceToken().empty() ? "(not set)" : "(set)"));

        auto distribution_service = CreateDistributionService(config);
        auto http_server = std::make_shared<Adapters::Driving::HttpServer>();

        // /api/distribution/start — синхронный прогон алгоритма. Возвращает
        // полные списки заявок с новыми статусами и team_id; project-service
        // применяет их в транзакции.
        http_server->AddGetHandler("/api/distribution/start", [distribution_service]() {
            Core::Logger::Logger::Info("Distribution API called: /api/distribution/start");

            try {
                auto distribution = distribution_service->ExecuteDistribution();

                json recommended = json::array();
                for (const auto& app : distribution.recommended) {
                    recommended.push_back(SerializeApplication(app));
                }

                json not_recommended = json::array();
                for (const auto& app : distribution.not_recommended) {
                    not_recommended.push_back(SerializeApplication(app));
                }

                json response;
                response["status"] = "success";
                response["recommended_count"] = distribution.recommended.size();
                response["not_recommended_count"] = distribution.not_recommended.size();
                response["recommended"] = recommended;
                response["not_recommended"] = not_recommended;

                Core::Logger::Logger::Info("Distribution completed: " +
                    std::to_string(distribution.recommended.size()) + " recommended, " +
                    std::to_string(distribution.not_recommended.size()) + " not_recommended");

                return Core::Ports::Driving::HttpResponse{
                    200,
                    response.dump(),
                    "application/json"
                };
            } catch (const std::exception& e) {
                Core::Logger::Logger::Error("Distribution failed: " + std::string(e.what()));
                json err;
                err["status"] = "error";
                err["message"] = e.what();
                return Core::Ports::Driving::HttpResponse{
                    500,
                    err.dump(),
                    "application/json"
                };
            }
        });

        http_server->AddGetHandler("/api/distribution/status", []() {
            json response;
            response["status"] = "ready";
            response["message"] = "Distribution service is ready";
            return Core::Ports::Driving::HttpResponse{
                200,
                response.dump(),
                "application/json"
            };
        });

        int http_port = config->GetHttpPort();
        Core::Logger::Logger::Info("Starting HTTP server on port " + std::to_string(http_port));
        http_server->Start(http_port);

        Core::Logger::Logger::Info("Distribution service is running. Press Ctrl+C to stop.");
        while (http_server->IsRunning()) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }

        Core::Logger::Logger::Info("=== Distribution Service Stopped ===");
        return 0;

    } catch (const std::exception& e) {
        Core::Logger::Logger::Error("Fatal error: " + std::string(e.what()));
        return 1;
    }
}
