-- Migration 001: Initial schema
-- Creates all ENUM types, tables, constraints, and indexes

CREATE TYPE platform_enum        AS ENUM ('facebook', 'instagram', 'tiktok');
CREATE TYPE media_type_enum      AS ENUM ('image', 'video', 'template');
CREATE TYPE post_status_enum     AS ENUM ('draft', 'scheduled', 'published');
CREATE TYPE post_type_enum       AS ENUM ('image', 'video', 'text', 'carousel', 'template');
CREATE TYPE instance_status_enum AS ENUM ('pending', 'posted', 'failed');
CREATE TYPE queue_status_enum    AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE ai_output_type_enum  AS ENUM ('text', 'image', 'video');
CREATE TYPE ai_gen_status_enum   AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

CREATE TABLE social_accounts (
    id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id              UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform                platform_enum NOT NULL,
    account_id              VARCHAR(255)  NOT NULL,
    access_token_encrypted  TEXT          NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at        TIMESTAMPTZ,
    is_active               BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_social_account UNIQUE (profile_id, platform, account_id)
);

CREATE INDEX idx_social_accounts_profile_id      ON social_accounts(profile_id);
CREATE INDEX idx_social_accounts_platform_active ON social_accounts(platform, is_active);

CREATE TABLE ai_configurations (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID         NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    provider        VARCHAR(100) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    system_prompt   TEXT,
    temperature     NUMERIC(4,3) CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens      INTEGER      CHECK (max_tokens > 0),
    custom_settings JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE media (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type             media_type_enum NOT NULL,
    file_path        TEXT            NOT NULL,
    filename         VARCHAR(500)    NOT NULL,
    mime_type        VARCHAR(127)    NOT NULL,
    file_size_bytes  BIGINT          NOT NULL CHECK (file_size_bytes > 0),
    width            INTEGER,
    height           INTEGER,
    duration_seconds NUMERIC(10,3),
    metadata         JSONB,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_user_id ON media(user_id);
CREATE INDEX idx_media_type    ON media(type);

CREATE TABLE posts (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id       UUID             NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_id          UUID             NOT NULL REFERENCES users(id),
    original_post_id UUID             REFERENCES posts(id) ON DELETE SET NULL,
    caption          TEXT,
    hashtags         TEXT[],
    status           post_status_enum NOT NULL DEFAULT 'draft',
    post_type        post_type_enum   NOT NULL,
    scheduled_at     TIMESTAMPTZ,
    published_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_profile_status ON posts(profile_id, status);
CREATE INDEX idx_posts_scheduled_at   ON posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_posts_post_type      ON posts(post_type);
CREATE INDEX idx_posts_user_id        ON posts(user_id);

CREATE TABLE post_media (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id       UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_id      UUID        NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
    display_order INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_media UNIQUE (post_id, media_id)
);

CREATE INDEX idx_post_media_post_id ON post_media(post_id);

CREATE TABLE platform_post_instances (
    id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id           UUID                 NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    social_account_id UUID                 NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    platform          platform_enum        NOT NULL,
    platform_post_id  VARCHAR(255),
    status            instance_status_enum NOT NULL DEFAULT 'pending',
    error_message     TEXT,
    scheduled_at      TIMESTAMPTZ,
    posted_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_social_account UNIQUE (post_id, social_account_id)
);

CREATE INDEX idx_ppi_post_platform_status ON platform_post_instances(post_id, platform, status);
CREATE INDEX idx_ppi_scheduled_at         ON platform_post_instances(scheduled_at)
    WHERE scheduled_at IS NOT NULL;

CREATE TABLE post_analytics (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_post_instance_id UUID        NOT NULL UNIQUE
                              REFERENCES platform_post_instances(id) ON DELETE CASCADE,
    views                     BIGINT      NOT NULL DEFAULT 0,
    likes                     BIGINT      NOT NULL DEFAULT 0,
    comments                  BIGINT      NOT NULL DEFAULT 0,
    shares                    BIGINT      NOT NULL DEFAULT 0,
    last_updated_at           TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_generations (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id          UUID                NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id             UUID                REFERENCES posts(id) ON DELETE SET NULL,
    ai_configuration_id UUID                NOT NULL REFERENCES ai_configurations(id),
    prompt              TEXT                NOT NULL,
    output_type         ai_output_type_enum NOT NULL,
    output_text         TEXT,
    output_media_id     UUID                REFERENCES media(id) ON DELETE SET NULL,
    model_used          VARCHAR(100)        NOT NULL,
    tokens_used         INTEGER,
    generation_time_ms  INTEGER,
    status              ai_gen_status_enum  NOT NULL DEFAULT 'pending',
    error_message       TEXT,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_gen_profile_id ON ai_generations(profile_id);
CREATE INDEX idx_ai_gen_post_id    ON ai_generations(post_id) WHERE post_id IS NOT NULL;

CREATE TABLE post_queue (
    id                        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_post_instance_id UUID              NOT NULL REFERENCES platform_post_instances(id) ON DELETE CASCADE,
    run_at                    TIMESTAMPTZ       NOT NULL,
    status                    queue_status_enum NOT NULL DEFAULT 'pending',
    attempt_count             INTEGER           NOT NULL DEFAULT 0,
    max_attempts              INTEGER           NOT NULL DEFAULT 3,
    last_attempted_at         TIMESTAMPTZ,
    error_message             TEXT,
    created_at                TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_queue_status_run_at ON post_queue(status, run_at)
    WHERE status IN ('pending', 'failed');
