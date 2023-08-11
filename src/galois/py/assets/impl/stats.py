from dataclasses import dataclass
from time import time_ns


@dataclass
class Counter:
    count: int = 0
    total: float = 0


class TimerMap:
    def __init__(self):
        self.stats = {}

    def bump(self, key: str, duration: float):
        counter = self.stats.setdefault(key, Counter())
        counter.count += 1
        counter.total += duration

    def __str__(self):
        return get_timer_log(self)


class Timer:
    def __init__(self, name: str, out: TimerMap):
        self.logger = lambda duration: out.bump(name, duration)
        self.start = time_ns()

    def __enter__(self):
        pass

    def __exit__(self, type, value, traceback):
        self.logger(time_ns() - self.start)


TIMER_LOG = f"""
Timer Info:
    {'Name' : <50}{'Total (ms)' : >10}{'Avg (ms)' : >10}{'Count' : >10}
"""


def pretty_name(key):
    tokens = key.split("_")
    name = f"{tokens[0]}({', '.join(tokens[1:])})"
    return name if len(name) <= 50 else f"{name[:47]}..."


def get_timer_log(timers: TimerMap):
    records = []
    for key, cnt in sorted(timers.stats.items(), key=lambda kv: -kv[1].total):
        name = pretty_name(key)
        sum = int(cnt.total / 1e6)
        avg = int(cnt.total / cnt.count / 1e6)
        cnt = cnt.count
        records.append(f"  {name : <50}{sum : >10}{avg : >10}{cnt: >10}")
    return "\n".join(
        [
            "Timer Info:",
            f"  {'Name' : <50}{'Total (ms)' : >10}{'Avg (ms)' : >10}{'Count' : >10}",
            *records,
        ]
    )
