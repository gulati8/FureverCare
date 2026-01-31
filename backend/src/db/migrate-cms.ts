import { pool } from './pool.js';

const migration = `
-- CMS Pages table
CREATE TABLE IF NOT EXISTS cms_pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CMS Blocks table
CREATE TABLE IF NOT EXISTS cms_blocks (
  id SERIAL PRIMARY KEY,
  page_id INTEGER REFERENCES cms_pages(id) ON DELETE CASCADE,
  block_type VARCHAR(50) NOT NULL,
  sort_order INTEGER NOT NULL,
  content JSONB NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_is_published ON cms_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_cms_blocks_page_id ON cms_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_cms_blocks_sort_order ON cms_blocks(page_id, sort_order);
`;

async function migrate() {
  console.log('Running CMS migration...');
  try {
    await pool.query(migration);
    console.log('CMS migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
