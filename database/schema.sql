CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
	username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
    class_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    class_name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    title TEXT NOT NULL,
    assignment_type TEXT CHECK (
        assignment_type IN ('homework', 'project', 'essay', 'test', 'exam' 'lab report', 'other')
    ),
    due_date DATE NOT NULL,
    estimated_minutes INT CHECK (estimated_minutes > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	completed BOOLEAN DEFAULT FALSE
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
        ON DELETE CASCADE
);

CREATE TABLE study_sessions (
    session_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    session_date DATE NOT NULL,
    duration_minutes INT NOT NULL,
    session_type TEXT CHECK (
        session_type IN ('homework', 'project', 'essay', 'test', 'exam', 'lab report', 'other')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (class_id) REFERENCES classes(class_id)
        ON DELETE CASCADE
);
