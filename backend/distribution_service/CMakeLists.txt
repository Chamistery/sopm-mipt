cmake_minimum_required(VERSION 3.10)
project(DistributionService)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Зависимости
find_package(CURL REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(httplib REQUIRED)

# Исходные файлы
set(SOURCES
    main.cpp
    
    # Core
    core/config/config_manager.cpp
    core/services/distribution_service.cpp
    
    # Algorithms
    algorithms/gale_shapley.cpp
    
    # Adapters - HTTP
    adapters/driven/http/applications_adapter.cpp
    adapters/driven/http/projects_adapter.cpp
    adapters/driven/http/students_adapter.cpp
    
    # Adapters - Driving
    adapters/driving/http_server/http_server.cpp
)

# Заголовочные файлы
set(INCLUDES
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Создать исполняемый файл
add_executable(distribution_service ${SOURCES})

# Включить директории с заголовками
target_include_directories(distribution_service PRIVATE ${INCLUDES})

# Линковать библиотеки
target_link_libraries(distribution_service
    PRIVATE
        CURL::libcurl
        nlohmann_json::nlohmann_json
        httplib::httplib
        pthread
)

# Копировать конфиг при сборке
add_custom_command(TARGET distribution_service POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory 
        "$<TARGET_FILE_DIR:distribution_service>/config"
    COMMAND ${CMAKE_COMMAND} -E copy
        "${CMAKE_CURRENT_SOURCE_DIR}/config/distribution_service.json"
        "$<TARGET_FILE_DIR:distribution_service>/config/distribution_service.json"
    COMMENT "Copying configuration file"
)

# Копировать директорию логов
add_custom_command(TARGET distribution_service POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory 
        "$<TARGET_FILE_DIR:distribution_service>/logs"
    COMMENT "Creating logs directory"
)

# Информация о сборке
message(STATUS "Distribution Service")
message(STATUS "C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
