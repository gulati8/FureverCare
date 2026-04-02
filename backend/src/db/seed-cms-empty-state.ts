import { pool, queryOne } from './pool.js';

interface CmsPage {
  id: number;
  slug: string;
  title: string;
}

async function seedCmsEmptyState() {
  console.log('Seeding CMS dashboard empty state content...');

  try {
    // Check if dashboard-empty-state page already exists
    const existingPage = await queryOne<CmsPage>(
      `SELECT * FROM cms_pages WHERE slug = $1`,
      ['dashboard-empty-state']
    );

    if (existingPage) {
      console.log('Dashboard empty state page already exists, skipping seed');
      await pool.end();
      return;
    }

    // Create dashboard-empty-state page
    const page = await queryOne<CmsPage>(
      `INSERT INTO cms_pages (slug, title, is_published)
       VALUES ($1, $2, $3)
       RETURNING *`,
      ['dashboard-empty-state', 'Dashboard Empty State', true]
    );

    if (!page) {
      throw new Error('Failed to create dashboard empty state page');
    }

    const pageId = page.id;

    // Define blocks in order
    const blocks = [
      // Empty state block
      {
        block_type: 'empty_state',
        sort_order: 0,
        content: {
          heading: 'Add your first pet to create their profile',
          subheading: ''
        }
      }
    ];

    // Insert all blocks
    for (const block of blocks) {
      await pool.query(
        `INSERT INTO cms_blocks (page_id, block_type, sort_order, content, is_visible)
         VALUES ($1, $2, $3, $4, $5)`,
        [pageId, block.block_type, block.sort_order, JSON.stringify(block.content), true]
      );
    }

    console.log('CMS dashboard empty state seeded successfully with', blocks.length, 'blocks');
  } catch (error) {
    console.error('CMS empty state seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedCmsEmptyState();
