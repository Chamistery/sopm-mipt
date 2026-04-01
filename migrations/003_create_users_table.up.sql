CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    company VARCHAR(255),
    course VARCHAR(50),
    "group" VARCHAR(50),
    avatar TEXT
);
