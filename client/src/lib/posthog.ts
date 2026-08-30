import posthog from "posthog-js";

const projectToken = (import.meta as any).env?.VITE_POSTHOG_KEY as string | undefined;
const host = (import.meta as any).env?.VITE_POSTHOG_HOST as string | undefined;

if (!projectToken || !host) {
  if ((import.meta as any).env?.DEV) {
    const missingVariable = !projectToken
      ? "VITE_POSTHOG_KEY"
      : "VITE_POSTHOG_HOST";
    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: (import.meta as any).env?.DEV,
  });
}

export default posthog;
