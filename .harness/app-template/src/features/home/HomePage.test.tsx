import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAccessibilityViolations } from '@/test/accessibility';
import { renderRoute } from '@/test/render';

const productName = __PROJECT_NAME_JS__;

describe('HomePage', () => {
  it('shows the product name as the main heading', async () => {
    const { container } = renderRoute('/');

    expect(await screen.findByRole('heading', { level: 1, name: productName })).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });
});
