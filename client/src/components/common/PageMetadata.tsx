import { useEffect } from "react";

interface PageMetadataProps {
  title: string;
  description: string;
  robots?: string;
}

function PageMetadata({
  title,
  description,
  robots = "noindex, nofollow",
}: PageMetadataProps) {
  useEffect(() => {
    document.title = title;

    const updateMeta = (
      name: string,
      content: string,
      attribute: "name" | "property" = "name"
    ) => {
      let element = document.head.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${name}"]`
      );

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.content = content;
    };

    updateMeta("description", description);
    updateMeta("robots", robots);
    updateMeta("og:title", title, "property");
    updateMeta("og:description", description, "property");
    updateMeta("og:type", "website", "property");
    updateMeta("og:site_name", "Mind Vault", "property");

    return () => {
      // The next page's metadata component will set its own metadata.
    };
  }, [title, description, robots]);

  return null;
}

export default PageMetadata;