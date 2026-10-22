import { neon } from '@neondatabase/serverless';

if(!process.env.DATABASE_URL){
    throw new Error("DATABASE_URL is not defined in environment variables");
}

export const sql = neon(process.env.DATABASE_URL);

export async function initDB() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                image VARCHAR(500),
                plan VARCHAR(20) DEFAULT 'free',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS meetings (
                id SERIAL PRIMARY KEY,
                meeting_id VARCHAR(50) NOT NULL UNIQUE,
                title VARCHAR(255) DEFAULT 'Instant Meeting',
                host_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                status VARCHAR(20) DEFAULT 'active',
                is_private BOOLEAN DEFAULT false,
                default_role VARCHAR(20) DEFAULT 'editor',
                ended_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;`;
        await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS default_role VARCHAR(20) DEFAULT 'editor';`;

        await sql`
            CREATE TABLE IF NOT EXISTS meeting_participants (
                id SERIAL PRIMARY KEY,
                meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
                user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                name VARCHAR(255) NOT NULL,
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                left_at TIMESTAMPTZ
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS meeting_messages (
                id SERIAL PRIMARY KEY,
                meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
                sender_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                sender_name VARCHAR(255) NOT NULL,
                text TEXT NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS meeting_members (
                id SERIAL PRIMARY KEY,
                meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                role VARCHAR(20) NOT NULL DEFAULT 'editor',
                invited_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE (meeting_id, user_id)
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS workspace_metadata (
                id SERIAL PRIMARY KEY,
                meeting_id INT NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
                active_tool VARCHAR(50) DEFAULT 'notes',
                last_saved_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS workspace_snapshots (
                id SERIAL PRIMARY KEY,
                meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
                doc_type VARCHAR(50) NOT NULL,
                snapshot_data TEXT NOT NULL,
                text_content TEXT,
                version_number INT NOT NULL DEFAULT 1,
                created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS workspace_updates (
                id SERIAL PRIMARY KEY,
                meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
                doc_type VARCHAR(50) NOT NULL,
                update_data TEXT NOT NULL,
                op_id VARCHAR(100),
                actor_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                actor_name VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS workspace_versions (
                id SERIAL PRIMARY KEY,
                meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
                doc_type VARCHAR(50) NOT NULL,
                version_name VARCHAR(255) NOT NULL,
                snapshot_data TEXT NOT NULL,
                text_content TEXT,
                created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                creator_name VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS audit_events (
                id SERIAL PRIMARY KEY,
                meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
                actor_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                actor_name VARCHAR(255),
                event_type VARCHAR(100) NOT NULL,
                details JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        // Create indexes for performance
        await sql`CREATE INDEX IF NOT EXISTS idx_workspace_updates_lookup ON workspace_updates(meeting_id, doc_type, id ASC);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_workspace_updates_op_id ON workspace_updates(op_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_lookup ON workspace_snapshots(meeting_id, doc_type, version_number DESC);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_meeting_members_lookup ON meeting_members(meeting_id, user_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_audit_events_meeting ON audit_events(meeting_id, created_at DESC);`;

    } catch (error) {
        console.error("Error initializing database tables:", error);
        throw error;
    }
}