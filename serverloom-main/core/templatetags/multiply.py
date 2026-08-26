from django import template
register = template.Library()

@register.filter
def multiply(a, b):
    try:
        return int(a) * int(b)
    except:
        return 0


@register.filter
def div(a, b):
    try:
        return float(a) / float(b)
    except:
        return 0

@register.filter
def mul(a, b):
    try:
        return float(a) * float(b)
    except:
        return 0

# core/templatetags/multiply.py
from django import template

register = template.Library()

@register.filter
def multiply(a, b):
    """Legacy name used in templates: multiply"""
    try:
        return int(a) * int(b)
    except Exception:
        try:
            return float(a) * float(b)
        except Exception:
            return 0

# alias: mul for readability in templates
@register.filter
def mul(a, b):
    try:
        return float(a) * float(b)
    except Exception:
        return 0.0

@register.filter
def div(a, b):
    try:
        a_f = float(a)
        b_f = float(b)
        return a_f / b_f if b_f != 0 else 0.0
    except Exception:
        return 0.0

@register.filter
def sub(a, b):
    try:
        return float(a) - float(b)
    except Exception:
        return 0.0

# convenience: percentage of a/b * 100
@register.filter
def pct(a, b):
    """Return (a / b) * 100 (0..100)."""
    try:
        a_f = float(a)
        b_f = float(b)
        return (a_f / b_f) * 100.0 if b_f != 0 else 0.0
    except Exception:
        return 0.0
