import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { adminApi, EmailTemplate, EmailTemplateInput } from '../../api/admin';

interface RowState {
  brevo_template_id: number;
  description: string;
  saving: boolean;
}

export default function EmailTemplates() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // Add form state
  const [addEmailType, setAddEmailType] = useState('');
  const [addTemplateId, setAddTemplateId] = useState<number>(0);
  const [addDescription, setAddDescription] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const loadTemplates = async (authToken: string) => {
    try {
      const data = await adminApi.fetchEmailTemplates(authToken);
      setTemplates(data);
      const states: Record<string, RowState> = {};
      for (const t of data) {
        states[t.email_type] = {
          brevo_template_id: t.brevo_template_id,
          description: t.description ?? '',
          saving: false,
        };
      }
      setRowStates(states);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadTemplates(token);
  }, [token]);

  const handleRowChange = (emailType: string, field: 'brevo_template_id' | 'description', value: string | number) => {
    setRowStates((prev) => ({
      ...prev,
      [emailType]: {
        ...prev[emailType],
        [field]: value,
      },
    }));
  };

  const handleSaveRow = async (emailType: string) => {
    if (!token) return;
    const row = rowStates[emailType];
    if (!row) return;

    setRowStates((prev) => ({
      ...prev,
      [emailType]: { ...prev[emailType], saving: true },
    }));
    setError(null);

    try {
      const data: EmailTemplateInput = {
        brevo_template_id: row.brevo_template_id,
        description: row.description || undefined,
      };
      await adminApi.updateEmailTemplate(token, emailType, data);
      // Refresh to get updated_at
      await loadTemplates(token);
      showSuccess(`Template "${emailType}" saved successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save template "${emailType}"`);
      setRowStates((prev) => ({
        ...prev,
        [emailType]: { ...prev[emailType], saving: false },
      }));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setAddSaving(true);
    setError(null);

    try {
      const data: EmailTemplateInput = {
        email_type: addEmailType,
        brevo_template_id: addTemplateId,
        description: addDescription || undefined,
      };
      await adminApi.createEmailTemplate(token, data);
      setAddEmailType('');
      setAddTemplateId(0);
      setAddDescription('');
      await loadTemplates(token);
      showSuccess(`Template "${addEmailType}" added successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add email template');
    } finally {
      setAddSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Email Templates</h1>
        <p className="text-surface-600 mt-1">Manage Brevo template ID mappings for transactional emails</p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-success-light border border-success-light text-success px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </span>
          <button onClick={() => setSuccessMessage(null)} className="text-success hover:text-success">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-danger-light border border-danger-light text-danger px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-danger hover:text-danger-dark">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-navy">Template Mappings</h2>
            <p className="text-sm text-surface-500 mt-1">
              Set the Brevo numeric template ID for each email type
            </p>
          </div>
          <a
            href="https://app.brevo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
          >
            Open Brevo Dashboard
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        {templates.length === 0 ? (
          <div className="p-6 text-center text-surface-500 text-sm">
            No email templates configured yet. Use the form below to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Email Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Template ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {templates.map((template) => {
                  const row = rowStates[template.email_type];
                  if (!row) return null;
                  const isUnconfigured = row.brevo_template_id === 0;
                  return (
                    <tr key={template.email_type}>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-surface-700">
                          {template.email_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={row.brevo_template_id}
                            onChange={(e) =>
                              handleRowChange(
                                template.email_type,
                                'brevo_template_id',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className={`input w-28 ${isUnconfigured ? 'text-danger' : ''}`}
                          />
                          {isUnconfigured && (
                            <span className="text-xs font-medium text-danger bg-danger-light px-2 py-0.5 rounded">
                              Not set
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            handleRowChange(template.email_type, 'description', e.target.value)
                          }
                          className="input w-full"
                          placeholder="Optional description"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={row.saving}
                          onClick={() => handleSaveRow(template.email_type)}
                          className="btn-primary flex items-center text-sm py-1.5 px-3"
                        >
                          {row.saving ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Email Template */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-medium text-navy">Add Email Template</h2>
          <p className="text-sm text-surface-500 mt-1">Register a new email type with its Brevo template ID</p>
        </div>
        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="add_email_type" className="block text-sm font-medium text-surface-700 mb-1">
                Email Type
              </label>
              <input
                type="text"
                id="add_email_type"
                required
                value={addEmailType}
                onChange={(e) => setAddEmailType(e.target.value)}
                pattern="^[a-z][a-z0-9_]*$"
                className="input w-full font-mono text-sm"
                placeholder="welcome_email"
              />
              <p className="text-xs text-surface-500 mt-1">Lowercase letters, numbers, and underscores only</p>
            </div>
            <div>
              <label htmlFor="add_template_id" className="block text-sm font-medium text-surface-700 mb-1">
                Template ID
              </label>
              <input
                type="number"
                id="add_template_id"
                required
                min="1"
                value={addTemplateId || ''}
                onChange={(e) => setAddTemplateId(parseInt(e.target.value) || 0)}
                className="input w-full"
                placeholder="42"
              />
              <p className="text-xs text-surface-500 mt-1">Numeric ID from Brevo dashboard</p>
            </div>
            <div>
              <label htmlFor="add_description" className="block text-sm font-medium text-surface-700 mb-1">
                Description
              </label>
              <input
                type="text"
                id="add_description"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                className="input w-full"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="pt-4">
            <button type="submit" disabled={addSaving} className="btn-primary flex items-center">
              {addSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
