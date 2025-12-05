-- Create content_reactions table for storing reaction counts
CREATE TABLE IF NOT EXISTS content_reactions (
    content_type TEXT NOT NULL,    -- 'blog' | 'pebbles'
    slug TEXT NOT NULL,            -- post slug
    reactions TEXT NOT NULL,        -- JSON: [{"type":"party_popper","count":5}]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_type, slug)
);

-- Create reaction_events table for 1-person-1-vote system
CREATE TABLE IF NOT EXISTS reaction_events (
    content_type TEXT NOT NULL,
    slug TEXT NOT NULL,
    reaction_type TEXT NOT NULL,    -- 'party_popper'
    user_hash TEXT NOT NULL,        -- browser fingerprint hash
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_type, slug, reaction_type, user_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reaction_events_user_hash ON reaction_events(user_hash);
CREATE INDEX IF NOT EXISTS idx_content_reactions_type_slug ON content_reactions(content_type, slug);