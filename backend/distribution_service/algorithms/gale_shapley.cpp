#include "gale_shapley.hpp"
#include <algorithm>
#include <unordered_map>

namespace Core::Algorithms {

bool DistributionAlgorithm::StudentMeetsRequirements(
    const Student& student,
    const Project& project) const {
    
    // Проверить курс
    if (!project.courses.empty()) {
        auto course_match = std::find(
            project.courses.begin(),
            project.courses.end(),
            student.course) != project.courses.end();
        if (!course_match) {
            return false;
        }
    }

    // Проверить минимальный ГПА
    if (student.gpa < project.min_gpa) {
        return false;
    }

    return true;
}

int32_t DistributionAlgorithm::GetLowestGpaStudent(const ProjectState& proj_state) const {
    int32_t lowest_student = -1;
    int32_t lowest_gpa = INT32_MAX;

    for (const auto& [student_id, gpa] : proj_state.student_gpa) {
        if (gpa < lowest_gpa) {
            lowest_gpa = gpa;
            lowest_student = student_id;
        }
    }

    return lowest_student;
}

std::unordered_map<int32_t, std::vector<int32_t>> DistributionAlgorithm::DistributeToProjects(
    const std::vector<Application>& applications,
    const std::vector<Project>& projects,
    const std::vector<Student>& students,
    std::vector<Application>& not_recommended) {
    
    std::unordered_map<int32_t, std::vector<int32_t>> project_students; // project_id -> [student_ids]
    std::unordered_map<int32_t, ProjectState> project_states;

    // Инициализировать состояние проектов
    for (const auto& project : projects) {
        ProjectState state;
        state.project_id = project.id;
        state.total_capacity = project.num_teams * project.team_size_max;
        project_states[project.id] = state;
        project_students[project.id] = std::vector<int32_t>();
    }

    // Создать map студентов для быстрого доступа
    std::unordered_map<int32_t, const Student*> student_map;
    for (const auto& student : students) {
        student_map[student.id] = &student;
    }

    // Группировать заявки по приоритетам
    std::map<int32_t, std::vector<const Application*>> applications_by_priority;
    for (const auto& app : applications) {
        applications_by_priority[app.priority].push_back(&app);
    }

    // Обработать каждый приоритет
    for (const auto& [priority, apps_at_priority] : applications_by_priority) {
        // Сортировать заявки в приоритете по GPA студента в убывающем порядке
        auto sorted_apps = apps_at_priority;
        std::sort(sorted_apps.begin(), sorted_apps.end(), 
            [&student_map](const Application* a, const Application* b) {
                auto student_a = student_map[a->student_id];
                auto student_b = student_map[b->student_id];
                return student_a->gpa > student_b->gpa;
            });

        // Обработать каждую заявку
        for (const auto* app : sorted_apps) {
            const auto* student = student_map[app->student_id];
            const auto project_it = std::find_if(projects.begin(), projects.end(),
                [app](const Project& p) { return p.id == app->project_id; });
            
            if (project_it == projects.end()) {
                Application rejected = *app;
                rejected.status = "not_recommended";
                rejected.team_id = std::nullopt;
                not_recommended.push_back(rejected);
                continue;
            }

            const auto& project = *project_it;
            auto& proj_state = project_states[project.id];

            // Проверить соответствие требованиям (курс, минимальный GPA)
            if (!StudentMeetsRequirements(*student, project)) {
                Application rejected = *app;
                rejected.status = "unqualified";
                rejected.team_id = std::nullopt;
                not_recommended.push_back(rejected);
                continue;
            }

            // Преобразовать GPA в int для сравнения (gpa * 100)
            int32_t student_gpa_int = static_cast<int32_t>(student->gpa * 100);

            // Если проект не полон - добавить студента
            if (proj_state.current_count < proj_state.total_capacity) {
                proj_state.student_gpa[student->id] = student_gpa_int;
                proj_state.current_count++;
                project_students[project.id].push_back(student->id);
            } 
            // Если проект полон - проверить GPA конкуренцию
            else {
                int32_t lowest_student = GetLowestGpaStudent(proj_state);
                int32_t lowest_gpa = proj_state.student_gpa[lowest_student];

                if (student_gpa_int > lowest_gpa) {
                    // Заменить студента с наименьшим GPA
                    auto lowest_it = std::find(project_students[project.id].begin(),
                                              project_students[project.id].end(),
                                              lowest_student);
                    if (lowest_it != project_students[project.id].end()) {
                        *lowest_it = student->id;
                    }
                    proj_state.student_gpa.erase(lowest_student);
                    proj_state.student_gpa[student->id] = student_gpa_int;

                    // Добавить вытесненного студента в not_recommended
                    Application not_rec_app = *app;
                    not_rec_app.student_id = lowest_student;
                    not_rec_app.team_id = std::nullopt;
                    not_rec_app.status = "not_recommended";
                    not_recommended.push_back(not_rec_app);
                } else {
                    // Новый студент не берётся
                    Application rejected = *app;
                    rejected.status = "not_recommended";
                    rejected.team_id = std::nullopt;
                    not_recommended.push_back(rejected);
                }
            }
        }
    }

    return project_students;
}

void DistributionAlgorithm::AllocateToTeams(
    const std::unordered_map<int32_t, std::vector<int32_t>>& project_students,
    const std::vector<Project>& projects,
    const std::vector<Student>& students,
    std::vector<Application>& applications) {
    
    // Создать map студентов для быстрого доступа
    std::unordered_map<int32_t, const Student*> student_map;
    for (const auto& student : students) {
        student_map[student.id] = &student;
    }

    // Для каждого проекта распределить студентов в команды
    for (const auto& [project_id, student_ids] : project_students) {
        const auto project_it = std::find_if(projects.begin(), projects.end(),
            [project_id](const Project& p) { return p.id == project_id; });
        
        if (project_it == projects.end()) continue;
        
        const auto& project = *project_it;

        // Отсортировать студентов по GPA в убывающем порядке
        auto sorted_students = student_ids;
        std::sort(sorted_students.begin(), sorted_students.end(),
            [&student_map](int32_t a, int32_t b) {
                return student_map[a]->gpa > student_map[b]->gpa;
            });

        // Распределить студентов в команды
        int32_t team_idx = 0;
        int32_t students_in_current_team = 0;

        for (int32_t student_id : sorted_students) {
            if (team_idx >= project.teams.size()) {
                break; // Команды закончились
            }

            // Переместить на следующую команду если текущая полна
            if (students_in_current_team >= project.team_size_max) {
                team_idx++;
                students_in_current_team = 0;
                if (team_idx >= project.teams.size()) {
                    break;
                }
            }

            const auto& team = project.teams[team_idx];

            // Найти соответствующую заявку и обновить team_id
            for (auto& app : applications) {
                if (app.project_id == project_id && 
                    app.student_id == student_id && 
                    !app.team_id.has_value()) {
                    app.team_id = team.id;
                    students_in_current_team++;
                    break;
                }
            }
        }
    }
}

DistributionAlgorithm::Result DistributionAlgorithm::Distribute(
    const std::vector<Application>& applications,
    const std::vector<Project>& projects,
    const std::vector<Student>& students) {
    
    Result result;
    result.recommended.clear();
    result.not_recommended.clear();

    // Первый этап: распределение на проекты
    auto project_students = DistributeToProjects(applications, projects, students, result.not_recommended);

    // Создать список рекомендованных с пустыми team_id
    for (const auto& [project_id, student_ids] : project_students) {
        for (int32_t student_id : student_ids) {
            // Найти оригинальную заявку
            for (const auto& app : applications) {
                if (app.project_id == project_id && app.student_id == student_id) {
                    Application rec_app = app;
                    rec_app.team_id = std::nullopt;
                    rec_app.status = "recommended";
                    result.recommended.push_back(rec_app);
                    break;
                }
            }
        }
    }

    // Второй этап: распределение в команды
    AllocateToTeams(project_students, projects, students, result.recommended);

    return result;
}

} // namespace Core::Algorithms
