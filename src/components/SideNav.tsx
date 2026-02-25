import SideNavigation from "@cloudscape-design/components/side-navigation";
import { useRouterState, useNavigate } from "@tanstack/react-router";

export function SideNav() {
  const location = useRouterState({ select: (s) => s.location });
  const navigate = useNavigate();

  return (
    <SideNavigation
      header={{ text: "Mimid", href: "/" }}
      activeHref={location.pathname}
      items={[
        { type: "link", text: "Mock Interview", href: "/" },
        { type: "link", text: "History", href: "/history" },
        { type: "divider" },
        { type: "link", text: "API Key", href: "/api-key" },
      ]}
      onFollow={(event) => {
        event.preventDefault();
        navigate({ to: event.detail.href });
      }}
    />
  );
}
