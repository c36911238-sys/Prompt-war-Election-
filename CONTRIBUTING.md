# Contributing to Election Process Assistant

Thank you for your interest in contributing to the Election Process Assistant! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- npm 10.0.0 or higher
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/Prompt-war-Election-.git
   cd Prompt-war-Election-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

### Code Quality Standards

We maintain high code quality through automated tools and manual review:

- **ESLint**: Enforces code style and catches potential issues
- **Prettier**: Ensures consistent code formatting
- **Jest**: Provides comprehensive testing coverage
- **TypeScript**: Enables type checking (via JSDoc)

### Before Submitting Changes

Run the quality check suite:

```bash
npm run quality
```

This runs:
- `npm run lint:check` - ESLint validation
- `npm run format:check` - Prettier formatting check
- `npm run test:coverage` - Test suite with coverage

### Fixing Issues

Auto-fix common issues:

```bash
npm run lint        # Fix ESLint issues
npm run format      # Fix Prettier formatting
```

## 🧪 Testing

### Running Tests

```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Writing Tests

- Place test files in `__tests__/` directory
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for >70% code coverage

Example test structure:
```javascript
describe('ComponentName', () => {
  it('should render correctly with default props', () => {
    // Arrange
    const props = { /* test props */ };
    
    // Act
    render(<ComponentName {...props} />);
    
    // Assert
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## 🎨 Code Style Guidelines

### JavaScript/React

- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable and function names
- Keep functions small and focused
- Use JSDoc comments for complex functions
- Follow React best practices (memo, useCallback, useMemo)

### File Organization

```
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.js       # Root layout
│   └── page.js         # Home page
├── components/         # Reusable React components
├── contexts/          # React contexts
├── lib/               # Utility libraries
├── __tests__/         # Test files
└── public/            # Static assets
```

### Naming Conventions

- **Files**: kebab-case (`auth-button.js`)
- **Components**: PascalCase (`AuthButton`)
- **Functions**: camelCase (`handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **CSS Classes**: kebab-case (`btn-primary`)

## 🔒 Security Guidelines

### Input Validation

- Always validate and sanitize user input
- Use the validation utilities in `lib/validation.js`
- Never trust client-side data

### Environment Variables

- Never commit sensitive data to version control
- Use `.env.local` for local development
- Prefix public variables with `NEXT_PUBLIC_`

### Dependencies

- Regularly audit dependencies: `npm audit`
- Keep dependencies updated
- Avoid packages with known vulnerabilities

## 🚀 Performance Best Practices

### React Optimization

- Use `React.memo` for expensive components
- Implement `useCallback` and `useMemo` appropriately
- Avoid inline objects and functions in JSX
- Use dynamic imports for code splitting

### Next.js Optimization

- Optimize images with `next/image`
- Use proper caching headers
- Implement proper SEO meta tags
- Minimize bundle size

## 📝 Commit Guidelines

### Commit Message Format

Use conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add Google OAuth integration
fix(chat): resolve message sanitization issue
docs(readme): update installation instructions
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

## 🔄 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Run quality checks**
   ```bash
   npm run quality
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use a descriptive title
   - Fill out the PR template
   - Link related issues
   - Request review from maintainers

### PR Requirements

- [ ] All tests pass
- [ ] Code coverage maintained (>70%)
- [ ] ESLint and Prettier checks pass
- [ ] Documentation updated (if applicable)
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered

## 🐛 Bug Reports

When reporting bugs, please include:

- **Environment**: OS, Node.js version, browser
- **Steps to reproduce**: Clear, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable
- **Console errors**: Any error messages

## 💡 Feature Requests

For feature requests, please provide:

- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives**: Other solutions considered
- **Additional context**: Screenshots, mockups, etc.

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Documentation**: Check README and inline comments

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributor graphs

Thank you for contributing to making election information more accessible! 🗳️