#ifndef CORE_PORTS_DRIVING_SERVER_PORT_HPP
#define CORE_PORTS_DRIVING_SERVER_PORT_HPP

#include <functional>
#include <string>

namespace Core::Ports::Driving {

struct HttpResponse {
    int status_code = 200;
    std::string body;
    std::string content_type = "application/json";
};

using HttpHandler = std::function<HttpResponse()>;

/// @brief Порт для HTTP сервера
class IServerPort {
public:
    virtual ~IServerPort() = default;
    
    /// @param path путь endpoint-а
    /// @param handler функция обработчик
    virtual void AddGetHandler(const std::string& path, HttpHandler handler) = 0;
    
    /// @param port номер порта для запуска
    virtual void Start(int port = 8080) = 0;
    
    /// @brief Остановить сервер
    virtual void Stop() = 0;
    
    /// @return true если сервер работает
    virtual bool IsRunning() const = 0;
};

} // namespace Core::Ports::Driving

#endif // CORE_PORTS_DRIVING_SERVER_PORT_HPP
