"""CONTRACT 1 (ingestion) tests: good LAT rows validate; bad rows are rejected with a reason; a long-window
activation time is flagged but accepted."""
from cardiopinnlab.io.contract import validate_rows


def test_good_rows_accepted():
    rep = validate_rows([{"x_mm": "10", "y_mm": "12", "z_mm": "0", "t_ms": "35"}])
    assert rep.ok and len(rep.accepted) == 1 and not rep.rejected


def test_bad_rows_rejected_not_coerced():
    rows = [
        {"x_mm": "nan", "y_mm": "1", "z_mm": "0", "t_ms": "10"},       # NaN
        {"x_mm": "1", "y_mm": "1", "z_mm": "0", "t_ms": "-5"},          # negative time (out of range)
        {"x_mm": "1", "y_mm": "1", "z_mm": "0", "t_ms": "99999"},       # time out of range
        {"x_mm": "1", "y_mm": "1", "z_mm": "0"},                        # missing t_ms
        {"x_mm": "left", "y_mm": "1", "z_mm": "0", "t_ms": "10"},       # non-numeric
    ]
    rep = validate_rows(rows)
    assert len(rep.accepted) == 0
    assert len(rep.rejected) == len(rows)
    assert all("reason" in r for r in rep.rejected)


def test_long_window_flagged_but_accepted():
    rep = validate_rows([{"x_mm": "5", "y_mm": "5", "z_mm": "0", "t_ms": "450"}])  # > 400 ms window
    assert rep.ok and rep.flagged and "t_ms" in rep.flagged[0]["flag"]
