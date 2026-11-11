import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

const mocks = vi.hoisted(() => ({
  me: {
    role: "moderator",
    permissions: ["view:analytics", "read:users", "read:content"],
  },
}));

vi.mock("@workspace/api-client-react", () => ({
  useIdentityGetMe: () => ({ data: mocks.me }),
}));
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => ({
      "nav.dashboard": "Dashboard",
      "nav.analytics": "Analytics",
      "nav.users": "Users",
      "nav.contentLibrary": "Content library",
      "nav.overview": "Overview",
      "nav.audience": "Audience",
      "nav.settings": "Settings",
      "app.adminPanel": "Admin panel",
      "app.version": "Version",
    })[key] ?? key,
  }),
}));
vi.mock("@/components/ui/sidebar", () => {
  const Group = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Sidebar: Group,
    SidebarContent: Group,
    SidebarFooter: Group,
    SidebarHeader: Group,
    SidebarMenu: Group,
    SidebarMenuItem: Group,
    SidebarMenuButton: Group,
    SidebarGroup: Group,
    SidebarGroupContent: Group,
    SidebarGroupLabel: Group,
    SidebarSeparator: () => null,
  };
});

describe("AppSidebar role visibility", () => {
  beforeEach(() => {
    mocks.me = {
      role: "moderator",
      permissions: ["view:analytics", "read:users", "read:content"],
    };
  });

  it("hides analytics and user management from moderators even when stale permissions include them", () => {
    render(<AppSidebar />);

    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows analytics and users to admins with the corresponding permissions", () => {
    mocks.me = {
      role: "admin",
      permissions: ["view:analytics", "read:users", "read:content"],
    };
    render(<AppSidebar />);

    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("hides a menu item when its permission is absent", () => {
    mocks.me = { role: "admin", permissions: ["read:users"] };
    render(<AppSidebar />);

    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });
});
