# Homepage ADMIN/MANAGER — app-community#1056

Soft appearance is opt-in for HomePage only. Existing menu routes/parameters, permissions, stores and translations are preserved. App-provided homepage colors and components are used only in this appearance. Default consumers retain their current behavior.

Source: https://github.com/ControleOnline/app-community/issues/1056
Local evidence: 40 homepage tests and 34 runtime footer/zoom tests passed. No production authorization.

Published npm 1.0.17 source reconciled before applying homepage delta; its registry content differs from the Git tag. Preserved files: src/react/components/CompanyFilter.js, src/react/components/CompanyFilter.styles.js, src/react/utils/companyInitials.js, src/tests/react/utils/companyInitials.test.js, src/tests/browser/admin/home.spec.js, src/react/router/routes.js
Registry integrity: sha512-OSHBf0u5rEDAdCwiSJrhfehMuD3jNc63doJsyXc2uCRwrhe0TS/KsNK+YfK1+04lEJCagDGW1wR5vL4tntP3Rg==
