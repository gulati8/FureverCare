import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cmsAdminApi, Page, Block, PageWithoutBlocks, BlockContent } from '../../api/cms';
import BlockEditorModal from './blocks/BlockEditorModal';

const BLOCK_TYPE_LABELS: Record<string, string> = {
  hero: 'Hero',
  features: 'Features',
  how_it_works: 'How It Works',
  cta: 'Call to Action',
  footer: 'Footer',
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
  hero: 'bg-blue-100 text-blue-800',
  features: 'bg-green-100 text-green-800',
  how_it_works: 'bg-purple-100 text-purple-800',
  cta: 'bg-orange-100 text-orange-800',
  footer: 'bg-gray-100 text-gray-800',
};

export default function CMSEditor() {
  const { token } = useAuth();
  const [pages, setPages] = useState<PageWithoutBlocks[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Load pages list
  useEffect(() => {
    if (!token) return;

    const loadPages = async () => {
      try {
        const pagesList = await cmsAdminApi.fetchAllPages(token);
        setPages(pagesList);
        // Auto-select first page (homepage)
        if (pagesList.length > 0 && !selectedPageId) {
          setSelectedPageId(pagesList[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pages');
      } finally {
        setIsLoading(false);
      }
    };

    loadPages();
  }, [token]);

  // Load selected page with blocks
  useEffect(() => {
    if (!token || !selectedPageId) return;

    const loadPage = async () => {
      try {
        const page = await cmsAdminApi.fetchPageById(selectedPageId, token);
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      }
    };

    loadPage();
  }, [token, selectedPageId]);

  const handlePublishToggle = async () => {
    if (!token || !currentPage) return;

    setIsPublishing(true);
    try {
      if (currentPage.is_published) {
        await cmsAdminApi.unpublishPage(currentPage.id, token);
        setCurrentPage({ ...currentPage, is_published: false });
        setPages(pages.map(p => p.id === currentPage.id ? { ...p, is_published: false } : p));
      } else {
        await cmsAdminApi.publishPage(currentPage.id, token);
        setCurrentPage({ ...currentPage, is_published: true });
        setPages(pages.map(p => p.id === currentPage.id ? { ...p, is_published: true } : p));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publish status');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleBlockVisibility = async (block: Block) => {
    if (!token || !currentPage) return;

    try {
      await cmsAdminApi.updateBlock(block.id, { is_visible: !block.is_visible }, token);
      setCurrentPage({
        ...currentPage,
        blocks: currentPage.blocks.map(b =>
          b.id === block.id ? { ...b, is_visible: !b.is_visible } : b
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update block');
    }
  };

  const handleBlockSave = async (blockId: number, content: BlockContent) => {
    if (!token || !currentPage) return;

    try {
      await cmsAdminApi.updateBlock(blockId, { content }, token);
      setCurrentPage({
        ...currentPage,
        blocks: currentPage.blocks.map(b =>
          b.id === blockId ? { ...b, content } : b
        ),
      });
      setEditingBlock(null);
    } catch (err) {
      throw err;
    }
  };

  const handlePreview = () => {
    window.open('/', '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">CMS Editor</h1>
        <p className="text-gray-600 mt-1">Manage your website content</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Controls bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Page selector */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">Page:</label>
            <select
              value={selectedPageId || ''}
              onChange={(e) => setSelectedPageId(Number(e.target.value))}
              className="input max-w-xs"
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} ({page.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreview}
              className="btn-secondary flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Preview</span>
            </button>

            {currentPage && (
              <button
                onClick={handlePublishToggle}
                disabled={isPublishing}
                className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors ${
                  currentPage.is_published
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isPublishing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : currentPage.is_published ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>Unpublish</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Publish</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Status indicator */}
        {currentPage && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-sm">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentPage.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {currentPage.is_published ? 'Published' : 'Draft'}
              </span>
              <span className="text-gray-500">
                Last updated: {new Date(currentPage.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Blocks list */}
      {currentPage && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900">Content Blocks</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {currentPage.blocks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No blocks found. Add blocks to start editing content.
              </div>
            ) : (
              currentPage.blocks.map((block) => (
                <div
                  key={block.id}
                  className={`p-4 flex items-center justify-between ${
                    !block.is_visible ? 'bg-gray-50 opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-400 font-mono text-sm">
                      {String(block.sort_order + 1).padStart(2, '0')}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                      BLOCK_TYPE_COLORS[block.block_type] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {BLOCK_TYPE_LABELS[block.block_type] || block.block_type}
                    </span>
                    {!block.is_visible && (
                      <span className="text-xs text-gray-500">(hidden)</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleBlockVisibility(block)}
                      className={`p-2 rounded-lg transition-colors ${
                        block.is_visible
                          ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                      }`}
                      title={block.is_visible ? 'Hide block' : 'Show block'}
                    >
                      {block.is_visible ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={() => setEditingBlock(block)}
                      className="btn-secondary flex items-center space-x-1 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Block Editor Modal */}
      {editingBlock && (
        <BlockEditorModal
          block={editingBlock}
          onSave={handleBlockSave}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
}
