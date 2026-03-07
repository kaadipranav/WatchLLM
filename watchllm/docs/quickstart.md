# WatchLLM CI/CD Quickstart

This guide shows how to wire WatchLLM into a GitHub Actions workflow so that unsafe agents break the build automatically.

## 1. Install WatchLLM in your repo

From the root of your project (where `pyproject.toml` or `setup.py` lives):

```bash
pip install -e .
```

## 2. Wrap your agent with the WatchLLM SDK

```python
from watchllm import chaos


@chaos(key="sk_proj_xxx")
def my_agent(input: str) -> str:
    # your agent logic here
    return "ok"
```

## 3. Add WatchLLM to GitHub Actions

Create `.github/workflows/watchllm.yml` in your repository:

```yaml
name: WatchLLM Chaos Tests

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  chaos-tests:
    runs-on: ubuntu-latest
    env:
      GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.10"

      - name: Install WatchLLM
        run: pip install -e .

      - name: Run WatchLLM chaos tests
        run: watchllm test my_agent.py --fail-on "severity>=4"
```

The `watchllm test` command will exit with a non-zero status code if the observed severity is greater than or equal to 4, causing the GitHub Actions job to fail and protecting your main branch from unsafe agents.

