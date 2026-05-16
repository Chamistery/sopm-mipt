#ifndef CORE_LOGGER_LOGGER_HPP
#define CORE_LOGGER_LOGGER_HPP

#include <iostream>
#include <string>
#include <sstream>
#include <ctime>

namespace Core::Logger {

enum class LogLevel {
    DEBUG,
    INFO,
    WARNING,
    ERROR
};

class Logger {
public:
    Logger() = default;
    
    static void SetLevel(LogLevel level) {
        instance().current_level_ = level;
    }
    
    static void Debug(const std::string& message) {
        Log(LogLevel::DEBUG, message);
    }
    
    static void Info(const std::string& message) {
        Log(LogLevel::INFO, message);
    }
    
    static void Warning(const std::string& message) {
        Log(LogLevel::WARNING, message);
    }
    
    static void Error(const std::string& message) {
        Log(LogLevel::ERROR, message);
    }
    
private:
    static Logger& instance() {
        static Logger logger;
        return logger;
    }
    
    static void Log(LogLevel level, const std::string& message) {
        if (level < instance().current_level_) {
            return;
        }
        
        std::ostringstream oss;
        oss << "[" << GetTimestamp() << "] ";
        oss << "[" << LevelToString(level) << "] ";
        oss << message;
        
        if (level == LogLevel::ERROR) {
            std::cerr << oss.str() << std::endl;
        } else {
            std::cout << oss.str() << std::endl;
        }
    }
    
    static std::string GetTimestamp() {
        auto now = std::time(nullptr);
        auto tm = *std::localtime(&now);
        std::ostringstream oss;
        oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
        return oss.str();
    }
    
    static std::string LevelToString(LogLevel level) {
        switch (level) {
            case LogLevel::DEBUG:
                return "DEBUG";
            case LogLevel::INFO:
                return "INFO";
            case LogLevel::WARNING:
                return "WARN";
            case LogLevel::ERROR:
                return "ERROR";
            default:
                return "UNKNOWN";
        }
    }
    
    LogLevel current_level_ = LogLevel::INFO;
};

} // namespace Core::Logger

#endif // CORE_LOGGER_LOGGER_HPP
