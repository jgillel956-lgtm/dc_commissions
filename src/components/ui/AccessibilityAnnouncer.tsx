import React, { useEffect, useRef } from 'react';

interface AccessibilityAnnouncerProps {
  message: string | null;
  priority?: 'polite' | 'assertive';
  className?: string;
}

const AccessibilityAnnouncer: React.FC<AccessibilityAnnouncerProps> = ({
  message,
  priority = 'polite',
  className = '',
}) => {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && announcerRef.current) {
      // Force a re-render to ensure the message is announced
      announcerRef.current.textContent = '';
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = message;
        }
      }, 10);
    }
  }, [message]);

  return (
    <div
      ref={announcerRef}
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
      role="status"
      aria-label="Chart announcements"
    />
  );
};

export default AccessibilityAnnouncer;







