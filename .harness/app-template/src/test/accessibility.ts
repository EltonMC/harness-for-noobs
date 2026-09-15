import axe from 'axe-core';
import { expect } from 'vitest';

// jsdom has no layout, so contrast is checked in the browser (e2e) instead.
const jsdomUnsupportedRules = { 'color-contrast': { enabled: false } };

export async function expectNoAccessibilityViolations(container: Element) {
  const results = await axe.run(container, { rules: jsdomUnsupportedRules });
  const violations = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
  );
  expect(violations).toEqual([]);
}
