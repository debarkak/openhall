import Link from "next/link";
import type { ReactNode } from "react";
import { AuthStatusButton } from "@/components/auth/AuthStatusButton";

type PortalUser = {
  email: string;
  name: string;
  role: string;
};

interface PortalHeaderProps {
  section: string;
  user?: PortalUser | null;
  showAuth?: boolean;
  children?: ReactNode;
}

export function PortalHeader({ section, user, showAuth = true, children }: PortalHeaderProps) {
  return (
    <header className="portal-header">
      <div className="portal-header__inner">
        <Link href="/" className="portal-brand" aria-label="openhall home">
          <span className="portal-brand__mark" aria-hidden="true">o</span>
          <span>
            <span className="portal-brand__name">open<span>hall</span></span>
            <span className="portal-brand__subline">self-hosted exam desk</span>
          </span>
        </Link>

        <span className="portal-context">{section}</span>
        <span className="portal-header__spacer" />

        <div className="portal-header__actions">
          {children}
          {user && (
            <span className="portal-user">
              <span className="truncate">{user.name.toLowerCase()}</span>
              <small>{user.role.toLowerCase()}</small>
            </span>
          )}
          {showAuth && <AuthStatusButton user={user} />}
        </div>
      </div>
    </header>
  );
}
