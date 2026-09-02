import type { ComponentType } from "react";

import copyButton from "./copy-button";
import footnotes from "./footnotes";
import pagefindUi from "./pagefind-ui";
import readingProgress from "./reading-progress";
import relatedPosts from "./related-posts";
import seriesBadge from "./series-badge";
import seriesNavigator from "./series-navigator";
import shareBar from "./share-bar";
import statusCallout from "./status-callout";
import tableOfContents from "./table-of-contents";

export type RegistryEntry =
  { kind: "component"; component: ComponentType } | { kind: "html"; html: string };

export const registry: Record<string, RegistryEntry> = {
  "series-badge": seriesBadge,
  "series-navigator": seriesNavigator,
  "related-posts": relatedPosts,
  "share-bar": shareBar,
  "reading-progress": readingProgress,
  "table-of-contents": tableOfContents,
  "status-callout": statusCallout,
  "copy-button": copyButton,
  footnotes: footnotes,
  "pagefind-ui": pagefindUi,
};
