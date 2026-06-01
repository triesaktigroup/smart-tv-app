-- Supabase Schema for Smart Digital Signage & Announcer

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: lecturers
CREATE TABLE IF NOT EXISTS lecturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: courses
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: schedules
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access (for TV) and authenticated access (for Admin)
-- For simplicity in this project, we'll allow public reads to all tables.

CREATE POLICY "Allow public read access on lecturers" ON lecturers FOR SELECT USING (true);
CREATE POLICY "Allow public read access on rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public read access on courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow public read access on schedules" ON schedules FOR SELECT USING (true);

-- Allow public insert/update/delete ONLY for testing/demo purposes. 
-- IN PRODUCTION, restrict this to authenticated admins only.
CREATE POLICY "Allow public all access on lecturers for demo" ON lecturers FOR ALL USING (true);
CREATE POLICY "Allow public all access on rooms for demo" ON rooms FOR ALL USING (true);
CREATE POLICY "Allow public all access on courses for demo" ON courses FOR ALL USING (true);
CREATE POLICY "Allow public all access on schedules for demo" ON schedules FOR ALL USING (true);

-- Enable Realtime for schedules table
-- Make sure to also enable this in the Supabase Dashboard: Database -> Replication -> tables -> select 'schedules'
alter publication supabase_realtime add table schedules;
