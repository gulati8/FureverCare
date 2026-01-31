import { api } from './client';

// ============ Types ============

// Block content types
export interface HeroContent {
  headline: string;
  subheadline: string;
  cta_primary: {
    text: string;
    url: string;
  };
  cta_secondary: {
    text: string;
    url: string;
  };
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesContent {
  title: string;
  subtitle: string;
  features: FeatureItem[];
}

export interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
}

export interface HowItWorksContent {
  title: string;
  subtitle: string;
  steps: HowItWorksStep[];
}

export interface CTAContent {
  headline: string;
  subheadline: string;
  button: {
    text: string;
    url: string;
  };
}

export interface FooterLink {
  text: string;
  url: string;
}

export interface FooterContent {
  links: FooterLink[];
  copyright: string;
}

// Block type union
export type BlockContent = HeroContent | FeaturesContent | HowItWorksContent | CTAContent | FooterContent;

export type BlockType = 'hero' | 'features' | 'how_it_works' | 'cta' | 'footer';

export interface Block {
  id: number;
  page_id: number;
  block_type: BlockType;
  sort_order: number;
  content: BlockContent;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: number;
  slug: string;
  title: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  blocks: Block[];
}

export interface PageWithoutBlocks {
  id: number;
  slug: string;
  title: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============ Public API ============

export const cmsApi = {
  // Get published page by slug (public, no auth)
  fetchPage: (slug: string) =>
    api.get<Page>(`/api/cms/pages/${slug}`),
};

// ============ Admin API ============

export const cmsAdminApi = {
  // List all pages (admin)
  fetchAllPages: (token: string) =>
    api.get<PageWithoutBlocks[]>('/api/cms/admin/pages', token),

  // Get page by ID with blocks (admin)
  fetchPageById: (id: number, token: string) =>
    api.get<Page>(`/api/cms/admin/pages/${id}`, token),

  // Create page (admin)
  createPage: (data: { slug: string; title: string; is_published?: boolean }, token: string) =>
    api.post<PageWithoutBlocks>('/api/cms/admin/pages', data, token),

  // Update page (admin)
  updatePage: (id: number, data: { slug?: string; title?: string; is_published?: boolean }, token: string) =>
    api.put<PageWithoutBlocks>(`/api/cms/admin/pages/${id}`, data, token),

  // Delete page (admin)
  deletePage: (id: number, token: string) =>
    api.delete(`/api/cms/admin/pages/${id}`, token),

  // Publish page (admin)
  publishPage: (id: number, token: string) =>
    api.post<PageWithoutBlocks>(`/api/cms/admin/pages/${id}/publish`, {}, token),

  // Unpublish page (admin)
  unpublishPage: (id: number, token: string) =>
    api.post<PageWithoutBlocks>(`/api/cms/admin/pages/${id}/unpublish`, {}, token),

  // Update block (admin)
  updateBlock: (id: number, data: { content?: BlockContent; is_visible?: boolean }, token: string) =>
    api.put<Block>(`/api/cms/admin/blocks/${id}`, data, token),

  // Create block (admin)
  createBlock: (pageId: number, data: { block_type: BlockType; sort_order: number; content: BlockContent; is_visible?: boolean }, token: string) =>
    api.post<Block>(`/api/cms/admin/pages/${pageId}/blocks`, data, token),

  // Delete block (admin)
  deleteBlock: (id: number, token: string) =>
    api.delete(`/api/cms/admin/blocks/${id}`, token),

  // Reorder blocks (admin)
  reorderBlocks: (pageId: number, blockIds: number[], token: string) =>
    api.put<Block[]>(`/api/cms/admin/pages/${pageId}/blocks/reorder`, { block_ids: blockIds }, token),
};
