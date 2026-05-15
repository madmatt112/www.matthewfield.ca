const baseUrl = process.env.LHCI_PREVIEW_URL || "http://localhost:3013";

module.exports = {
  ci: {
    collect: {
      url: [`${baseUrl}/profile`, `${baseUrl}/contact`],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
      githubStatusContextSuffix: "/profile-contact",
    },
  },
};
