#ifndef CORE_PORTS_DRIVEN_STUDENTS_PORT_HPP
#define CORE_PORTS_DRIVEN_STUDENTS_PORT_HPP

#include <vector>
#include <string>
#include "../../domain/models.hpp"

namespace Core::Ports::Driven {

using namespace Core::Domain;

class IStudentsPort {
public:
    virtual ~IStudentsPort() = default;

    virtual std::vector<Student> GetStudents(const std::string& role = "student") = 0;
};

} // namespace Core::Ports::Driven

#endif // CORE_PORTS_DRIVEN_STUDENTS_PORT_HPP
