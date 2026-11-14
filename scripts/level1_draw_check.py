"""用 mini_turtle 跑 Level 1 课文，确认画得出线，且 C 回合参数会改画面。"""
import json
import sys

sys.path.insert(0, r"e:\MatuOne\src\lib\pyodide")
import mini_turtle as turtle


def run(code):
    turtle.reset_state()
    namespace = {"__name__": "__main__", "turtle": turtle, "t": turtle.Turtle()}
    exec(compile(code, "<exec>", "exec"), namespace)
    return turtle.copy_commands()


def main():
    payload = json.load(sys.stdin)
    failures = []
    for item in payload:
        order = item["order"]
        try:
            base = run(item["code"])
            variant = run(item["variant"])
        except Exception as exc:
            failures.append(f"L{order}: 运行失败 {exc}")
            continue
        if not base:
            failures.append(f"L{order}: 正文没有画出线")
            continue
        if base == variant:
            failures.append(f"L{order}: 改参数后画面没变")
    if failures:
        print("\n".join(failures))
        return 1
    print(f"draw-ok {len(payload)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
