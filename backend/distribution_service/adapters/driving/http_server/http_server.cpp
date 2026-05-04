#include "http_server.hpp"
#include "../../../core/logger/logger.hpp"

using namespace Core::Logger;

namespace Adapters::Driving {

    HttpServer::HttpServer() 
        : is_running_(false), port_(0) {
        Logger::Info("HTTP server created");
    }

    HttpServer::~HttpServer() {
        if (is_running_) {
            Stop();
        }
        Logger::Info("HTTP server destructed");
    }

    void HttpServer::AddGetHandler(
        const std::string& endpoint,
        Core::Ports::Driving::HttpHandler handler) {
        
        server_.Get(endpoint, [handler](const httplib::Request& /*req*/, httplib::Response& res) {
            try {
                auto response = handler();
                res.status = response.status_code;
                res.set_content(response.body, response.content_type.c_str());
            } catch (const std::exception& e) {
                res.status = 500;
                res.set_content("Internal Server Error", "text/plain");
                Logger::Error("Handler exception: " + std::string(e.what()));
            }
        });

        Logger::Debug("Handler added for GET " + endpoint);
    }

    void HttpServer::Start(int port) {
        if (is_running_) {
            Logger::Warning("HTTP server already started");
            return;
        }

        is_running_ = true;
        port_ = port;

        listener_thread_ = std::thread([this]() {
            Logger::Info("HTTP server started on port " + std::to_string(port_));
            server_.listen("0.0.0.0", port_);
            Logger::Info("HTTP server stopped");
        });

        // Дать серверу время на старт
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    void HttpServer::Stop() {
        if (!is_running_) {
            return;
        }

        is_running_ = false;
        server_.stop();

        if (listener_thread_.joinable()) {
            listener_thread_.join();
        }

        Logger::Info("HTTP server shutdown complete");
    }

    bool HttpServer::IsRunning() const {
        return is_running_;
    }

} // namespace Adapters::Driving
