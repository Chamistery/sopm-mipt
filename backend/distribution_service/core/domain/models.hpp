#ifndef CORE_DOMAIN_MODELS_HPP
#define CORE_DOMAIN_MODELS_HPP

#include <vector>
#include <unordered_map>
#include <string>
#include <cstdint>
#include <optional>

namespace Core::Domain {

/// @brief Студент
struct Student {
    int32_t id;
    int32_t course;
    double gpa;
};

/// @brief Группа в проекте
struct Team {
    int32_t id;
    int32_t project_id;
    std::string name;
    int32_t current_size;
};

/// @brief Проект
struct Project {
    int32_t id;
    int32_t num_teams;
    int32_t team_size_min;
    int32_t team_size_max;
    double min_gpa;
    std::vector<int32_t> courses;
    std::vector<Team> teams;
};

/// @brief Заявка студента на проект
struct Application {
    int32_t id;
    int32_t project_id;
    int32_t student_id;
    int32_t priority;
    std::string status;
    std::optional<int32_t> team_id;
};

} // namespace Core::Domain

#endif // CORE_DOMAIN_MODELS_HPP
