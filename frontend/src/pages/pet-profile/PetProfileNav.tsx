import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  count?: number;
  icon: React.ReactNode;
}

export default function PetProfileNav({ basePath, counts }: {
  basePath: string;
  counts: {
    conditions: number;
    allergies: number;
    medications: number;
    vaccinations: number;
    vets: number;
    contacts: number;
    alerts: number;
    images: number;
  };
}) {
  const location = useLocation();
  const currentPath = location.pathname;

  const healthCount = counts.conditions + counts.allergies + counts.medications + counts.vaccinations;
  const careTeamCount = counts.vets + counts.contacts;

  const navItems: NavItem[] = [
    {
      path: basePath,
      label: 'Overview',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      path: `${basePath}/health`,
      label: 'Health Records',
      count: healthCount || undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      path: `${basePath}/care-team`,
      label: 'Care Team',
      count: careTeamCount || undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      path: `${basePath}/documents`,
      label: 'Documents',
      count: counts.images || undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
    {
      path: `${basePath}/activity`,
      label: 'Activity',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
  ];

  const isActive = (itemPath: string) => {
    if (itemPath === basePath) {
      return currentPath === basePath || currentPath === basePath + '/';
    }
    return currentPath.startsWith(itemPath);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="pet-profile-sidebar" aria-label="Pet profile navigation">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`pet-profile-nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <span className="pet-profile-nav-icon">{item.icon}</span>
            <span className="pet-profile-nav-label">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="pet-profile-nav-count">{item.count}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Mobile pill row */}
      <div className="pet-profile-pills-wrapper">
      <nav className="pet-profile-pills" aria-label="Pet profile navigation">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`pet-profile-pill ${isActive(item.path) ? 'active' : ''}`}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span className="pet-profile-pill-count">{item.count}</span>
            )}
          </Link>
        ))}
      </nav>
      </div>
    </>
  );
}
