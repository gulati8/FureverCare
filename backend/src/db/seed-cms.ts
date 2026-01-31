import { pool, queryOne } from './pool.js';

interface CmsPage {
  id: number;
  slug: string;
  title: string;
}

async function seedCms() {
  console.log('Seeding CMS homepage content...');

  try {
    // Check if homepage already exists
    const existingPage = await queryOne<CmsPage>(
      `SELECT * FROM cms_pages WHERE slug = $1`,
      ['homepage']
    );

    if (existingPage) {
      console.log('Homepage already exists, skipping seed');
      await pool.end();
      return;
    }

    // Create homepage
    const page = await queryOne<CmsPage>(
      `INSERT INTO cms_pages (slug, title, is_published)
       VALUES ($1, $2, $3)
       RETURNING *`,
      ['homepage', 'FureverCare - Pet Health Management', true]
    );

    if (!page) {
      throw new Error('Failed to create homepage');
    }

    const pageId = page.id;

    // Define blocks in order
    const blocks = [
      // Hero block
      {
        block_type: 'hero',
        sort_order: 0,
        content: {
          headline: "All Your Pet's Health Info in One Place",
          subheadline: "Track vaccinations, medications, vet visits, and more. Never miss an important health milestone.",
          cta_primary: {
            text: "Get Started Free",
            url: "/register"
          },
          cta_secondary: {
            text: "See How It Works",
            url: "#how-it-works"
          }
        }
      },
      // Features block
      {
        block_type: 'features',
        sort_order: 1,
        content: {
          title: "Everything You Need",
          subtitle: "Comprehensive tools to keep your pets healthy and happy",
          features: [
            {
              icon: "health_records",
              title: "Health Records",
              description: "Centralized vaccination records, medical history, and health documents"
            },
            {
              icon: "medication",
              title: "Medication Tracking",
              description: "Set reminders for medications and never miss a dose"
            },
            {
              icon: "vet",
              title: "Vet Visit History",
              description: "Keep track of all veterinary appointments and notes"
            },
            {
              icon: "weight",
              title: "Weight Monitoring",
              description: "Track weight changes over time with visual charts"
            },
            {
              icon: "documents",
              title: "Document Storage",
              description: "Upload and organize pet-related documents securely"
            },
            {
              icon: "multi_pet",
              title: "Multi-Pet Support",
              description: "Manage health info for all your pets in one place"
            }
          ]
        }
      },
      // How It Works block
      {
        block_type: 'how_it_works',
        sort_order: 2,
        content: {
          title: "How It Works",
          subtitle: "Get started in minutes",
          steps: [
            {
              number: 1,
              title: "Create Account",
              description: "Sign up in seconds with just your email"
            },
            {
              number: 2,
              title: "Add Your Pets",
              description: "Enter basic info about your furry family members"
            },
            {
              number: 3,
              title: "Track Health Data",
              description: "Log vaccinations, medications, vet visits, and more"
            },
            {
              number: 4,
              title: "Stay Organized",
              description: "Access everything from any device, anytime"
            }
          ]
        }
      },
      // CTA block
      {
        block_type: 'cta',
        sort_order: 3,
        content: {
          headline: "Ready to simplify pet health management?",
          subheadline: "Join thousands of pet parents who trust FureverCare",
          button: {
            text: "Start Free Today",
            url: "/register"
          }
        }
      },
      // Footer block
      {
        block_type: 'footer',
        sort_order: 4,
        content: {
          links: [
            { text: "About", url: "/about" },
            { text: "Privacy", url: "/privacy" },
            { text: "Terms", url: "/terms" },
            { text: "Contact", url: "/contact" }
          ],
          copyright: "2024 FureverCare. All rights reserved."
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

    console.log('CMS homepage seeded successfully with', blocks.length, 'blocks');
  } catch (error) {
    console.error('CMS seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedCms();
