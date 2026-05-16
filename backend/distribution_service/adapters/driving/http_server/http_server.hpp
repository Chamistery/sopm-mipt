#ifndef HTTP_SERVER_HTTP_SERVER_HPP
#define HTTP_SERVER_HTTP_SERVER_HPP
#include "../../../core/ports/driving/server_port.hpp"
#include <httplib.h>
#include <thread>

namespace Adapters::Driving {
    
    /**
     * HTTP сервер для API распределения
     * Использует httplib (cpp-httplib)
     */
    class HttpServer : public Core::Ports::Driving::IServerPort {
    private:
        bool is_running_;
        int port_;
        httplib::Server server_;
        std::thread listener_thread_;

    public:
        HttpServer();
        virtual ~HttpServer();

        void AddGetHandler(
            const std::string& endpoint,
            Core::Ports::Driving::HttpHandler handler) override;
        
        void Start(int port = 8080) override;
        void Stop() override;
        bool IsRunning() const override;
    };
}
#endif // HTTP_SERVER_HTTP_SERVER_HPP
