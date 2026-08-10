import axios from "axios";

const CALENDLY_API = "https://api.calendly.com";

export function normalizeCalendlyUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://calendly.com/${url.replace(/^\/+/, "")}`;
}

export async function getCalendlyUser() {
  if (!process.env.CALENDLY_TOKEN) {
    return {
      demo: true as const,
      uri: "https://api.calendly.com/users/demo",
      schedulingUrl: "https://calendly.com/hireflow-demo",
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

export function calendlyEmbedUrl(schedulingUrl: string) {
  const url = normalizeCalendlyUrl(schedulingUrl);
  return `${url}?hide_gdpr_banner=1&background_color=ffffff&text_color=0f172a&primary_color=2563eb`;
}
