# Setup Embedded Windows Python Action

[![GitHub Super-Linter](https://github.com/lizalc/setup-embedded-windows-python/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/lizalc/setup-embedded-windows-python/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/lizalc/setup-embedded-windows-python/actions/workflows/check-dist.yml/badge.svg)](https://github.com/lizalc/setup-embedded-windows-python/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/lizalc/setup-embedded-windows-python/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/lizalc/setup-embedded-windows-python/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

Sets up the embedded version of Python on Windows runners in GitHub Actions.

## Usage

See [action.yml](action.yml)

```yaml
- uses: lizalc/setup-embedded-windows-python@v1
  with:
    # Python version to use
    version: '3.11.4'
```
