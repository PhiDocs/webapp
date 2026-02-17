import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is effectively disabled to prevent routing conflicts.
  // The styling has been moved directly into the page components that need it.
  return <>{children}</>;
}
