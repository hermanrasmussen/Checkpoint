from __future__ import annotations


def is_valid_half_star_rating(value: float) -> bool:
    if value < 0.5 or value > 5.0:
        return False
    doubled = value * 2
    return abs(doubled - round(doubled)) < 1e-9

