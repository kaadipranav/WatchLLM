from watchllm import chaos


@chaos(key="sk_proj_dummy")
def my_agent(input: str) -> str:
    return f"Echo from agent: {input}"


if __name__ == "__main__":
    result = my_agent("hello world")
    print(result)

