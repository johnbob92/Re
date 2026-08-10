import axios from "axios";

const CALENDLY_API = "https://api.calendly.com";
const DEMO_SCHEDULING_URL = "https://calendly.com/hireflow-demo";

export function normalizeCalendlyUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://calendly.com/${url.replace(/^\/+/, "")}`;
}

export function isDemoCalendlyUrl(url?: string) {
  const normalized = normalizeCalendlyUrl(url);
  return (
    !normalized ||
    normalized.includes("hireflow-demo") ||
    normalized.includes("calendly.com/demo")
  );
}

export async function getCalendlyUser() {
  if (!process.env.CALENDLY_TOKEN) {
    return {
      demo: true as const,
      uri: "https://api.calendly.com/users/demo",
      schedulingUrl: DEMO_SCHEDULING_URL,
      name: "HireFlow Demo",
    };
  }

  const { data } = await axios.get(`${CALENDLY_API}/users/me`, {
    headers: { Authorization: `Bearer ${process.env.CALENDLY_TOKEN}` },
  });

  return {
    demo: false as const,
    uri: data.resource.uri as string,
    schedulingUrl: data.resource.scheduling_url as string,
    name: data.resource.name as string,
  };
}

/** Build an embeddable Calendly URL; returns empty string for known-broken demo URLs. */
export function calendlyEmbedUrl(schedulingUrl: string) {
  const normalized = normalizeCalendlyUrl(schedulingUrl);
  if (!normalized || isDemoCalendlyUrl(normalized)) return "";

  try {
    const url = new URL(normalized);
    url.searchParams.set("hide_gdpr_banner", "1");
    url.searchParams.set("background_color", "ffffff");
    url.searchParams.set("text_color", "0f172a");
    url.searchParams.set("primary_color", "2563eb");
    return url.toString();
  } catch {
    return normalized;
  }
}

export { DEMO_SCHEDULING_URL };
