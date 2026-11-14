"""浏览器里的海龟。

不导入 tkinter，也不调用官方 turtle。
每次落笔走一段，就把一条线段记进列表；跑完后由运行器打印成
__CANVAS_DATA__: [{action, x1, y1, x2, y2, color, pensize}, ...]
"""

import json
import math

__mini_turtle__ = True

_COMMANDS = []


class Screen:
    def bgcolor(self, *_args):
        return None

    def exitonclick(self):
        return None

    def setup(self, *_args):
        return None


class Turtle:
    def __init__(self):
        self.x = 0.0
        self.y = 0.0
        # 0 度朝东，逆时针为正。right() 让角度变小。
        self.heading = 0.0
        # 颜色名 brand。画布按设计 token 画成主色，色值不写在这里。
        self._color = "brand"
        self._pensize = 1
        self._down = True
        self.screen = Screen()

    def _line_to(self, x2, y2):
        if self._down and (x2 != self.x or y2 != self.y):
            _COMMANDS.append(
                {
                    "action": "line",
                    "x1": self.x,
                    "y1": self.y,
                    "x2": x2,
                    "y2": y2,
                    "color": self._color,
                    "pensize": self._pensize,
                }
            )
        self.x = x2
        self.y = y2

    def forward(self, distance):
        distance = float(distance)
        rad = math.radians(self.heading)
        self._line_to(self.x + distance * math.cos(rad), self.y + distance * math.sin(rad))

    fd = forward

    def backward(self, distance):
        self.forward(-float(distance))

    bk = backward
    back = backward

    def right(self, angle):
        self.heading -= float(angle)

    rt = right

    def left(self, angle):
        self.heading += float(angle)

    lt = left

    def color(self, c, *_args):
        self._color = str(c)

    def pencolor(self, c):
        self._color = str(c)

    def pensize(self, size):
        self._pensize = float(size)

    width = pensize

    def penup(self):
        self._down = False

    pu = penup
    up = penup

    def pendown(self):
        self._down = True

    pd = pendown
    down = pendown

    def done(self):
        return None

    def speed(self, *_args):
        return None

    def hideturtle(self):
        return None

    ht = hideturtle

    def showturtle(self):
        return None

    st = showturtle


def reset_state():
    _COMMANDS.clear()


def copy_commands():
    return [dict(item) for item in _COMMANDS]


def pose_of(turtle):
    try:
        return {"x": float(turtle.x), "y": float(turtle.y), "heading": float(turtle.heading)}
    except Exception:
        return {"x": 0.0, "y": 0.0, "heading": 0.0}


def emit_canvas():
    if not _COMMANDS:
        return
    print("__CANVAS_DATA__:" + json.dumps(_COMMANDS, separators=(",", ":")))
