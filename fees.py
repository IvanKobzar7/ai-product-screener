from dataclasses import dataclass
from enum import Enum


class Marketplace(str, Enum):
    AMAZON = "amazon"
    WALMART = "walmart"
    EBAY = "ebay"
    ETSY = "etsy"
    TIKTOK_SHOP = "tiktok_shop"


@dataclass(frozen=True)
class FeeSchedule:
    percent: float          # Commission as % of the sale price
    fixed_per_order: float  # Flat fee per order in USD
    minimum: float = 0.0    # Minimum percentage-based fee per unit in USD
    note: str = ""


# Standard US rates for "most categories" (verified September 2026).
# Category-specific and tiered rates are not modeled yet.
MARKETPLACE_FEES: dict[Marketplace, FeeSchedule] = {
    Marketplace.AMAZON: FeeSchedule(
        15.0, 0.0, minimum=0.30,
        note="Referral fee, most categories. $0.30 minimum per unit.",
    ),
    Marketplace.WALMART: FeeSchedule(
        15.0, 0.0,
        note="Referral fee, most categories.",
    ),
    Marketplace.EBAY: FeeSchedule(
        13.6, 0.40,
        note="Final value fee + $0.40 per order ($0.30 if order is $10 or less).",
    ),
    Marketplace.ETSY: FeeSchedule(
        9.5, 0.45,
        note="6.5% transaction + 3% processing, plus $0.25 processing + $0.20 listing.",
    ),
    Marketplace.TIKTOK_SHOP: FeeSchedule(
        8.0, 0.0,
        note="Referral fee, most non-food categories (raised from 6% in Aug 2026).",
    ),
}


def calculate_marketplace_fee(
    marketplace: Marketplace,
    sale_price: float,
    percent_override: float | None = None,
) -> float:
    """Return the total marketplace fee for one unit sold."""
    schedule = MARKETPLACE_FEES[marketplace]
    percent = percent_override if percent_override is not None else schedule.percent

    fixed_fee = schedule.fixed_per_order
    if marketplace == Marketplace.EBAY and sale_price <= 10:
        fixed_fee = 0.30

    percentage_fee = max(sale_price * percent / 100, schedule.minimum)
    return percentage_fee + fixed_fee