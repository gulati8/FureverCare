import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { adminApi, AdminUser, UsersQueryOptions } from '../../api/admin';
import UserDetailModal from './UserDetailModal';

export default function UsersList() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Filter and pagination state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<UsersQueryOptions['sortBy']>('id');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 25;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const options: UsersQueryOptions = {
        limit,
        offset: page * limit,
        sortBy,
        sortOrder,
      };

      if (search) options.search = search;
      if (adminFilter === 'admin') options.isAdmin = true;
      if (adminFilter === 'non-admin') options.isAdmin = false;

      const result = await adminApi.fetchUsers(token, options);
      setUsers(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, sortBy, sortOrder, search, adminFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSort = (column: UsersQueryOptions['sortBy']) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPage(0);
  };

  const handlePrevPage = () => {
    if (page > 0) setPage(page - 1);
  };

  const handleNextPage = () => {
    if ((page + 1) * limit < total) setPage(page + 1);
  };

  const formatRelativeDate = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  const getSubscriptionBadge = (status: string, tier: string) => {
    if (tier === 'premium') {
      switch (status) {
        case 'active':
          return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Premium</span>;
        case 'trialing':
          return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Trial</span>;
        case 'past_due':
          return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Past Due</span>;
        case 'canceled':
          return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Canceled</span>;
      }
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Free</span>;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'ASC' ? (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600 mt-1">Manage user accounts and access</p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input w-full"
            />
          </div>
          <div className="w-48">
            <select
              value={adminFilter}
              onChange={(e) => {
                setAdminFilter(e.target.value);
                setPage(0);
              }}
              className="input w-full"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins Only</option>
              <option value="non-admin">Non-Admins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No users found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('id')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>ID</span>
                        <SortIcon column="id" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Name</span>
                        <SortIcon column="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('email')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Email</span>
                        <SortIcon column="email" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('is_admin')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Admin</span>
                        <SortIcon column="is_admin" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('subscription_status')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Subscription</span>
                        <SortIcon column="subscription_status" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('owned_pet_count')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Pets</span>
                        <SortIcon column="owned_pet_count" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-primary-600"
                      >
                        <span>Created</span>
                        <SortIcon column="created_at" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{user.id}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{user.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{user.phone || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_admin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getSubscriptionBadge(user.subscription_status, user.subscription_tier)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">
                          {Number(user.owned_pet_count) + Number(user.shared_pet_count)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{formatRelativeDate(user.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} users
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 0}
                  className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={(page + 1) * limit >= total}
                  className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
