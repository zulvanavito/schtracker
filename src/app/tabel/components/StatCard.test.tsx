import React from 'react';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard Component', () => {
  it('renders correctly with given props', () => {
    const props = {
      icon: <span data-testid="test-icon">icon</span>,
      label: 'Test Label',
      value: '100',
      color: 'bg-blue-500',
      delay: 'delay-100',
    };

    render(<StatCard {...props} />);

    // Check if label and value are rendered
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();

    // Check if icon is rendered
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});
