#ifndef CORE_CONFIG_CONFIG_MANAGER_HPP
#define CORE_CONFIG_CONFIG_MANAGER_HPP

#include <string>
#include <map>
#include <optional>

namespace Core::Config {

/// @brief Конфигурация сервиса распределения
/// @details Загружается из JSON файла с переопределением через переменные окружения (DIST_SERVICE_*)
class ConfigManager {
private:
    std::map<std::string, std::string> config_;
    static constexpr const char* ENV_PREFIX = "DIST_SERVICE_";

    /// @param key название параметра
    /// @return значение из переменной окружения или пусто
    std::optional<std::string> GetFromEnv(const std::string& key) const;

    /// @param key название параметра
    /// @param default_value значение по умолчанию
    /// @return значение из env > конфига > default
    std::string GetValue(const std::string& key, const std::string& default_value = "") const;

public:
    ConfigManager() = default;
    virtual ~ConfigManager() = default;

    /// @param config_path путь к JSON конфигу
    /// @return true если успешно загружено
    bool LoadFromFile(const std::string& config_path);

    /// @return HTTP порт сервера
    int GetHttpPort() const;

    /// @return URL Projects Service
    std::string GetProjectsServiceUrl() const;

    /// @return Endpoint для получения всех проектов
    std::string GetProjectsEndpoint() const;

    /// @return Endpoint для получения проекта по ID
    std::string GetProjectEndpoint() const;

    /// @return URL Users Service
    std::string GetUsersServiceUrl() const;

    /// @return Endpoint для получения списка студентов
    std::string GetUsersEndpoint() const;

    /// @return URL Applications Service
    std::string GetApplicationsServiceUrl() const;

    /// @return Endpoint для получения заявок проекта
    std::string GetApplicationsEndpoint() const;

    /// @return Service-token для авторизации в project-service
    /// @details Если пустой — заголовок не отправляется; project-service
    /// тогда тоже не должен ожидать его (auth полностью на X-User-* хедерах).
    std::string GetInternalServiceToken() const;

    /// @return Таймаут HTTP запросов (ms)
    int GetHttpTimeout() const;

    /// @return уровень логирования
    std::string GetLogLevel() const;

    /// @return путь к файлу логов
    std::string GetLogFile() const;

    /// @param key название параметра
    /// @param default_value значение по умолчанию
    /// @return произвольное значение конфига
    std::string Get(const std::string& key, const std::string& default_value = "") const;

    /// @param key название параметра
    /// @param value новое значение
    void Set(const std::string& key, const std::string& value);
};

} // namespace Core::Config

#endif // CORE_CONFIG_CONFIG_MANAGER_HPP