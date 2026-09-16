CREATE TABLE users (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    institution VARCHAR(150) NULL,
    theme_mode ENUM('light', 'dark') NOT NULL DEFAULT 'light',
    preferred_gpa_scale DECIMAL(3,1) NOT NULL DEFAULT 12.0,
    default_reminder_days INT UNSIGNED NOT NULL DEFAULT 3,
    default_reminder_method ENUM('email', 'whatsapp') NOT NULL DEFAULT 'email',
    password_hash VARCHAR(255) NOT NULL,
    gpa DECIMAL(4,2) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('student', 'admin')),
    CONSTRAINT chk_users_theme CHECK (theme_mode IN ('light', 'dark')),
    CONSTRAINT chk_users_gpa_scale CHECK (preferred_gpa_scale IN (4.0, 12.0)),
    CONSTRAINT chk_users_default_reminder_days CHECK (default_reminder_days <= 365),
    CONSTRAINT chk_users_default_reminder_method CHECK (
        default_reminder_method IN ('email', 'whatsapp')
    ),
    CONSTRAINT chk_users_gpa CHECK (gpa IS NULL OR (gpa >= 0.00 AND gpa <= 12.00))
);

CREATE TABLE courses (
    course_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    professor_name VARCHAR(100) NULL,
    term VARCHAR(30) NOT NULL,
    office_hours VARCHAR(255) NULL,
    meeting_times VARCHAR(255) NULL,
    room VARCHAR(80) NULL,
    textbook_link VARCHAR(500) NULL,
    gpa_goal DECIMAL(4,2) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_courses_user_code_term UNIQUE (user_id, course_code, term),
    CONSTRAINT chk_courses_gpa_goal CHECK (
        gpa_goal IS NULL OR (gpa_goal >= 0.00 AND gpa_goal <= 12.00)
    ),
    CONSTRAINT fk_courses_user FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE activity_categories (
    activity_category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    activity_category_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_activity_categories_name UNIQUE (activity_category_name)
);

CREATE TABLE activities (
    activity_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    activity_category_id INT UNSIGNED NOT NULL,
    activity_name VARCHAR(150) NOT NULL,
    due_date DATETIME NOT NULL,
    grading_weight DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    reminder_date DATETIME NULL,
    reminder_method ENUM('email', 'whatsapp') NOT NULL DEFAULT 'email',
    priority_level ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    grade DECIMAL(5,2) NULL,
    status ENUM('not_started', 'in_progress', 'submitted', 'graded')
        NOT NULL DEFAULT 'not_started',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_activities_course_name_due UNIQUE (course_id, activity_name, due_date),
    CONSTRAINT chk_activities_weight CHECK (
        grading_weight >= 0.00 AND grading_weight <= 100.00
    ),
    CONSTRAINT chk_activities_reminder_date CHECK (
        reminder_date IS NULL OR reminder_date <= due_date
    ),
    CONSTRAINT chk_activities_reminder_method CHECK (
        reminder_method IN ('email', 'whatsapp')
    ),
    CONSTRAINT chk_activities_priority CHECK (
        priority_level IN ('low', 'medium', 'high')
    ),
    CONSTRAINT chk_activities_grade CHECK (
        grade IS NULL OR (grade >= 0.00 AND grade <= 100.00)
    ),
    CONSTRAINT chk_activities_status CHECK (
        status IN ('not_started', 'in_progress', 'submitted', 'graded')
    ),
    CONSTRAINT fk_activities_course FOREIGN KEY (course_id)
        REFERENCES courses (course_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_activities_category FOREIGN KEY (activity_category_id)
        REFERENCES activity_categories (activity_category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_courses_user_id ON courses (user_id);
CREATE INDEX idx_activities_course_id ON activities (course_id);
CREATE INDEX idx_activities_category_id ON activities (activity_category_id);
CREATE INDEX idx_activities_due_date ON activities (due_date);

INSERT INTO activity_categories (activity_category_name) VALUES
    ('Assignment'),
    ('Quiz'),
    ('Exam'),
    ('Project')
ON DUPLICATE KEY UPDATE
    activity_category_name = VALUES(activity_category_name);

CREATE TABLE password_reset_tokens (
   id int NOT NULL AUTO_INCREMENT,
   user_id int DEFAULT NULL,
   token varchar(130) NOT NULL,
   expires_at datetime DEFAULT NULL,
   PRIMARY KEY (id),
   UNIQUE KEY user_id (user_id)
 ) 
