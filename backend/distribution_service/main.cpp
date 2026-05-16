#include <iostream>
#include <memory>
#include <nlohmann/json.hpp>
#include "./core/config/config_manager.hpp"
#include "./core/logger/logger.hpp"
#include "./core/services/distribution_service.hpp"
#include "./algorithms/gale_shapley.hpp"
#include "./adapters/driving/http_server/http_server.hpp"
#include "./adapters/driven/http/applications_adapter.hpp"
#include "./adapters/driven/http/projects_adapter.hpp"
#include "./adapters/driven/http/students_adapter.hpp"

using json = nlohmann::json;

/**
 * Точка входа для сервиса распределения студентов
 * 
 * Использует гексагональную архитектуру:
 * - Core: бизнес-логика, алгоритмы, модели
 * - Adapters: HTTP, конфиг, логгирование
 * - Ports: интерфейсы для взаимодействия
 */

std::shared_ptr<Core::Services::DistributionService> CreateDistributionService(
    const Core::Config::ConfigManager& config) {
    
    Core::Logger::Logger::Info("Creating distribution service dependencies");

    // Создать адаптеры для работы с внешними сервисами
    auto applications_adapter = std::make_shared<Adapters::Driven::HTTP::HttpApplicationsAdapter>(
        config.GetApplicationsServiceUrl(),
        config.GetHttpTimeout());

    auto projects_adapter = std::make_shared<Adapters::Driven::HTTP::HttpProjectsAdapter>(
        config.GetProjectsServiceUrl(),
        config.GetHttpTimeout());

    auto students_adapter = std::make_shared<Adapters::Driven::HTTP::HttpStudentsAdapter>(
        config.GetUsersServiceUrl(),
        config.GetHttpTimeout());

    // Создать алгоритм распределения
    auto algorithm = std::make_shared<Core::Algorithms::DistributionAlgorithm>();

    // Создать сервис
    auto service = std::make_shared<Core::Services::DistributionService>(
        applications_adapter,
        projects_adapter,
        students_adapter,
        algorithm);

    Core::Logger::Logger::Info("Distribution service created successfully");
    return service;
}

int main(int argc, char* argv[]) {
    try {
        // Загрузить конфигурацию
        Core::Config::ConfigManager config;
        
        // Определить путь к конфиг-файлу
        std::string config_path = "config/distribution_service.json";
        if (argc > 1) {
            config_path = argv[1];
        }

        if (!config.LoadFromFile(config_path)) {
            Core::Logger::Logger::Warning("Could not load config from " + config_path + 
                            ", using defaults and environment variables");
        } else {
            Core::Logger::Logger::Info("Configuration loaded from " + config_path);
        }

        // Инициализировать логирование
        std::string log_level = config.GetLogLevel();
        if (log_level == "DEBUG") {
            Core::Logger::Logger::SetLevel(Core::Logger::LogLevel::DEBUG);
        } else if (log_level == "WARNING") {
            Core::Logger::Logger::SetLevel(Core::Logger::LogLevel::WARNING);
        } else if (log_level == "ERROR") {
            Core::Logger::Logger::SetLevel(Core::Logger::LogLevel::ERROR);
        } else {
            Core::Logger::Logger::SetLevel(Core::Logger::LogLevel::INFO);
        }

        //Core::Logger::Logger::SetOutputFile(config.GetLogFile());
        Core::Logger::Logger::Info("=== Distribution Service Started ===");
        Core::Logger::Logger::Info("Config: http_port=" + std::to_string(config.GetHttpPort()));
        Core::Logger::Logger::Info("Config: projects_service_url=" + config.GetProjectsServiceUrl());
        Core::Logger::Logger::Info("Config: students_service_url=" + config.GetUsersServiceUrl());
        Core::Logger::Logger::Info("Config: applications_service_url=" + config.GetApplicationsServiceUrl());

        // Создать сервис
        auto distribution_service = CreateDistributionService(config);

        // Создать HTTP сервер
        auto http_server = std::make_shared<Adapters::Driving::HttpServer>();

        // Зарегистрировать обработчик для запуска распределения
        http_server->AddGetHandler("/api/distribution/start", [distribution_service]() {
            Core::Logger::Logger::Info("Distribution API called: /api/distribution/start");

            auto distribution = distribution_service->ExecuteDistribution();
            json response;
            response["status"] = "success";
            response["recommended_count"] = distribution.recommended.size();
            response["not_recommended_count"] = distribution.not_recommended.size();

            return Core::Ports::Driving::HttpResponse{
                200,
                response.dump(),
                "application/json"
            };
        });

        // Зарегистрировать обработчик для проверки статуса
        http_server->AddGetHandler("/api/distribution/status", []() {
            json response;
            response["status"] = "running";
            response["message"] = "Distribution service is ready";

            return Core::Ports::Driving::HttpResponse{
                200,
                response.dump(),
                "application/json"
            };
        });

        // Запустить HTTP сервер
        int http_port = config.GetHttpPort();
        Core::Logger::Logger::Info("Starting HTTP server on port " + std::to_string(http_port));
        http_server->Start(http_port);

        // Держать сервер в работе
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
