import type { ReactNode } from 'react';

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
}

export function PageActions({ children, className = '' }: PageActionsProps) {
    return <div className={`page-actions ${className}`.trim()}>{children}</div>;
}

interface PageSectionProps {
    children: ReactNode;
    className?: string;
}

export function PageSection({ children, className = '' }: PageSectionProps) {
    return <section className={`page-section ${className}`.trim()}>{children}</section>;
}
