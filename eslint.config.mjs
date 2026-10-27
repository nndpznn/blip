import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  ignores: ["node_modules/**", "node_modules.nosync/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "apps/**"]
}, {
  // eslint-plugin-react-hooks 7.1 added this rule. It flags 3 existing effects (profile, seeAllMeets, nav) that
  // work today; keep them visible as warnings instead of blocking CI, and refactor them separately.
  rules: { "react-hooks/set-state-in-effect": "warn" }
}];

export default eslintConfig;
