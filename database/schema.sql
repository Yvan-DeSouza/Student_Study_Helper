-- USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
	user_type TEXT NOT NULL CHECK (
		user_type in ('student', 'teacher', 'director', 'admin', 'other')
	) DEFAULT 'student',
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    theme TEXT CHECK (theme IN ('fun_light', 'fun_dark', 'modern_light', 'modern_dark', 'system')) DEFAULT 'system',
    assignments_view TEXT CHECK (assignments_view IN ('single_table', 'per_class')) DEFAULT 'single_table',
    show_completed_assignments BOOLEAN NOT NULL DEFAULT TRUE,
    default_upcoming_deadlines_count INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
	CHECK (default_upcoming_deadlines_count >= 0)
);

-- CLASSES
CREATE TABLE classes (
    class_id SERIAL PRIMARY KEY,
	user_id INT NOT NULL,
    class_name TEXT NOT NULL,
	teacher_name TEXT,
    class_type TEXT NOT NULL CHECK (
        class_type IN ('math', 'science', 'language', 'social_science', 'art', 'engineering', 'technology', 'finance', 'other')
    ), 
    class_code TEXT NOT NULL,
	UNIQUE(user_id, class_code),
	
    color TEXT NOT NULL,
	
    grade NUMERIC(5,2) CHECK (grade >= 0 AND grade <= 100), -- optional
    importance TEXT CHECK (importance IN ('high', 'medium', 'low')), -- optional
	difficulty INT CHECK (difficulty BETWEEN 1 AND 10),
	pass_grade NUMERIC(5,2) CHECK (pass_grade >= 0 AND pass_grade <= 100),

	
	is_finished BOOLEAN NOT NULL DEFAULT FALSE,
	finish_date TIMESTAMPTZ,
	
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

	CHECK (
		   (is_finished = FALSE AND finish_date IS NULL)
		OR (is_finished = TRUE AND finish_date IS NOT NULL)
	)
);

-- ASSIGNMENTS
CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
	user_id INT NOT NULL,
    class_id INT NOT NULL,
    title TEXT NOT NULL,
    assignment_type TEXT NOT NULL CHECK (
        assignment_type IN ('homework', 'quiz', 'project', 'essay', 'test', 'exam', 'lab_report', 'other')
    ),
    due_date DATE,
	grade NUMERIC(5,2) CHECK (grade >= 0 AND grade <= 100),
	expected_grade NUMERIC(5,2) CHECK (expected_grade >= 0 AND expected_grade <= 100),
    estimated_minutes INT CHECK (estimated_minutes > 0),
	difficulty INT CHECK (difficulty BETWEEN 1 AND 10),
	pass_grade NUMERIC(5,2) CHECK (pass_grade >= 0 AND pass_grade <= 100),
	
    is_graded BOOLEAN NOT NULL, -- mandatory
    ponderation INT CHECK (ponderation >= 1 AND ponderation <= 5), -- optional, only relevant if graded
    is_completed BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	finish_date TIMESTAMPTZ,
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
        ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(user_id) 
		ON DELETE CASCADE,
	CHECK (
       	   (is_completed = FALSE AND finish_date IS NULL)
    	OR (is_completed = TRUE AND finish_date IS NOT NULL)
	),
	CHECK (
	       (is_graded = FALSE AND grade IS NULL AND ponderation IS NULL)
	    OR (is_graded = TRUE AND grade IS NOT NULL)
	)

);

-- STUDY SESSIONS
CREATE TABLE study_sessions (
    session_id SERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    class_id INT NOT NULL,
	user_id INT NOT NULL,
    assignment_id INT, -- optional: NULL if not tied to an assignment
    duration_minutes INT, -- total time
    expected_duration_minutes INT, -- optional
    session_type TEXT NOT NULL CHECK (
        session_type IN ('homework', 'quiz', 'project', 'essay', 'test', 'exam', 'lab_report', 'other')
    ),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	started_at TIMESTAMPTZ NOT NULL,
	session_end TIMESTAMPTZ,
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
        ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id)
        ON DELETE SET NULL, 
	FOREIGN KEY (user_id) REFERENCES users(user_id) 
		ON DELETE CASCADE,
	CHECK (
        (is_completed = FALSE AND session_end IS NULL AND duration_minutes IS NULL)
        OR
        (is_completed = TRUE AND session_end IS NOT NULL AND duration_minutes IS NOT NULL)
    ),
	CHECK (
	    session_end IS NULL OR started_at <= session_end
	) 	
);

CREATE UNIQUE INDEX one_active_session_per_user
ON study_sessions(user_id)
WHERE session_end IS NULL;

CREATE TABLE class_expected_grades (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    expected_grade NUMERIC(5,2) NOT NULL CHECK (expected_grade >= 0 AND expected_grade <= 100),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (class_id) REFERENCES classes(class_id)
        ON DELETE CASCADE
);

CREATE TABLE assignment_expected_grades (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL,
    expected_grade NUMERIC(5,2) NOT NULL CHECK (expected_grade >= 0 AND expected_grade <= 100),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id)
        ON DELETE CASCADE
);































