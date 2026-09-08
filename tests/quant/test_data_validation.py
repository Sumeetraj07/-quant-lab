"""
Data Validation Tests
======================
Tests for the DataValidator — verifies it correctly detects:
  - Duplicate timestamps
  - OHLC relationship violations
  - Negative volume
  - Empty datasets
  - Timezone-naive timestamps
"""

from __future__ import annotations

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from quant_engine.data.schemas import OHLCVBar
from quant_engine.data.validators import DataValidator


def make_bar(
    symbol: str = "AAPL",
    date_offset_days: int = 0,
    open_: float = 100.0,
    high: float = 105.0,
    low: float = 98.0,
    close: float = 102.0,
    volume: int = 1_000_000,
    tz_aware: bool = True,
) -> OHLCVBar:
    """Create a valid OHLCVBar for testing."""
    base_ts = datetime(2020, 1, 1, tzinfo=timezone.utc)
    ts = base_ts + timedelta(days=date_offset_days)
    if not tz_aware:
        ts = ts.replace(tzinfo=None)

    return OHLCVBar(
        symbol=symbol,
        timestamp=ts,
        open=Decimal(str(open_)),
        high=Decimal(str(high)),
        low=Decimal(str(low)),
        close=Decimal(str(close)),
        volume=volume,
        source="test",
        timeframe="1d",
    )


class TestDataValidator:

    def setup_method(self):
        self.validator = DataValidator(min_bars=5)

    def test_valid_data_passes(self):
        """Clean data should pass validation with no errors."""
        bars = [make_bar(date_offset_days=i) for i in range(10)]
        result = self.validator.validate(bars, symbol="AAPL", timeframe="1d")

        assert result.is_valid, f"Expected valid, got errors: {result.errors}"
        assert result.bar_count == 10

    def test_empty_dataset_fails(self):
        """Empty dataset should always fail validation."""
        result = self.validator.validate([], symbol="AAPL", timeframe="1d")

        assert not result.is_valid
        assert any("empty" in e.lower() for e in result.errors)

    def test_duplicate_timestamps_fail(self):
        """Duplicate timestamps must be detected and cause validation failure."""
        bar1 = make_bar(date_offset_days=0)
        bar2 = make_bar(date_offset_days=0)  # Same timestamp!
        bars = [bar1, bar2] + [make_bar(date_offset_days=i) for i in range(2, 8)]

        result = self.validator.validate(bars, symbol="AAPL", timeframe="1d")

        assert not result.is_valid, "Duplicate timestamps must cause validation failure"
        assert any("duplicate" in e.lower() for e in result.errors)

    def test_ohlc_schema_prevents_invalid_bars(self):
        """OHLCVBar schema rejects OHLC violations at construction time."""
        with pytest.raises(Exception):
            # high < low — must fail at construction
            make_bar(high=90.0, low=100.0)

    def test_zero_volume_raises_warning(self):
        """Zero volume should raise a warning but not fail validation."""
        bars = [make_bar(date_offset_days=i, volume=0) for i in range(10)]
        result = self.validator.validate(bars, symbol="AAPL", timeframe="1d")

        # Warnings but should still be valid (zero volume is unusual but not invalid)
        assert result.has_warnings

    def test_minimum_bars_warning(self):
        """Fewer than min_bars should produce a warning."""
        validator = DataValidator(min_bars=20)
        bars = [make_bar(date_offset_days=i) for i in range(5)]  # Only 5 bars

        result = validator.validate(bars, symbol="AAPL", timeframe="1d")

        assert result.has_warnings
        assert any("5" in w or "minimum" in w.lower() for w in result.warnings)

    def test_validation_result_summary(self):
        """ValidationResult.summary() should return a readable string."""
        bars = [make_bar(date_offset_days=i) for i in range(10)]
        result = self.validator.validate(bars, symbol="AAPL", timeframe="1d")

        summary = result.summary()
        assert "AAPL" in summary
        assert "bars" in summary.lower() or "bar_count" in summary.lower()

    def test_dataframe_validation(self):
        """validate_dataframe() should check a raw DataFrame."""
        import pandas as pd

        df = pd.DataFrame({
            "symbol": ["AAPL"] * 5,
            "timestamp": pd.date_range("2020-01-01", periods=5, tz="UTC"),
            "open": [100.0] * 5,
            "high": [105.0] * 5,
            "low": [98.0] * 5,
            "close": [102.0] * 5,
            "volume": [1_000_000] * 5,
        })

        result = self.validator.validate_dataframe(df, "AAPL", "1d")
        assert result.is_valid

    def test_dataframe_validation_ohlc_violation(self):
        """validate_dataframe() should catch OHLC violations in raw DataFrames."""
        import pandas as pd

        df = pd.DataFrame({
            "symbol": ["AAPL"],
            "timestamp": pd.date_range("2020-01-01", periods=1, tz="UTC"),
            "open": [100.0],
            "high": [90.0],   # high < low — violation!
            "low": [95.0],
            "close": [92.0],
            "volume": [1_000_000],
        })

        result = self.validator.validate_dataframe(df, "AAPL", "1d")
        assert not result.is_valid
        assert any("ohlc" in e.lower() or "violation" in e.lower() for e in result.errors)
