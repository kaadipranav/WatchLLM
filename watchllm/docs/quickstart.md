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
name: WatchLLM Reliability Tests

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  reliability-tests:
    runs-on: ubuntu-latest
    env:
      WATCHLLM_API_KEY: ${{ secrets.WATCHLLM_API_KEY }}
      WATCHLLM_SDK_KEY: ${{ secrets.WATCHLLM_SDK_KEY }}
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

      - name: Run WatchLLM reliability tests
        run: watchllm test my_agent.py --fail-on "severity>=4"
```

The `watchllm test` command will exit with a non-zero status code if the observed severity is greater than or equal to 4, causing the GitHub Actions job to fail and protecting your main branch from unsafe agents.

Key mapping:
- `WATCHLLM_API_KEY`: Your tenant-scoped WatchLLM API key (`wlk_live_...`) from dashboard settings.
- `WATCHLLM_SDK_KEY`: Your project key (`sk_proj_...`) used by the SDK and simulation routing.

Note: the CLI calls the WatchLLM API. It does not call Groq/Anthropic directly; those provider keys stay on the server-side worker environment.

