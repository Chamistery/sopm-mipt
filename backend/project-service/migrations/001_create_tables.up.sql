CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    company VARCHAR(255),
    course VARCHAR(50),
    "group" VARCHAR(50),
    avatar TEXT,
    gpa NUMERIC(3,1),
    direction VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Черновик',
    mentor_id INTEGER NOT NULL REFERENCES users(id),
    company VARCHAR(100),
    courses INTEGER[] NOT NULL DEFAULT '{}',
    description TEXT,
    full_description TEXT,
    technologies JSONB NOT NULL DEFAULT '[]',
    team_size_min INTEGER NOT NULL DEFAULT 3,
    team_size_max INTEGER NOT NULL DEFAULT 5,
    num_teams INTEGER NOT NULL DEFAULT 1,
    min_gpa NUMERIC(3,1) DEFAULT 0,
    edu_result TEXT,
    acceptance_criteria TEXT,
    goal TEXT,
    expected_result TEXT,
    competencies TEXT,
    resources TEXT,
    duration_semesters INTEGER NOT NULL DEFAULT 1,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    leader_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_team VARCHAR(100),
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS sprints (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Запланирован',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, number)
);

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    priority INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Ожидает',
    status_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invited_at TIMESTAMP,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, student_id),
    UNIQUE(student_id, priority),
    CHECK (priority >= 1 AND priority <= 5)
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assignee_id INTEGER NOT NULL REFERENCES users(id),
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Ожидает аппрува',
    status_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    was_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    hours_estimate INTEGER NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    mr_link VARCHAR(500),
    work_description TEXT,
    mentor_comments JSONB NOT NULL DEFAULT '[]',
    history JSONB NOT NULL DEFAULT '[]',
    deleted_at TIMESTAMP,
    deleted_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_reports (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    summary TEXT,
    problems TEXT,
    next_plan TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Черновик',
    mentor_comment TEXT,
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, team_id)
);

CREATE TABLE IF NOT EXISTS sprint_scores (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
    comment TEXT,
    scored_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, student_id)
);

CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sprint_id INTEGER REFERENCES sprints(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    conference_link VARCHAR(500),
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    mentor_confirmed BOOLEAN,
    mentor_decline_reason TEXT,
    confirmed_at TIMESTAMP,
    summary TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Ожидает подтверждения',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    telegram VARCHAR(100),
    phone VARCHAR(50),
    about TEXT,
    skills JSONB NOT NULL DEFAULT '[]',
    links JSONB NOT NULL DEFAULT '[]',
    notifications_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_mentor_id ON projects(mentor_id);
CREATE INDEX idx_projects_company ON projects(company);
CREATE INDEX idx_projects_courses ON projects USING GIN(courses);
CREATE INDEX idx_teams_project_id ON teams(project_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_sprints_project_id ON sprints(project_id);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_applications_student_id ON applications(student_id);
CREATE INDEX idx_applications_project_id ON applications(project_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_team_reports_sprint_id ON team_reports(sprint_id);
CREATE INDEX idx_team_reports_team_id ON team_reports(team_id);
CREATE INDEX idx_team_reports_status ON team_reports(status);
CREATE INDEX idx_sprint_scores_sprint_id ON sprint_scores(sprint_id);
CREATE INDEX idx_sprint_scores_student_id ON sprint_scores(student_id);
CREATE INDEX idx_sprint_scores_team_id ON sprint_scores(team_id);
CREATE INDEX idx_meetings_team_id ON meetings(team_id);
CREATE INDEX idx_meetings_sprint_id ON meetings(sprint_id);
CREATE INDEX idx_meetings_meeting_date ON meetings(meeting_date);
CREATE INDEX idx_user_files_user_id ON user_files(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        NEW.status_changed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_reports_updated_at BEFORE UPDATE ON team_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sprint_scores_updated_at BEFORE UPDATE ON sprint_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tasks_status_changed BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_status_changed_at();
CREATE TRIGGER applications_status_changed BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_status_changed_at();
