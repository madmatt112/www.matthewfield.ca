import { contributions } from "#site/content";
import { formatContentDate } from "@/lib/format-date";

export type Contribution = (typeof contributions)[number];
export type ContributionLink = Contribution["links"][number];

// Single sort key for the contributions list. Date ISO strings sort
// lexicographically thanks to `s.isodate()`; repo then title are the
// deterministic tiebreaks (Req 2.1). No draft flag exists on contributions,
// so there is no filtering — every authored entry is published.
export function byDateDescRepoAscTitleAsc(a: Contribution, b: Contribution): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.repo !== b.repo) return a.repo < b.repo ? -1 : 1;
  return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
}

export function getAllContributions(): readonly Contribution[] {
  return [...contributions].sort(byDateDescRepoAscTitleAsc);
}

export const formatContributionDate = formatContentDate;

// Single source of truth for the /contributions page meta description
// (Req 2.8). The page (Task 17) imports this; do NOT re-declare it elsewhere.
export const CONTRIBUTIONS_DESCRIPTION =
  "Open-source contributions by Matthew Field: pull requests, commits, issues, and releases across DevOps and platform-engineering projects.";
