import React from 'react';

// Generic mock component for JavaScript files
const MockComponent = (props) => {
  return React.createElement('div', {
    'data-testid': 'mock-component',
    ...props
  }, 'Mock Component');
};

export default MockComponent;