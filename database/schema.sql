-- USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
	user_type TEXT NOT NULL CHECK (
		user_type in ('student', 'teacher', 'director', 'admin','other')
	) DEFAULT 'student',
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CLASSES
CREATE TABLE classes (
    class_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
	
    class_name TEXT NOT NULL,
    class_type TEXT NOT NULL CHECK (
        class_type IN ('math', 'science', 'language', 'social_science', 'art', 'engineering', 'technology', 'finance', 'other')
    ), 
    class_code TEXT NOT NULL,
	
    color TEXT NOT NULL,
	
    grade NUMERIC(5,2) CHECK (grade >= 0 AND grade <= 100), -- optional
    importance TEXT CHECK (importance IN ('high', 'medium', 'low')), -- optional
	
	is_finished BOOLEAN NOT NULL DEFAULT FALSE,
	finish_date DATE,
	
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
    class_id INT NOT NULL,
    title TEXT NOT NULL,
    assignment_type TEXT NOT NULL CHECK (
        assignment_type IN ('homework', 'project', 'essay', 'test', 'exam', 'lab_report', 'other')
    ),
    due_date DATE,
    estimated_minutes INT CHECK (estimated_minutes > 0),
    is_graded BOOLEAN NOT NULL, -- mandatory
    ponderation INT CHECK (ponderation >= 1 AND ponderation <= 5), -- optional, only relevant if graded
    completed BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
        ON DELETE CASCADE
);

-- STUDY SESSIONS
CREATE TABLE study_sessions (
    session_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    assignment_id INT, -- optional: NULL if not tied to an assignment
    session_date DATE NOT NULL,
    duration_minutes INT, -- total time
    expected_duration_minutes INT, -- optional
    session_type TEXT CHECK (
        session_type IN ('homework', 'project', 'essay', 'test', 'exam', 'lab_report', 'other')
    ),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	session_end TIMESTAMPTZ,
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
        ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id)
        ON DELETE SET NULL
);




