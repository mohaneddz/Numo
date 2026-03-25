import type { ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageContentProps {
    children: ReactNode;
    className?: string;
    width?: 'default' | 'wide' | 'narrow';
}

export function PageContent({ children, className = '', width = 'default' }: PageContentProps) {
    const widthClass =
        width === 'narrow'
            ? 'page-content--narrow'
            : width === 'wide'
                ? 'page-content--wide'
                : '';

    return <div className={`page-content ${widthClass} ${className}`.trim()}>{children}</div>;
}

interface PageActionsProps {
    children?: ReactNode;
    className?: string;
    settingsDisabled?: boolean;
    onSettingsClick?: () => void;
    hideSettingsButton?: boolean;
}

export function PageActions({
    children,
    className = '',
    settingsDisabled = false,
    onSettingsClick,
    hideSettingsButton = false,
}: PageActionsProps) {
    const navigate = useNavigate();
    const handleSettingsClick = onSettingsClick ?? (() => navigate('/settings'));

    return (
        <div className={`page-actions ${className}`.trim()}>
            {children}
            {!hideSettingsButton && (
                <button
                    type="button"
                    aria-label="Page settings"
                    disabled={settingsDisabled}
                    onClick={handleSettingsClick}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 transition-colors ${
                        settingsDisabled
                            ? 'cursor-not-allowed text-dim/45'
                            : 'cursor-pointer text-dim hover:text-white'
                    }`}
                >
                    <Settings size={18} />
                </button>
            )}
        </div>
    );
}

interface PageSectionProps {
    children: ReactNode;
    className?: string;
}

export function PageSection({ children, className = '' }: PageSectionProps) {
    return <section className={`page-section ${className}`.trim()}>{children}</section>;
}

interface PageMainSidebarLayoutProps {
    children: ReactNode;
    className?: string;
}

export function PageMainSidebarLayout({ children, className = '' }: PageMainSidebarLayoutProps) {
    return <div className={`page-main-sidebar ${className}`.trim()}>{children}</div>;
}

interface PageMainColumnProps {
    children: ReactNode;
    className?: string;
}

export function PageMainColumn({ children, className = '' }: PageMainColumnProps) {
    return <section className={`page-main-column ${className}`.trim()}>{children}</section>;
}

interface PageSidebarProps {
    children: ReactNode;
    className?: string;
}

export function PageSidebar({ children, className = '' }: PageSidebarProps) {
    return <aside className={`page-sidebar ${className}`.trim()}>{children}</aside>;
}
